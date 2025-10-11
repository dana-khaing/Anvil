import { and, eq, isNotNull } from 'drizzle-orm';
import { create } from 'zustand';

import { db } from '@/db/client';
import { goals, streaks, workoutSessions } from '@/db/schema';

export type StreakStats = {
  currentStreak: number;
  longestStreak: number;
  lastWorkoutDate: string | null;
};

/** Formats an ISO datetime as a local-timezone calendar date (`YYYY-MM-DD`). */
export function toCalendarDate(isoString: string): string {
  const date = new Date(isoString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function diffInCalendarDays(fromDate: string, toDate: string): number {
  const [fy, fm, fd] = fromDate.split('-').map(Number);
  const [ty, tm, td] = toDate.split('-').map(Number);
  const fromUtc = Date.UTC(fy, fm - 1, fd);
  const toUtc = Date.UTC(ty, tm - 1, td);
  return Math.round((toUtc - fromUtc) / 86_400_000);
}

/**
 * Advances the streak for a workout completed on `completionDate`
 * (`YYYY-MM-DD`, local calendar day). A second workout on the same day is a
 * no-op (multiple sessions in one day don't inflate the streak). A workout
 * the day after the last one increments; any bigger gap resets to 1.
 * `longestStreak` only ever grows.
 */
export function updateStreakForCompletion(streak: StreakStats, completionDate: string): StreakStats {
  if (streak.lastWorkoutDate === completionDate) return streak;

  const daysSinceLast =
    streak.lastWorkoutDate === null ? null : diffInCalendarDays(streak.lastWorkoutDate, completionDate);

  const nextCurrent = daysSinceLast === 1 ? streak.currentStreak + 1 : 1;

  return {
    currentStreak: nextCurrent,
    longestStreak: Math.max(streak.longestStreak, nextCurrent),
    lastWorkoutDate: completionDate,
  };
}

export type MonthRange = { startDate: string; endDate: string };

/** The calendar-month range (`YYYY-MM-DD` bounds, inclusive) containing `now`. */
export function currentMonthRange(now: Date): MonthRange {
  const year = now.getFullYear();
  const month = now.getMonth();
  const lastDay = new Date(year, month + 1, 0).getDate();
  const pad = (n: number) => String(n).padStart(2, '0');
  return {
    startDate: `${year}-${pad(month + 1)}-01`,
    endDate: `${year}-${pad(month + 1)}-${pad(lastDay)}`,
  };
}

export type Badge = { id: string; label: string; description: string; earned: boolean };

type BadgeStats = { totalWorkouts: number; longestStreak: number };

const BADGE_DEFS: { id: string; label: string; description: string; earn: (s: BadgeStats) => boolean }[] = [
  { id: 'first-workout', label: 'First Rep', description: 'Complete your first workout', earn: (s) => s.totalWorkouts >= 1 },
  { id: 'streak-3', label: 'On a Roll', description: '3-day streak', earn: (s) => s.longestStreak >= 3 },
  { id: 'streak-7', label: 'Week Warrior', description: '7-day streak', earn: (s) => s.longestStreak >= 7 },
  { id: 'streak-30', label: 'Iron Habit', description: '30-day streak', earn: (s) => s.longestStreak >= 30 },
  { id: 'workouts-10', label: 'Getting Serious', description: '10 workouts logged', earn: (s) => s.totalWorkouts >= 10 },
  { id: 'workouts-50', label: 'Half Century', description: '50 workouts logged', earn: (s) => s.totalWorkouts >= 50 },
];

/** Deterministic, offline badge set — no separate badges table, derived from stats already tracked. */
export function computeBadges(stats: BadgeStats): Badge[] {
  return BADGE_DEFS.map((def) => ({
    id: def.id,
    label: def.label,
    description: def.description,
    earned: def.earn(stats),
  }));
}

type MonthlyGoal = { targetCount: number; completedCount: number };

type ProgressState = {
  streak: StreakStats;
  totalWorkouts: number;
  monthlyGoal: MonthlyGoal | null;
  badges: Badge[];
  loaded: boolean;
  load: () => Promise<void>;
  recordWorkoutCompletion: (completionIsoDate: string) => Promise<void>;
  setMonthlyTarget: (targetCount: number) => Promise<void>;
};

async function loadStreakRow() {
  const [row] = await db.select().from(streaks).limit(1);
  if (row) return row;
  const [created] = await db.insert(streaks).values({}).returning();
  return created;
}

/** Local calendar dates of every completed session, for anything that needs a completion history (e.g. Day 15's streak calendar). */
export async function completedSessionDates(): Promise<string[]> {
  const rows = await db
    .select({ finishedAt: workoutSessions.finishedAt })
    .from(workoutSessions)
    .where(and(eq(workoutSessions.status, 'completed'), isNotNull(workoutSessions.finishedAt)));
  return rows.map((row) => toCalendarDate(row.finishedAt as string));
}

async function loadMonthlyGoal(range: MonthRange): Promise<MonthlyGoal | null> {
  const [goal] = await db
    .select()
    .from(goals)
    .where(and(eq(goals.period, 'monthly'), eq(goals.startDate, range.startDate)))
    .limit(1);
  if (!goal) return null;

  const dates = await completedSessionDates();
  const completedCount = dates.filter((date) => date >= range.startDate && date <= range.endDate).length;
  return { targetCount: goal.targetCount, completedCount };
}

export const useProgressStore = create<ProgressState>((set, get) => ({
  streak: { currentStreak: 0, longestStreak: 0, lastWorkoutDate: null },
  totalWorkouts: 0,
  monthlyGoal: null,
  badges: computeBadges({ totalWorkouts: 0, longestStreak: 0 }),
  loaded: false,

  load: async () => {
    const streakRow = await loadStreakRow();
    const dates = await completedSessionDates();
    const totalWorkouts = dates.length;
    const monthlyGoal = await loadMonthlyGoal(currentMonthRange(new Date()));

    set({
      streak: streakRow,
      totalWorkouts,
      monthlyGoal,
      badges: computeBadges({ totalWorkouts, longestStreak: streakRow.longestStreak }),
      loaded: true,
    });
  },

  recordWorkoutCompletion: async (completionIsoDate) => {
    const streakRow = await loadStreakRow();
    const nextStreak = updateStreakForCompletion(streakRow, toCalendarDate(completionIsoDate));

    if (nextStreak !== streakRow) {
      await db
        .update(streaks)
        .set({
          currentStreak: nextStreak.currentStreak,
          longestStreak: nextStreak.longestStreak,
          lastWorkoutDate: nextStreak.lastWorkoutDate,
        })
        .where(eq(streaks.id, streakRow.id));
    }

    await get().load();
  },

  setMonthlyTarget: async (targetCount) => {
    const range = currentMonthRange(new Date());
    const [existing] = await db
      .select()
      .from(goals)
      .where(and(eq(goals.period, 'monthly'), eq(goals.startDate, range.startDate)))
      .limit(1);

    if (existing) {
      await db.update(goals).set({ targetCount }).where(eq(goals.id, existing.id));
    } else {
      await db.insert(goals).values({ period: 'monthly', targetCount, startDate: range.startDate, endDate: range.endDate });
    }

    await get().load();
  },
}));
