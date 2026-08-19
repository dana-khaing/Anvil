import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { colors } from '@/constants/colors';
import { extractYoutubeVideoId } from '@/components/ui/video-player-sheet';

export type VideoThumbnailProps = {
  videoUrl: string;
  exerciseName: string;
  onPress: () => void;
};

/**
 * Real YouTube thumbnail for the Today screen's hero card, tappable to open
 * the existing VideoPlayerSheet. Falls back to a compact icon+label button
 * -- matching the small icon this replaces -- if the url isn't a
 * recognizable YouTube link, or if the network image fails to load. Unlike
 * this app's local SQLite writes, a thumbnail fetch is a real network
 * dependency, so it gets an explicit failure state instead of rendering
 * broken.
 */
export function VideoThumbnail({ videoUrl, exerciseName, onPress }: VideoThumbnailProps) {
  const videoId = extractYoutubeVideoId(videoUrl);
  const [failed, setFailed] = useState(false);

  const accessibilityLabel = `Watch video for ${exerciseName}`;

  if (!videoId || failed) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        onPress={onPress}
        className="flex-row items-center gap-2 self-start rounded-xl border border-border bg-surface-raised px-3 py-2">
        <Ionicons name="play-circle-outline" size={20} color={colors.pulse400} />
        <Text className="text-sm text-ink-muted">Watch video</Text>
      </Pressable>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      className="w-full overflow-hidden rounded-xl bg-surface"
      style={{ aspectRatio: 16 / 9 }}>
      <VideoThumbnailImage videoId={videoId} onError={() => setFailed(true)} />
      <View className="absolute inset-0 items-center justify-center">
        <View className="h-12 w-12 items-center justify-center rounded-full bg-black/40">
          <Ionicons name="play" size={22} color={colors.ink} />
        </View>
      </View>
    </Pressable>
  );
}

// YouTube returns HTTP 200 with a generic grey placeholder -- not an error
// -- for a hqdefault.jpg request against a deleted/private/invalid video id.
// Confirmed empirically: a real video's hqdefault.jpg is 480x360; the
// placeholder is always exactly 120x90, regardless of video id.
const PLACEHOLDER_WIDTH = 120;
const PLACEHOLDER_HEIGHT = 90;

function VideoThumbnailImage({ videoId, onError }: { videoId: string; onError: () => void }) {
  const [loading, setLoading] = useState(true);

  return (
    <>
      <Image
        source={{ uri: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` }}
        style={{ width: '100%', height: '100%' }}
        contentFit="cover"
        transition={150}
        onLoad={(event) => {
          if (event.source.width === PLACEHOLDER_WIDTH && event.source.height === PLACEHOLDER_HEIGHT) {
            onError();
            return;
          }
          setLoading(false);
        }}
        onError={onError}
      />
      {loading && (
        <View className="absolute inset-0 items-center justify-center bg-surface">
          <ActivityIndicator color={colors.pulse500} />
        </View>
      )}
    </>
  );
}
