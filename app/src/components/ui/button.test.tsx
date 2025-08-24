import { fireEvent, render, screen } from '@testing-library/react-native';

import { Button } from './button';

describe('Button', () => {
  it('renders its label and responds to press', async () => {
    const onPress = jest.fn();
    await render(<Button onPress={onPress}>Start workout</Button>);

    expect(screen.getByText('Start workout')).toBeTruthy();

    fireEvent.press(screen.getByRole('button'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
