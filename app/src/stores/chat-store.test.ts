import { type DayWithExercises, type Routine } from './routines-store';
import { buildRoutineContext } from './chat-store';
import { type Profile } from './profile-store';

jest.mock('@/db/client', () => ({ db: {} }));
jest.mock('@/db/supabase-client', () => ({ supabase: {} }));

const profile: Profile = {
  id: 1,
  remoteId: null,
  heightCm: 180,
  weightKg: 80,
  goal: 'build_muscle',
  notificationsEnabled: false,
  lastActiveAt: null,
  createdAt: '2025-09-22',
  updatedAt: '2025-09-22',
};

const routine: Routine = {
  id: 1,
  remoteId: null,
  name: 'Push Pull Legs',
  splitType: 'push_pull_legs',
  isActive: true,
  createdAt: '2025-09-22',
  updatedAt: '2025-09-22',
};

function makeDay(label: string, exercises: DayWithExercises['exercises']): DayWithExercises {
  return { id: 1, remoteId: null, routineId: 1, label, dayOrder: 1, updatedAt: '2025-09-22', deletedAt: null, exercises };
}

const benchPress: DayWithExercises['exercises'][number] = {
  id: 1,
  remoteId: null,
  deletedAt: null,
  routineDayId: 1,
  exerciseId: 'barbell-bench-press',
  orderIndex: 0,
  targetWeightKg: 60,
  targetRepsMin: 8,
  targetRepsMax: 10,
  targetSets: 3,
  videoUrl: null,
  notes: null,
  updatedAt: '2025-09-22',
  exercise: {
    id: 'barbell-bench-press',
    name: 'Barbell Bench Press',
    equipment: 'barbell',
    muscleGroup: 'chest',
    defaultVideoUrl: null,
    alternativeIds: '[]',
  },
};

describe('buildRoutineContext', () => {
  it('states plainly when there is no profile and no routine', () => {
    const context = buildRoutineContext(null, null, []);
    expect(context).toContain('User has not set up a profile yet.');
    expect(context).toContain('User has no active routine yet.');
  });

  it('includes profile stats when a profile exists', () => {
    const context = buildRoutineContext(profile, null, []);
    expect(context).toContain('goal=build_muscle');
    expect(context).toContain('height=180cm');
    expect(context).toContain('weight=80kg');
  });

  it('summarizes each day and its exercises for an active routine', () => {
    const days = [makeDay('D1 - Chest and Tricep', [benchPress])];
    const context = buildRoutineContext(profile, routine, days);
    expect(context).toContain('Push Pull Legs');
    expect(context).toContain('push_pull_legs split');
    expect(context).toContain('D1 - Chest and Tricep');
    expect(context).toContain('Barbell Bench Press (60kg, 8-10 reps, 3 sets)');
  });

  it('notes an empty day rather than showing a blank line', () => {
    const days = [makeDay('D2 - Rest', [])];
    const context = buildRoutineContext(profile, routine, days);
    expect(context).toContain('D2 - Rest: no exercises yet');
  });
});
