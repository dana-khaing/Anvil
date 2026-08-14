import { desc, eq, inArray, isNotNull } from 'drizzle-orm';
import { create } from 'zustand';

import { db } from '@/db/client';
import { exercises, routineDays, routineExercises, setLogs, workoutSessions } from '@/db/schema';
import { completedSessionDates, toCalendarDate } from '@/stores/progress-store';

export type HistoryEntry = {
  sessionId: number;
  dayLabel: string;
  finishedAt: string;
  exerciseCount: number;
  setCount: number;
};

export type CalendarDay = { date: string; completed: boolean };

/** A `days`-long run of calendar dates ending at `endDate` (inclusive), oldest first. */
export function buildStreakCalendar(completedDates: string[], days: number, endDate: Date): CalendarDay[] {
  const completedSet = new Set(completedDates);
  const result: CalendarDay[] = [];

  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate() - offset);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const key = `${year}-${month}-${day}`;
    result.push({ date: key, completed: completedSet.has(key) });
  }

  return result;
}

type LoggedSet = { exerciseId: string };

/** The exercise with the most logged sets, ties broken by whichever appears first (roughly chronological, since rows come from the DB in insertion order). */
export function mostLoggedExerciseId(rows: LoggedSet[]): string | null {
  const counts = new Map<string, number>();
  for (const row of rows) {
    counts.set(row.exerciseId, (counts.get(row.exerciseId) ?? 0) + 1);
  }

  let best: string | null = null;
  let bestCount = 0;
  for (const [exerciseId, count] of counts) {
    if (count > bestCount) {
      best = exerciseId;
      bestCount = count;
    }
  }
  return best;
}

export type WeightPoint = { date: string; weightKg: number };

type WeightLog = { exerciseId: string; weightKg: number | null; completedAt: string | null };

/** One point per calendar date logged for `exerciseId` -- the heaviest set that day -- sorted oldest first. Bodyweight sets (no weight) are excluded, since there's nothing to chart. */
export function weightProgressionByDate(rows: WeightLog[], exerciseId: string): WeightPoint[] {
  const byDate = new Map<string, number>();

  for (const row of rows) {
    if (row.exerciseId !== exerciseId || row.weightKg === null || !row.completedAt) continue;
    const date = toCalendarDate(row.completedAt);
    const current = byDate.get(date);
    if (current === undefined || row.weightKg > current) {
      byDate.set(date, row.weightKg);
    }
  }

  return Array.from(byDate.entries())
    .map(([date, weightKg]) => ({ date, weightKg }))
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

/** A screen-reader description of a weight trend -- the chart line has no text equivalent otherwise. */
export function summarizeWeightTrend(exerciseName: string, points: WeightPoint[]): string {
  if (points.length === 0) return `${exerciseName}: no sessions logged yet.`;
  if (points.length === 1) return `${exerciseName}: ${points[0].weightKg}kg logged so far.`;

  const first = points[0].weightKg;
  const last = points[points.length - 1].weightKg;
  const direction = last > first ? 'up' : last < first ? 'down' : 'flat';
  return `${exerciseName}: ${direction} from ${first}kg to ${last}kg over ${points.length} sessions.`;
}

type WeightChart = { exerciseName: string; points: WeightPoint[] };

type StatsState = {
  history: HistoryEntry[];
  calendar: CalendarDay[];
  weightChart: WeightChart | null;
  loaded: boolean;
  load: () => Promise<void>;
};

const CALENDAR_DAYS = 56;
const HISTORY_LIMIT = 20;

export const useStatsStore = create<StatsState>((set) => ({
  history: [],
  calendar: [],
  weightChart: null,
  loaded: false,

  load: async () => {
    const sessions = await db
      .select({ session: workoutSessions, dayLabel: routineDays.label })
      .from(workoutSessions)
      .innerJoin(routineDays, eq(workoutSessions.routineDayId, routineDays.id))
      .where(eq(workoutSessions.status, 'completed'))
      .orderBy(desc(workoutSessions.finishedAt))
      .limit(HISTORY_LIMIT);

    const sessionIds = sessions.map((row) => row.session.id);
    const sessionLogs = sessionIds.length
      ? await db.select().from(setLogs).where(inArray(setLogs.sessionId, sessionIds))
      : [];

    const history: HistoryEntry[] = sessions.map(({ session, dayLabel }) => {
      const logsForSession = sessionLogs.filter((log) => log.sessionId === session.id);
      const exerciseCount = new Set(logsForSession.map((log) => log.routineExerciseId)).size;
      return {
        sessionId: session.id,
        dayLabel,
        finishedAt: session.finishedAt as string,
        exerciseCount,
        setCount: logsForSession.length,
      };
    });

    const dates = await completedSessionDates();
    const calendar = buildStreakCalendar(dates, CALENDAR_DAYS, new Date());

    const loggedSets = await db
      .select({
        weightKg: setLogs.weightKg,
        completedAt: setLogs.completedAt,
        substitutedExerciseId: setLogs.substitutedExerciseId,
        exerciseId: routineExercises.exerciseId,
      })
      .from(setLogs)
      .innerJoin(routineExercises, eq(setLogs.routineExerciseId, routineExercises.id))
      .where(isNotNull(setLogs.weightKg));

    const resolved = loggedSets.map((row) => ({
      exerciseId: row.substitutedExerciseId ?? row.exerciseId,
      weightKg: row.weightKg,
      completedAt: row.completedAt,
    }));

    const topExerciseId = mostLoggedExerciseId(resolved);
    let weightChart: WeightChart | null = null;
    if (topExerciseId) {
      const [exercise] = await db.select().from(exercises).where(eq(exercises.id, topExerciseId)).limit(1);
      const points = weightProgressionByDate(resolved, topExerciseId);
      if (exercise && points.length > 0) {
        weightChart = { exerciseName: exercise.name, points };
      }
    }

    set({ history, calendar, weightChart, loaded: true });
  },
}));
