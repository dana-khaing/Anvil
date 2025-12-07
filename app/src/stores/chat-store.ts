import { asc, eq } from 'drizzle-orm';
import { create } from 'zustand';

import { db } from '@/db/client';
import { chatMessages } from '@/db/schema';
import { supabase } from '@/db/supabase-client';
import { executeAction, type AiAction } from '@/stores/chat-actions';
import { useExerciseLibraryStore } from '@/stores/exercise-library-store';
import { type Profile } from '@/stores/profile-store';
import { type DayWithExercises, type Exercise, type Routine, useRoutinesStore } from '@/stores/routines-store';

export type ChatMessage = typeof chatMessages.$inferSelect;

/**
 * Plain-text summary of the user's profile and active routine, sent to the
 * Gemini Edge Function alongside the conversation so the coach can answer
 * questions about the user's actual plan rather than generic advice.
 */
export function buildRoutineContext(
  profile: Profile | null,
  activeRoutine: Routine | null,
  days: DayWithExercises[]
): string {
  const lines: string[] = [];

  lines.push(
    profile
      ? `User profile: goal=${profile.goal ?? 'not set'}, height=${profile.heightCm ?? 'unknown'}cm, weight=${profile.weightKg ?? 'unknown'}kg.`
      : 'User has not set up a profile yet.'
  );

  if (!activeRoutine || days.length === 0) {
    lines.push('User has no active routine yet.');
    return lines.join('\n');
  }

  lines.push(`Active routine: "${activeRoutine.name}" (${activeRoutine.splitType} split).`);
  for (const day of days) {
    const exerciseList = day.exercises
      .map((entry) => {
        const weight = entry.targetWeightKg ? `${entry.targetWeightKg}kg` : 'bodyweight';
        return `${entry.exercise.name} (routine exercise id ${entry.id}) (${weight}, ${entry.targetRepsMin ?? '?'}-${entry.targetRepsMax ?? '?'} reps, ${entry.targetSets} sets)`;
      })
      .join('; ');
    lines.push(`${day.label} (day id ${day.id}): ${exerciseList || 'no exercises yet'}`);
  }

  return lines.join('\n');
}

/**
 * Plain-text list of the exercise catalog, grouped by muscle group, sent
 * alongside buildRoutineContext so the coach has a closed vocabulary to
 * propose exercises from -- picking a name outside this list is what
 * resolveExerciseName (chat-actions.ts) will reject when the user confirms.
 */
export function buildExerciseCatalogContext(catalog: Exercise[]): string {
  if (catalog.length === 0) return 'Exercise catalog: unavailable.';

  const byGroup = new Map<string, string[]>();
  for (const exercise of catalog) {
    const group = byGroup.get(exercise.muscleGroup) ?? [];
    group.push(exercise.name);
    byGroup.set(exercise.muscleGroup, group);
  }

  const lines = ['Available exercises (use these exact names when proposing a routine change):'];
  for (const [group, names] of byGroup) {
    lines.push(`${group}: ${names.join(', ')}`);
  }
  return lines.join('\n');
}

/** Safely reads a chat message's actionPayload JSON, tolerating malformed or unrecognized data. */
export function parseActionPayload(raw: string | null): AiAction | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null || typeof parsed.kind !== 'string') return null;
    return parsed as AiAction;
  } catch {
    return null;
  }
}

type ChatState = {
  messages: ChatMessage[];
  loaded: boolean;
  sending: boolean;
  error: string | null;
  load: () => Promise<void>;
  send: (content: string, context: string) => Promise<void>;
  confirmAction: (messageId: number) => Promise<void>;
  declineAction: (messageId: number) => Promise<void>;
};

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  loaded: false,
  sending: false,
  error: null,

  load: async () => {
    const rows = await db.select().from(chatMessages).orderBy(asc(chatMessages.id));
    set({ messages: rows, loaded: true });
  },

  send: async (content, context) => {
    const trimmed = content.trim();
    if (!trimmed || get().sending) return;

    const [userMessage] = await db.insert(chatMessages).values({ role: 'user', content: trimmed }).returning();
    set({ messages: [...get().messages, userMessage], sending: true, error: null });

    const history = get().messages.map((message) => ({ role: message.role, content: message.content }));

    const { data, error } = await supabase.functions.invoke('chat', {
      body: { messages: history, context },
    });

    if (error || (!data?.reply && !data?.action)) {
      set({ sending: false, error: "Couldn't reach the coach — check your connection and try again." });
      return;
    }

    const action: AiAction | null = data.action ?? null;
    const [assistantMessage] = await db
      .insert(chatMessages)
      .values({
        role: 'assistant',
        content: data.reply ?? '(proposed a change to your routine)',
        actionPayload: action ? JSON.stringify(action) : null,
        actionStatus: action ? 'pending' : null,
      })
      .returning();
    set({ messages: [...get().messages, assistantMessage], sending: false });
  },

  confirmAction: async (messageId) => {
    const message = get().messages.find((item) => item.id === messageId);
    const action = message ? parseActionPayload(message.actionPayload) : null;

    if (!action) {
      await db.update(chatMessages).set({ actionStatus: 'failed' }).where(eq(chatMessages.id, messageId));
      const [failure] = await db
        .insert(chatMessages)
        .values({ role: 'assistant', content: "Sorry, I couldn't read that proposed change." })
        .returning();
      set({
        messages: [
          ...get().messages.map((item) => (item.id === messageId ? { ...item, actionStatus: 'failed' as const } : item)),
          failure,
        ],
      });
      return;
    }

    try {
      const routines = useRoutinesStore.getState();
      const { summary } = await executeAction(action, routines, useExerciseLibraryStore.getState().exercises);
      await db.update(chatMessages).set({ actionStatus: 'confirmed' }).where(eq(chatMessages.id, messageId));
      const [followUp] = await db
        .insert(chatMessages)
        .values({ role: 'assistant', content: `Done: ${summary}` })
        .returning();
      set({
        messages: [
          ...get().messages.map((item) => (item.id === messageId ? { ...item, actionStatus: 'confirmed' as const } : item)),
          followUp,
        ],
      });
    } catch (thrown) {
      const reason = thrown instanceof Error ? thrown.message : 'Something went wrong making that change.';
      await db.update(chatMessages).set({ actionStatus: 'failed' }).where(eq(chatMessages.id, messageId));
      const [failure] = await db.insert(chatMessages).values({ role: 'assistant', content: reason }).returning();
      set({
        messages: [
          ...get().messages.map((item) => (item.id === messageId ? { ...item, actionStatus: 'failed' as const } : item)),
          failure,
        ],
      });
    }
  },

  declineAction: async (messageId) => {
    await db.update(chatMessages).set({ actionStatus: 'declined' }).where(eq(chatMessages.id, messageId));
    const [followUp] = await db
      .insert(chatMessages)
      .values({ role: 'assistant', content: "Okay, I won't make that change." })
      .returning();
    set({
      messages: [
        ...get().messages.map((item) => (item.id === messageId ? { ...item, actionStatus: 'declined' as const } : item)),
        followUp,
      ],
    });
  },
}));
