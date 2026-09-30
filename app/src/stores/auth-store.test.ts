import { type Session } from '@supabase/supabase-js';

import { supabase } from '@/db/supabase-client';

import { useAuthStore } from './auth-store';

jest.mock('@/db/supabase-client', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
      onAuthStateChange: jest.fn(),
      signUp: jest.fn(),
      signInWithPassword: jest.fn(),
      signOut: jest.fn(),
    },
  },
}));

const mockGetSession = supabase.auth.getSession as jest.Mock;
const mockOnAuthStateChange = supabase.auth.onAuthStateChange as jest.Mock;

describe('init', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.setState({ session: null, checked: false, error: null, loading: false });
  });

  it('shares one initialization across overlapping and later calls', async () => {
    let finishSessionCheck: ((value: { data: { session: Session | null } }) => void) | undefined;
    const sessionCheck = new Promise<{ data: { session: Session | null } }>((resolve) => {
      finishSessionCheck = resolve;
    });
    mockGetSession.mockReturnValue(sessionCheck);
    mockOnAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: jest.fn() } } });

    const firstInit = useAuthStore.getState().init();
    const overlappingInit = useAuthStore.getState().init();

    expect(mockGetSession).toHaveBeenCalledTimes(1);
    expect(mockOnAuthStateChange).not.toHaveBeenCalled();

    finishSessionCheck?.({ data: { session: null } });
    await Promise.all([firstInit, overlappingInit]);
    await useAuthStore.getState().init();

    expect(mockGetSession).toHaveBeenCalledTimes(1);
    expect(mockOnAuthStateChange).toHaveBeenCalledTimes(1);
    expect(useAuthStore.getState().checked).toBe(true);
  });

  it('updates the store from the single auth listener', async () => {
    const session = { access_token: 'token' } as Session;
    let onAuthChange: ((_event: string, session: Session | null) => void) | undefined;
    mockGetSession.mockResolvedValue({ data: { session: null } });
    mockOnAuthStateChange.mockImplementation((listener) => {
      onAuthChange = listener;
      return { data: { subscription: { unsubscribe: jest.fn() } } };
    });

    await useAuthStore.getState().init();
    onAuthChange?.('SIGNED_IN', session);

    expect(useAuthStore.getState().session).toBe(session);
  });
});
