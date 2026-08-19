import { render, screen } from '@testing-library/react-native';

import { VideoThumbnail } from './video-thumbnail';

jest.mock('expo-image', () => {
  // jest.mock() factories can't reference out-of-scope imports (Jest hoists
  // this above the module's imports) -- require() inside the factory is the
  // documented way around that, not a stray require left over from before.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require('react');
  // Fires onLoad with real (480x360) dimensions for a normal video id, or
  // YouTube's actual empirically-confirmed 120x90 "unavailable" placeholder
  // dimensions when the url contains the fake "deadxxxxxx1" id used below --
  // simulating the real failure mode (a 200 OK with a placeholder image,
  // not a load error).
  return {
    Image: ({ source, onLoad }: { source: { uri: string }; onLoad?: (event: unknown) => void }) => {
      React.useEffect(() => {
        const placeholder = source.uri.includes('deadxxxxxx1');
        onLoad?.({ source: { url: source.uri, width: placeholder ? 120 : 480, height: placeholder ? 90 : 360 } });
      }, [source.uri, onLoad]);
      return null;
    },
  };
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
    expect(screen.queryByText('Watch video')).toBeNull();
  });

  it('falls back to a plain button when the url is not a recognizable YouTube link', async () => {
    await render(
      <VideoThumbnail videoUrl="https://example.com/not-youtube" exerciseName="Squat" onPress={jest.fn()} />
    );

    expect(screen.getByText('Watch video')).toBeTruthy();
    expect(screen.getByLabelText('Watch video for Squat')).toBeTruthy();
  });

  it('falls back when the loaded image is YouTube\'s 120x90 "video unavailable" placeholder', async () => {
    await render(
      <VideoThumbnail
        videoUrl="https://www.youtube.com/watch?v=deadxxxxxx1"
        exerciseName="Deadlift"
        onPress={jest.fn()}
      />
    );

    expect(await screen.findByText('Watch video')).toBeTruthy();
  });
});
