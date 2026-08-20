import { asc } from 'drizzle-orm';
import { create } from 'zustand';

import { db } from '@/db/client';
import { chatMessages } from '@/db/schema';
import { supabase } from '@/db/supabase-client';
import { type Profile } from '@/stores/profile-store';
import { type DayWithExercises, type Exercise, type Routine } from '@/stores/routines-store';

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

type ChatState = {
  messages: ChatMessage[];
  loaded: boolean;
  sending: boolean;
  error: string | null;
  load: () => Promise<void>;
  send: (content: string, context: string) => Promise<void>;
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

    if (error || !data?.reply) {
      set({ sending: false, error: "Couldn't reach the coach — check your connection and try again." });
      return;
    }

    const [assistantMessage] = await db
      .insert(chatMessages)
      .values({ role: 'assistant', content: data.reply })
      .returning();
    set({ messages: [...get().messages, assistantMessage], sending: false });
  },
}));
