import { fireEvent, render, screen } from '@testing-library/react-native';

import { SlideToConfirm } from './slide-to-confirm';

jest.mock('expo-haptics', () => ({
  notificationAsync: jest.fn(),
  impactAsync: jest.fn(),
  NotificationFeedbackType: { Success: 'success' },
  ImpactFeedbackStyle: { Light: 'light' },
}));

describe('SlideToConfirm', () => {
  it('renders with the given accessibility label and role', async () => {
    await render(
      <SlideToConfirm accessibilityLabel="Mark Squat finished" onConfirm={jest.fn()} />
    );

    const control = screen.getByLabelText('Mark Squat finished');
    expect(control).toBeTruthy();
    expect(control.props.accessibilityRole).toBe('button');
  });

  it('calls onConfirm when the accessibility "activate" action fires -- the double-tap fallback for users who cannot perform the drag gesture', async () => {
    const onConfirm = jest.fn();
    await render(<SlideToConfirm accessibilityLabel="Mark Squat finished" onConfirm={onConfirm} />);

    fireEvent(screen.getByLabelText('Mark Squat finished'), 'accessibilityAction', {
      nativeEvent: { actionName: 'activate' },
    });

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});
