import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/ui/screen-header';
import { VideoPlayerSheet } from '@/components/ui/video-player-sheet';
import { colors } from '@/constants/colors';
import { useRoutinesStore } from '@/stores/routines-store';

export default function RoutineDayScreen() {
  const { dayId } = useLocalSearchParams<{ dayId: string }>();
  const days = useRoutinesStore((state) => state.days);
  const loaded = useRoutinesStore((state) => state.loaded);
  const load = useRoutinesStore((state) => state.load);
  const deleteExercise = useRoutinesStore((state) => state.deleteExercise);
  const deleteDay = useRoutinesStore((state) => state.deleteDay);

  const [playingVideoUrl, setPlayingVideoUrl] = useState<string | null>(null);

  const day = days.find((item) => String(item.id) === dayId);

  useEffect(() => {
    if (!loaded) load();
  }, [loaded, load]);

  if (loaded && !day) {
    return (
      <SafeAreaView className="flex-1 bg-background px-6">
        <ScreenHeader title="Day" />
        <Text className="text-ink-muted">This day no longer exists.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 px-6 pb-32">
        <ScreenHeader
          title={day?.label ?? ''}
          right={
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Delete day"
              hitSlop={12}
              onPress={async () => {
                if (!day) return;
                await deleteDay(day.id);
                router.back();
              }}
              className="h-11 w-11 items-center justify-center rounded-full bg-surface-raised">
              <Ionicons name="trash-outline" size={18} color={colors.danger} />
            </Pressable>
          }
        />

        <FlatList
          data={day?.exercises ?? []}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ gap: 10 }}
          renderItem={({ item }) => (
            <Pressable
              accessibilityRole="button"
              onPress={() =>
                router.push({
                  pathname: '/routines/exercise-form',
                  params: { dayId, entryId: String(item.id) },
                })
              }
              className="flex-row items-center justify-between rounded-2xl border border-border bg-surface-raised p-4">
              <View className="flex-1 pr-3">
                <Text className="text-base font-semibold text-ink">{item.exercise.name}</Text>
                <Text className="mt-1 text-sm text-ink-muted">
                  {item.targetWeightKg ? `${item.targetWeightKg}kg` : 'Bodyweight'} · {item.targetRepsMin}
                  -{item.targetRepsMax} reps · {item.targetSets} sets
                </Text>
              </View>
              {(item.videoUrl ?? item.exercise.defaultVideoUrl) && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Watch video for ${item.exercise.name}`}
                  hitSlop={12}
                  onPress={() => setPlayingVideoUrl(item.videoUrl ?? item.exercise.defaultVideoUrl)}
                  className="mr-2">
                  <Ionicons name="play-circle-outline" size={22} color={colors.pulse400} />
                </Pressable>
              )}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Remove ${item.exercise.name}`}
                hitSlop={12}
                onPress={() => deleteExercise(item.id)}>
                <Ionicons name="close-circle-outline" size={22} color={colors.inkFaint} />
              </Pressable>
            </Pressable>
          )}
          ListEmptyComponent={
            loaded ? <Text className="text-ink-muted">No exercises yet — add one below.</Text> : null
          }
          ListFooterComponent={
            <Pressable
              accessibilityRole="button"
              onPress={() =>
                router.push({ pathname: '/routines/exercise-form', params: { dayId } })
              }
              className="mt-1 flex-row items-center justify-center gap-2 rounded-2xl border border-dashed border-border py-4">
              <Ionicons name="add" size={18} color={colors.inkMuted} />
              <Text className="text-ink-muted">Add exercise</Text>
            </Pressable>
          }
        />
      </View>

      {playingVideoUrl && (
        <VideoPlayerSheet
          videoUrl={playingVideoUrl}
          visible={playingVideoUrl !== null}
          onClose={() => setPlayingVideoUrl(null)}
        />
      )}
    </SafeAreaView>
  );
}
