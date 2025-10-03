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
  "You are the in-app AI coach for PulseForge, a workout tracking app. " +
  "Answer questions about the user's routine and general fitness questions. " +
  "Keep answers short and practical -- this is a mobile chat, not an essay. " +
  "The user's profile and current routine are given below as context; " +
  "ground your answers in it rather than generic advice when it's relevant.";

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
      }),
    });

    if (!response.ok) {
      return Response.json({ error: "The AI coach is unavailable right now." }, { status: 502 });
    }

    const data = await response.json();
    const steps: { type: string; content?: { type: string; text?: string }[] }[] = data.steps ?? [];
    const reply = [...steps].reverse().find((step) => step.type === "model_output")?.content?.[0]?.text;

    if (!reply) {
      return Response.json({ error: "The AI coach didn't return a response." }, { status: 502 });
    }

    return Response.json({ reply });
  }),
};

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/chat' \
    --header 'apiKey: sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH' \
    --data '{"messages":[{"role":"user","content":"How many sets on chest day?"}],"context":"..."}'

*/
