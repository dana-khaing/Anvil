import { render, screen } from '@testing-library/react-native';

import { VideoThumbnail } from './video-thumbnail';

jest.mock('expo-image', () => {
  const { View } = require('react-native');
  return { Image: View };
});
jest.mock('react-native-youtube-iframe', () => ({ __esModule: true, default: () => null }));

describe('VideoThumbnail', () => {
  it('renders the thumbnail image and label for a valid YouTube url', async () => {
    await render(
      <VideoThumbnail
        videoUrl="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
        exerciseName="Barbell Bench Press"
        onPress={jest.fn()}
      />
    );

    expect(screen.getByLabelText('Watch video for Barbell Bench Press')).toBeTruthy();
  });

  it('falls back to a plain button when the url is not a recognizable YouTube link', async () => {
    await render(
      <VideoThumbnail videoUrl="https://example.com/not-youtube" exerciseName="Squat" onPress={jest.fn()} />
    );

    expect(screen.getByText('Watch video')).toBeTruthy();
    expect(screen.getByLabelText('Watch video for Squat')).toBeTruthy();
  });
});
