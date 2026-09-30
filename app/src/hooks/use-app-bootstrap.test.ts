import { act, renderHook } from '@testing-library/react-native';

import { seedExerciseLibrary } from '@/db/seed';
import { useAuthStore } from '@/stores/auth-store';
import { useNotificationsStore } from '@/stores/notifications-store';
import { useProfileStore } from '@/stores/profile-store';

import { useAppBootstrap } from './use-app-bootstrap';

const mockProfileState = { checked: true, load: jest.fn() };
const mockAuthState = { checked: true, init: jest.fn() };
const mockNotificationsState = { load: jest.fn() };

jest.mock('@/db/client', () => ({ db: {} }));
jest.mock('@/db/seed', () => ({ seedExerciseLibrary: jest.fn() }));
jest.mock('@/stores/profile-store', () => ({ useProfileStore: jest.fn() }));
jest.mock('@/stores/auth-store', () => ({ useAuthStore: jest.fn() }));
jest.mock('@/stores/notifications-store', () => ({ useNotificationsStore: jest.fn() }));

const mockSeedExerciseLibrary = seedExerciseLibrary as jest.MockedFunction<typeof seedExerciseLibrary>;
const mockUseProfileStore = useProfileStore as unknown as jest.Mock;
const mockUseAuthStore = useAuthStore as unknown as jest.Mock;
const mockUseNotificationsStore = useNotificationsStore as unknown as jest.Mock;

describe('useAppBootstrap', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockProfileState.checked = true;
    mockAuthState.checked = true;
    mockAuthState.init.mockResolvedValue(undefined);
    mockNotificationsState.load.mockResolvedValue(undefined);
    mockProfileState.load.mockResolvedValue(undefined);
    mockUseProfileStore.mockImplementation((selector) => selector(mockProfileState));
    mockUseAuthStore.mockImplementation((selector) => selector(mockAuthState));
    mockUseNotificationsStore.mockImplementation((selector) => selector(mockNotificationsState));
  });

  it('does not start app services before migrations finish', async () => {
    const { result } = await renderHook(() => useAppBootstrap(false));

    expect(result.current).toBe(false);
    expect(mockSeedExerciseLibrary).not.toHaveBeenCalled();
    expect(mockAuthState.init).not.toHaveBeenCalled();
    expect(mockNotificationsState.load).not.toHaveBeenCalled();
  });

  it('starts independent services after migration and loads the profile after seeding', async () => {
    let finishSeed: (() => void) | undefined;
    mockSeedExerciseLibrary.mockReturnValue(
      new Promise<void>((resolve) => {
        finishSeed = resolve;
      }),
    );

    const { result } = await renderHook(() => useAppBootstrap(true));

    expect(result.current).toBe(false);
    expect(mockSeedExerciseLibrary).toHaveBeenCalledTimes(1);
    expect(mockAuthState.init).toHaveBeenCalledTimes(1);
    expect(mockNotificationsState.load).toHaveBeenCalledTimes(1);
    expect(mockProfileState.load).not.toHaveBeenCalled();

    await act(async () => {
      finishSeed?.();
      await Promise.resolve();
    });

    expect(mockProfileState.load).toHaveBeenCalledTimes(1);
    expect(result.current).toBe(true);
  });
});
