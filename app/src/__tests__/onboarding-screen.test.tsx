import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';

import { db } from '@/db/client';
import { createRoutineFromTemplate } from '@/db/routines';

import OnboardingScreen from '@/app/onboarding/index';

jest.mock('expo-router', () => ({
  router: { replace: jest.fn() },
}));

jest.mock('expo-haptics', () => ({
  selectionAsync: jest.fn(),
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light' },
}));

jest.mock('@/db/client', () => ({
  db: { insert: jest.fn() },
}));

jest.mock('@/db/routines', () => ({
  createRoutineFromTemplate: jest.fn(),
}));

describe('OnboardingScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (db.insert as jest.Mock).mockReturnValue({ values: jest.fn().mockResolvedValue(undefined) });
  });

  it('walks through the full flow and creates a routine on finish', async () => {
    await render(<OnboardingScreen />);

    expect(screen.getByText('Welcome to PulseForge')).toBeTruthy();
    await fireEvent.press(screen.getByText('Get Started'));

    expect(screen.getByText(/Height & weight/)).toBeTruthy();
    await fireEvent.changeText(screen.getAllByPlaceholderText('0')[0], '180');
    await fireEvent.press(screen.getByText('Continue'));

    expect(screen.getByText("What's your goal?")).toBeTruthy();
    await fireEvent.press(screen.getByText('Build muscle'));
    await fireEvent.press(screen.getByText('Continue'));

    expect(screen.getByText('Pick a starting split')).toBeTruthy();
    await fireEvent.press(screen.getByText('Push / Pull / Legs'));
    await fireEvent.press(screen.getByText('Continue'));

    expect(screen.getByText('Ready to go')).toBeTruthy();
    await fireEvent.press(screen.getByText('Create my routine'));

    await screen.findByText('Create my routine');

    expect(createRoutineFromTemplate).toHaveBeenCalledWith('push_pull_legs');
    expect(router.replace).toHaveBeenCalledWith('/(tabs)');
  });

  it('lets the user skip straight to the tab shell without a routine', async () => {
    await render(<OnboardingScreen />);

    await fireEvent.press(screen.getByText("I'll build my own routine"));

    await screen.findByText("I'll build my own routine");

    expect(createRoutineFromTemplate).not.toHaveBeenCalled();
    expect(router.replace).toHaveBeenCalledWith('/(tabs)');
  });

  it('disables Continue on the goal step until a goal is selected', async () => {
    await render(<OnboardingScreen />);

    await fireEvent.press(screen.getByText('Get Started'));
    await fireEvent.press(screen.getByText('Continue'));

    expect(screen.getByText("What's your goal?")).toBeTruthy();
    expect(screen.getByText('Continue').parent?.props.accessibilityState?.disabled).toBe(true);
  });
});
