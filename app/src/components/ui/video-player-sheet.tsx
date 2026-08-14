import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, Text, View } from 'react-native';
import YoutubeIframe from 'react-native-youtube-iframe';

/**
 * Extracts a YouTube video id from any common URL shape
 * (watch?v=, youtu.be/, shorts/, embed/). Returns null if the url doesn't
 * look like a YouTube link at all, rather than throwing.
 */
export function extractYoutubeVideoId(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) return null;

  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtube\.com\/embed\/|youtube\.com\/shorts\/|youtu\.be\/)([\w-]{11})/,
  ];

  for (const pattern of patterns) {
    const match = trimmed.match(pattern);
    if (match) return match[1];
  }

  return null;
}

export type VideoPlayerSheetProps = {
  videoUrl: string;
  visible: boolean;
  onClose: () => void;
};

/**
 * Plays a YouTube link inside the app — never redirects to the YouTube app
 * or browser. Shown as a modal sheet over whatever screen requested it.
 */
export function VideoPlayerSheet({ videoUrl, visible, onClose }: VideoPlayerSheetProps) {
  const videoId = extractYoutubeVideoId(videoUrl);
  const [loading, setLoading] = useState(true);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View className="flex-1 justify-center bg-background px-4">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close video"
          onPress={onClose}
          className="absolute right-4 top-4 z-10 h-11 w-11 items-center justify-center rounded-full bg-surface-raised">
          <Ionicons name="close" size={20} color="#F4F5FA" />
        </Pressable>

        {videoId ? (
          <View>
            {loading && (
              <View className="absolute inset-x-0 items-center justify-center" style={{ height: 220 }}>
                <ActivityIndicator color="#7C5CFF" />
              </View>
            )}
            <YoutubeIframe
              height={220}
              videoId={videoId}
              play={visible}
              onReady={() => setLoading(false)}
              webViewProps={{ allowsFullscreenVideo: true }}
            />
          </View>
        ) : (
          <Text className="text-center text-ink-muted">
            That doesn&apos;t look like a valid YouTube link.
          </Text>
        )}
      </View>
    </Modal>
  );
}
