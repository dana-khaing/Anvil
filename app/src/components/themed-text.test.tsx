import { render, screen } from '@testing-library/react-native';

import { ThemedText } from './themed-text';

describe('ThemedText', () => {
  it('renders its children', async () => {
    await render(<ThemedText>PulseForge</ThemedText>);

    expect(screen.getByText('PulseForge')).toBeTruthy();
  });
});
