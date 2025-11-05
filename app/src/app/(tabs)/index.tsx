import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SubstitutionPicker } from '@/components/workout/substitution-picker';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ProgressRing } from '@/components/ui/progress-ring';
import { VideoPlayerSheet } from '@/components/ui/video-player-sheet';
import { colors } from '@/constants/colors';
import { useExerciseLibraryStore } from '@/stores/exercise-library-store';
import { useRoutinesStore } from '@/stores/routines-store';
import { useWorkoutSessionStore } from '@/stores/workout-session-store';

export default function TodayScreen() {
  const days = useRoutinesStore((state) => state.days);
  const routinesLoaded = useRoutinesStore((state) => state.loaded);
  const loadRoutines = useRoutinesStore((state) => state.load);

  const today = useWorkoutSessionStore((state) => state.today);
  const session = useWorkoutSessionStore((state) => state.session);
  const completedExerciseIds = useWorkoutSessionStore((state) => state.completedExerciseIds);
  const substitution = useWorkoutSessionStore((state) => state.substitution);
  const sessionLoaded = useWorkoutSessionStore((state) => state.loaded);
  const loadSession = useWorkoutSessionStore((state) => state.load);
  const startSession = useWorkoutSessionStore((state) => state.startSession);
  const finishExercise = useWorkoutSessionStore((state) => state.finishExercise);
  const substituteExercise = useWorkoutSessionStore((state) => state.substitute);
  const clearSubstitution = useWorkoutSessionStore((state) => state.clearSubstitution);

  const loadLibrary = useExerciseLibraryStore((state) => state.load);
  const alternativesFor = useExerciseLibraryStore((state) => state.alternativesFor);

  const [showSubstitutePicker, setShowSubstitutePicker] = useState(false);
  const [playingVideoUrl, setPlayingVideoUrl] = useState<string | null>(null);

  useEffect(() => {
    loadRoutines();
    loadLibrary();
  }, [loadRoutines, loadLibrary]);

  useEffect(() => {
    if (routinesLoaded) loadSession(days);
    // days is intentionally omitted: re-run only when routinesLoaded flips, not on every
    // `days` array identity change, since load() re-derives from the current closure value.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routinesLoaded, loadSession]);

  if (!routinesLoaded || !sessionLoaded) {
    return <SafeAreaView className="flex-1 bg-background" />;
  }

  if (!today) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 justify-center px-6 pb-32">
          <Text className="mb-3 text-4xl font-semibold text-ink">Today</Text>
          <Card>
            <Text className="mb-3 text-ink-muted">
              You don&apos;t have a routine yet. Add a day in the Routines tab to get started.
            </Text>
            <Button onPress={() => router.push('/routines')}>Go to Routines</Button>
          </Card>
        </View>
      </SafeAreaView>
    );
  }

  const total = today.exercises.length;
  const completedCount = completedExerciseIds.size;
  const progress = total === 0 ? 0 : completedCount / total;
  const currentExercise = today.exercises.find((exercise) => !completedExerciseIds.has(exercise.id));
  const isComplete = session?.status === 'completed';

  const activeSubstitution =
    currentExercise && substitution?.forRoutineExerciseId === currentExercise.id ? substitution : null;
  const displayName = activeSubstitution?.exercise.name ?? currentExercise?.exercise.name;
  const displayTargets = activeSubstitution?.adjusted ?? currentExercise;
  const displayVideoUrl = activeSubstitution
    ? activeSubstitution.exercise.defaultVideoUrl
    : (currentExercise?.videoUrl ?? currentExercise?.exercise.defaultVideoUrl);

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 px-6 pb-32">
        <View className="flex-row items-center justify-between pt-2">
          <View className="flex-1 pr-4">
            <Text className="text-4xl font-semibold text-ink">{today.label}</Text>
            <Text className="mt-1 text-ink-muted">
              {completedCount}/{total} exercises
            </Text>
          </View>
          <ProgressRing progress={progress} size={64} strokeWidth={7} />
        </View>

        {!session && (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/routines/choose-day')}
            className="mt-2 self-start">
            <Text className="text-sm text-pulse-400">Choose a different day</Text>
          </Pressable>
        )}

        <View className="flex-1 justify-center">
          {total === 0 && (
            <Card>
              <Text className="text-ink-muted">
                This day has no exercises yet — add some from the Routines tab.
              </Text>
            </Card>
          )}

          {total > 0 && !session && (
            <Card className="gap-3">
              <Text className="text-ink-muted">
                Ready for {today.label}? {total} exercise{total === 1 ? '' : 's'} today.
              </Text>
              <Button onPress={() => startSession()}>Start Workout</Button>
            </Card>
          )}

          {session && isComplete && (
            <Card>
              <Text className="mb-1 text-xl font-semibold text-ink">Workout complete 🎉</Text>
              <Text className="text-ink-muted">Nice work. See you next time.</Text>
            </Card>
          )}

          {session && !isComplete && currentExercise && showSubstitutePicker && (
            <Card>
              <SubstitutionPicker
                alternatives={alternativesFor(currentExercise.exerciseId)}
                onSelect={(exercise) => {
                  substituteExercise(currentExercise.id, exercise);
                  setShowSubstitutePicker(false);
                }}
                onCancel={() => setShowSubstitutePicker(false)}
              />
            </Card>
          )}

          {session && !isComplete && currentExercise && !showSubstitutePicker && displayTargets && (
            <Card className="gap-4">
              <View>
                <View className="flex-row items-center justify-between">
                  <Text className="text-xs uppercase tracking-wide text-ink-faint">
                    Exercise {completedCount + 1} of {total}
                  </Text>
                  {activeSubstitution && (
                    <Pressable accessibilityRole="button" onPress={clearSubstitution}>
                      <Text className="text-xs text-pulse-400">Use original</Text>
                    </Pressable>
                  )}
                </View>
                <View className="mt-1 flex-row items-center gap-2">
                  <Text className="text-2xl font-semibold text-ink">{displayName}</Text>
                  {displayVideoUrl && (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Watch video for ${displayName}`}
                      hitSlop={12}
                      onPress={() => setPlayingVideoUrl(displayVideoUrl)}>
                      <Ionicons name="play-circle-outline" size={22} color={colors.pulse400} />
                    </Pressable>
                  )}
                </View>
                {activeSubstitution && (
                  <Text className="mt-0.5 text-xs text-ink-faint">
                    Swapped for {currentExercise.exercise.name}
                  </Text>
                )}
              </View>
              <View className="flex-row gap-6">
                <Stat
                  label="Weight"
                  value={displayTargets.targetWeightKg ? `${displayTargets.targetWeightKg}kg` : 'Body'}
                />
                <Stat
                  label="Reps"
                  value={`${displayTargets.targetRepsMin ?? '-'}-${displayTargets.targetRepsMax ?? '-'}`}
                />
                <Stat label="Sets" value={String(displayTargets.targetSets)} />
              </View>
              <View className="flex-row gap-3">
                <View className="flex-1">
                  <Button variant="secondary" onPress={() => setShowSubstitutePicker(true)}>
                    Swap
                  </Button>
                </View>
                <View className="flex-1">
                  <Button onPress={() => finishExercise(currentExercise.id)}>Finished</Button>
                </View>
              </View>
            </Card>
          )}
        </View>
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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View>
      <Text className="text-xs text-ink-faint">{label}</Text>
      <Text className="mt-0.5 text-base font-semibold text-ink">{value}</Text>
    </View>
  );
}
