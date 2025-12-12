import { type DayWithExercises, type Exercise, type Routine } from './routines-store';
import { db } from '../db/client';
import { supabase } from '../db/supabase-client';
import { buildExerciseCatalogContext, buildRoutineContext, parseActionPayload, useChatStore } from './chat-store';
import { type Profile } from './profile-store';

jest.mock('@/db/client', () => ({ db: { insert: jest.fn() } }));
jest.mock('@/db/supabase-client', () => ({ supabase: { functions: { invoke: jest.fn() } } }));

const mockDb = db as unknown as { insert: jest.Mock };
const mockInvoke = supabase.functions.invoke as jest.Mock;

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
  return {
    id: 1,
    remoteId: null,
    routineId: 1,
    label,
    dayOrder: 1,
    muscleGroups: '[]',
    updatedAt: '2025-09-22',
    exercises,
  };
}

const benchPress: DayWithExercises['exercises'][number] = {
  id: 1,
  remoteId: null,
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
    expect(context).toContain('Barbell Bench Press (routine exercise id 1) (60kg, 8-10 reps, 3 sets)');
  });

  it('includes each day\'s stable id, for the coach to reference in a routine-change proposal', () => {
    const days = [makeDay('D1 - Chest and Tricep', [benchPress])];
    const context = buildRoutineContext(profile, routine, days);
    expect(context).toContain('D1 - Chest and Tricep (day id 1):');
  });

  it('notes an empty day rather than showing a blank line', () => {
    const days = [makeDay('D2 - Rest', [])];
    const context = buildRoutineContext(profile, routine, days);
    expect(context).toContain('D2 - Rest (day id 1): no exercises yet');
  });
});

describe('buildExerciseCatalogContext', () => {
  const squat: Exercise = {
    id: 'barbell-back-squat',
    name: 'Barbell Back Squat',
    equipment: 'barbell',
    muscleGroup: 'quads',
    defaultVideoUrl: null,
    alternativeIds: '[]',
  };

  it('groups exercise names by muscle group', () => {
    const context = buildExerciseCatalogContext([benchPress.exercise, squat]);
    expect(context).toContain('chest: Barbell Bench Press');
    expect(context).toContain('quads: Barbell Back Squat');
  });

  it('states plainly when the catalog has not loaded yet', () => {
    expect(buildExerciseCatalogContext([])).toBe('Exercise catalog: unavailable.');
  });
});

describe('parseActionPayload', () => {
  it('returns null for a null payload', () => {
    expect(parseActionPayload(null)).toBeNull();
  });

  it('returns null for malformed JSON', () => {
    expect(parseActionPayload('{not json')).toBeNull();
  });

  it('returns null when the parsed value has no kind field', () => {
    expect(parseActionPayload(JSON.stringify({ dayId: 1 }))).toBeNull();
  });

  it('returns the parsed action when well-formed', () => {
    const action = { kind: 'delete_day', dayId: 3 };
    expect(parseActionPayload(JSON.stringify(action))).toEqual(action);
  });

  it('returns null when a known action has invalid fields', () => {
    expect(parseActionPayload(JSON.stringify({ kind: 'delete_day', dayId: 'three' }))).toBeNull();
  });
});

describe('send', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useChatStore.setState({ messages: [], loaded: true, sending: false, error: null });
  });

  it('blocks a second send while the first message insert is pending', async () => {
    const userMessage = {
      id: 1,
      role: 'user' as const,
      content: 'How should I progress this week?',
      actionPayload: null,
      actionStatus: null,
      createdAt: '2025-12-11 09:00:00',
    };
    const assistantMessage = {
      id: 2,
      role: 'assistant' as const,
      content: 'Add one rep while your form stays consistent.',
      actionPayload: null,
      actionStatus: null,
      createdAt: '2025-12-11 09:00:01',
    };

    let resolveUserInsert: ((messages: [typeof userMessage]) => void) | undefined;
    const userInsert = new Promise<[typeof userMessage]>((resolve) => {
      resolveUserInsert = resolve;
    });

    mockDb.insert
      .mockReturnValueOnce({
        values: jest.fn().mockReturnValue({ returning: jest.fn().mockReturnValue(userInsert) }),
      })
      .mockReturnValueOnce({
        values: jest.fn().mockReturnValue({ returning: jest.fn().mockResolvedValue([assistantMessage]) }),
      });
    mockInvoke.mockResolvedValue({ data: { reply: assistantMessage.content, action: null }, error: null });

    const firstSend = useChatStore.getState().send(userMessage.content, 'routine context');
    const duplicateSend = useChatStore.getState().send(userMessage.content, 'routine context');

    expect(useChatStore.getState().sending).toBe(true);
    expect(mockDb.insert).toHaveBeenCalledTimes(1);

    resolveUserInsert?.([userMessage]);
    await Promise.all([firstSend, duplicateSend]);

    expect(mockInvoke).toHaveBeenCalledTimes(1);
    expect(useChatStore.getState()).toMatchObject({
      messages: [userMessage, assistantMessage],
      sending: false,
      error: null,
    });
  });

  it('does not persist a malformed action returned beside a valid reply', async () => {
    const userMessage = {
      id: 1,
      role: 'user' as const,
      content: 'Update my first day',
      actionPayload: null,
      actionStatus: null,
      createdAt: '2025-12-12 09:00:00',
    };
    const assistantMessage = {
      id: 2,
      role: 'assistant' as const,
      content: 'I could not form that change safely.',
      actionPayload: null,
      actionStatus: null,
      createdAt: '2025-12-12 09:00:01',
    };
    const assistantValues = jest
      .fn()
      .mockReturnValue({ returning: jest.fn().mockResolvedValue([assistantMessage]) });

    mockDb.insert
      .mockReturnValueOnce({
        values: jest.fn().mockReturnValue({ returning: jest.fn().mockResolvedValue([userMessage]) }),
      })
      .mockReturnValueOnce({ values: assistantValues });
    mockInvoke.mockResolvedValue({
      data: { reply: assistantMessage.content, action: { kind: 'delete_day', dayId: 'first' } },
      error: null,
    });

    await useChatStore.getState().send(userMessage.content, 'routine context');

    expect(assistantValues).toHaveBeenCalledWith({
      role: 'assistant',
      content: assistantMessage.content,
      actionPayload: null,
      actionStatus: null,
    });
  });
});
