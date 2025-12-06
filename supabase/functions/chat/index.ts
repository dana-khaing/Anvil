// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment

// Setup type definitions for built-in Supabase Runtime APIs
import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";

// Gemini's old generateContent models were retired in favor of the
// Interactions API (GA 2026-06-22) -- see https://ai.google.dev/gemini-api/docs/interactions/text-generation.
const GEMINI_MODEL = "gemini-3.6-flash";

type ChatMessage = { role: "user" | "assistant"; content: string };

const SYSTEM_PROMPT =
  "You are the in-app AI coach for Anvil, a workout tracking app. " +
  "Answer questions about the user's routine and general fitness questions. " +
  "Keep answers short and practical -- this is a mobile chat, not an essay. " +
  "The user's profile, current routine (with each day's numeric id), and the " +
  "full exercise catalog are given below as context; ground your answers in " +
  "it rather than generic advice when it's relevant. " +
  "If the user explicitly asks you to create a training day, add exercises, " +
  "or change or remove an exercise or day, call the matching tool -- the app " +
  "shows the user a confirmation before anything is actually changed, so you " +
  "don't need to ask for confirmation yourself. Only ever propose an " +
  "exerciseName that exactly matches a name from the exercise catalog given " +
  "in context, and always target an existing day by its numeric day id and " +
  "an existing exercise by its numeric routine exercise id, never by label " +
  "or name.";

/** Mirrors app/src/stores/chat-actions.ts's AiAction -- this is a separate Deno runtime with no access to app code. */
type ProposedExercise = {
  exerciseName: string;
  targetWeightKg: number | null;
  targetRepsMin: number | null;
  targetRepsMax: number | null;
  targetSets: number;
};

type AiAction =
  | { kind: "create_day"; label: string; muscleGroups: string[]; exercises: ProposedExercise[] }
  | { kind: "add_exercises"; dayId: number; exercises: ProposedExercise[] }
  | {
      kind: "update_exercise";
      routineExerciseId: number;
      targetWeightKg?: number | null;
      targetRepsMin?: number | null;
      targetRepsMax?: number | null;
      targetSets?: number;
    }
  | { kind: "delete_exercise"; routineExerciseId: number }
  | { kind: "delete_day"; dayId: number };

const EXERCISE_ITEM_SCHEMA = {
  type: "object",
  properties: {
    exerciseName: {
      type: "string",
      description: "Must exactly match a name from the exercise catalog given in context.",
    },
    targetWeightKg: { type: "number", description: "Omit for a bodyweight exercise." },
    targetRepsMin: { type: "number" },
    targetRepsMax: { type: "number" },
    targetSets: { type: "number" },
  },
  required: ["exerciseName", "targetSets"],
};

// The 5 routine changes the coach may propose. Each maps 1:1 to an AiAction
// kind and, once the user confirms, an existing routines-store action --
// the model never writes anything itself, only proposes.
const TOOLS = [
  {
    type: "function",
    name: "create_day",
    description:
      "Create a new training day with one or more exercises in the user's active routine. Only call this when the user explicitly asks to add a new training day.",
    parameters: {
      type: "object",
      properties: {
        label: { type: "string", description: "Short day name, e.g. 'Push Day'." },
        muscleGroups: { type: "array", items: { type: "string" }, description: "Optional muscle-group tags." },
        exercises: { type: "array", items: EXERCISE_ITEM_SCHEMA },
      },
      required: ["label", "exercises"],
    },
  },
  {
    type: "function",
    name: "add_exercises",
    description:
      "Add one or more exercises to an existing training day. Only call this when the user explicitly asks to add exercises to a day already in their routine.",
    parameters: {
      type: "object",
      properties: {
        dayId: { type: "number", description: "The numeric day id given in context, never the label." },
        exercises: { type: "array", items: EXERCISE_ITEM_SCHEMA },
      },
      required: ["dayId", "exercises"],
    },
  },
  {
    type: "function",
    name: "update_exercise",
    description:
      "Change the target weight, reps, or sets of an exercise already in the routine. Only call when the user explicitly asks to change an exercise's targets.",
    parameters: {
      type: "object",
      properties: {
        routineExerciseId: { type: "number" },
        targetWeightKg: { type: "number" },
        targetRepsMin: { type: "number" },
        targetRepsMax: { type: "number" },
        targetSets: { type: "number" },
      },
      required: ["routineExerciseId"],
    },
  },
  {
    type: "function",
    name: "delete_exercise",
    description: "Remove an exercise from the routine. Only call when the user explicitly asks to remove it.",
    parameters: {
      type: "object",
      properties: { routineExerciseId: { type: "number" } },
      required: ["routineExerciseId"],
    },
  },
  {
    type: "function",
    name: "delete_day",
    description:
      "Delete an entire training day, including all its exercises. Only call when the user explicitly asks to delete a day.",
    parameters: {
      type: "object",
      properties: { dayId: { type: "number" } },
      required: ["dayId"],
    },
  },
];

function toProposedExercise(value: unknown): ProposedExercise | null {
  if (typeof value !== "object" || value === null) return null;
  const v = value as Record<string, unknown>;
  if (typeof v.exerciseName !== "string" || typeof v.targetSets !== "number") return null;
  const numOrNull = (x: unknown): number | null => (typeof x === "number" ? x : null);
  return {
    exerciseName: v.exerciseName,
    targetWeightKg: numOrNull(v.targetWeightKg),
    targetRepsMin: numOrNull(v.targetRepsMin),
    targetRepsMax: numOrNull(v.targetRepsMax),
    targetSets: v.targetSets,
  };
}

/** Validates and maps a Gemini function_call step's arguments onto AiAction. Fails closed to null on any shape mismatch. */
function mapFunctionCallToAction(name: string, args: unknown): AiAction | null {
  if (typeof args !== "object" || args === null) return null;
  const a = args as Record<string, unknown>;

  switch (name) {
    case "create_day": {
      if (typeof a.label !== "string" || !Array.isArray(a.exercises)) return null;
      const exercises = a.exercises.map(toProposedExercise);
      if (exercises.some((exercise) => exercise === null)) return null;
      const muscleGroups = Array.isArray(a.muscleGroups)
        ? a.muscleGroups.filter((group): group is string => typeof group === "string")
        : [];
      return { kind: "create_day", label: a.label, muscleGroups, exercises: exercises as ProposedExercise[] };
    }
    case "add_exercises": {
      if (typeof a.dayId !== "number" || !Array.isArray(a.exercises)) return null;
      const exercises = a.exercises.map(toProposedExercise);
      if (exercises.some((exercise) => exercise === null)) return null;
      return { kind: "add_exercises", dayId: a.dayId, exercises: exercises as ProposedExercise[] };
    }
    case "update_exercise": {
      if (typeof a.routineExerciseId !== "number") return null;
      return {
        kind: "update_exercise",
        routineExerciseId: a.routineExerciseId,
        ...(typeof a.targetWeightKg === "number" && { targetWeightKg: a.targetWeightKg }),
        ...(typeof a.targetRepsMin === "number" && { targetRepsMin: a.targetRepsMin }),
        ...(typeof a.targetRepsMax === "number" && { targetRepsMax: a.targetRepsMax }),
        ...(typeof a.targetSets === "number" && { targetSets: a.targetSets }),
      };
    }
    case "delete_exercise":
      return typeof a.routineExerciseId === "number"
        ? { kind: "delete_exercise", routineExerciseId: a.routineExerciseId }
        : null;
    case "delete_day":
      return typeof a.dayId === "number" ? { kind: "delete_day", dayId: a.dayId } : null;
    default:
      return null;
  }
}

// This endpoint is called directly by the mobile app with the publishable key.
export default {
  fetch: withSupabase({ auth: ["publishable"] }, async (req) => {
    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) {
      return Response.json({ error: "AI coach is not configured." }, { status: 500 });
    }

    const { messages, context } = (await req.json()) as { messages: ChatMessage[]; context: string };
    if (!Array.isArray(messages) || messages.length === 0) {
      return Response.json({ error: "messages is required" }, { status: 400 });
    }

    // Stateless multi-turn: the app owns the conversation history (local SQLite),
    // not Gemini's server-side interaction store, so every call replays it fresh
    // via `store: false` rather than threading a previous_interaction_id.
    const input = messages.map((message) => ({
      type: message.role === "assistant" ? "model_output" : "user_input",
      content: [{ type: "text", text: message.content }],
    }));

    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        model: GEMINI_MODEL,
        system_instruction: `${SYSTEM_PROMPT}\n\n${context}`,
        store: false,
        input,
        tools: TOOLS,
      }),
    });

    if (!response.ok) {
      return Response.json({ error: "The AI coach is unavailable right now." }, { status: 502 });
    }

    const data = await response.json();
    const steps: { type: string; content?: { type: string; text?: string }[]; name?: string; arguments?: unknown }[] =
      data.steps ?? [];

    const reply = [...steps].reverse().find((step) => step.type === "model_output")?.content?.[0]?.text ?? null;

    // No round-trip back to Gemini for the result -- execution happens only
    // after a separate user confirmation, and there's no natural point to
    // send a function_result synchronously anyway (see chat-actions.ts).
    const functionCall = steps.find((step) => step.type === "function_call");
    const action = functionCall ? mapFunctionCallToAction(functionCall.name ?? "", functionCall.arguments) : null;

    if (!reply && !action) {
      return Response.json({ error: "The AI coach didn't return a response." }, { status: 502 });
    }

    return Response.json({ reply, action });
  }),
};

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/chat' \
    --header 'apiKey: sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH' \
    --data '{"messages":[{"role":"user","content":"How many sets on chest day?"}],"context":"..."}'

*/
