import { extractYoutubeVideoId } from './video-player-sheet';

jest.mock('react-native-youtube-iframe', () => ({ __esModule: true, default: () => null }));

describe('extractYoutubeVideoId', () => {
  it('extracts the id from a standard watch url', () => {
    expect(extractYoutubeVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('extracts the id from a watch url with extra query params', () => {
    expect(
      extractYoutubeVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=30s&list=PL123')
    ).toBe('dQw4w9WgXcQ');
  });

  it('extracts the id from a shortened youtu.be url', () => {
    expect(extractYoutubeVideoId('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('extracts the id from a shorts url', () => {
    expect(extractYoutubeVideoId('https://www.youtube.com/shorts/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('extracts the id from an embed url', () => {
    expect(extractYoutubeVideoId('https://www.youtube.com/embed/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('returns null for a non-YouTube url', () => {
    expect(extractYoutubeVideoId('https://vimeo.com/12345')).toBeNull();
  });

  it('returns null for an empty string', () => {
    expect(extractYoutubeVideoId('')).toBeNull();
  });

  it('returns null for whitespace-only input', () => {
    expect(extractYoutubeVideoId('   ')).toBeNull();
  });
});
