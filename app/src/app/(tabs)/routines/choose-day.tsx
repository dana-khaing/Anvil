import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, FlatList, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card } from '@/components/ui/card';
import { ScreenHeader } from '@/components/ui/screen-header';
import { parseMuscleGroups, type DayWithExercises, useRoutinesStore } from '@/stores/routines-store';
import {
  findRestConflict,
  REST_WINDOW_HOURS,
  recentMuscleGroupCompletions,
  useWorkoutSessionStore,
  type MuscleGroupCompletion,
} from '@/stores/workout-session-store';

/** Lets the user manually pick which day to train, instead of only the auto-resolved rotation -- warns (but doesn't block) on a recent shared-muscle-group day. */
export default function ChooseDayScreen() {
  const days = useRoutinesStore((state) => state.days);
  const loaded = useRoutinesStore((state) => state.loaded);
  const load = useRoutinesStore((state) => state.load);
  const startSession = useWorkoutSessionStore((state) => state.startSession);

  const [recentCompletions, setRecentCompletions] = useState<MuscleGroupCompletion[] | null>(null);

  useEffect(() => {
    if (!loaded) load();
  }, [loaded, load]);

  useEffect(() => {
    if (!loaded) return;
    recentMuscleGroupCompletions(days, REST_WINDOW_HOURS, new Date()).then(setRecentCompletions);
  }, [loaded, days]);

  const pickDay = (day: DayWithExercises) => {
    // recentCompletions loads asynchronously and starts null -- without this
    // guard, tapping a day in that brief window would fall through to
    // `conflict === null` and skip the rest check entirely rather than
    // waiting to actually know.
    if (recentCompletions === null) return;

    const conflict = findRestConflict(day, recentCompletions, REST_WINDOW_HOURS, new Date());

    if (!conflict) {
      startSession(day);
      router.back();
      return;
    }

    const groupList = conflict.sharedMuscleGroups.map((group) => group.replace('_', ' ')).join(', ');
    const hours = Math.ceil(conflict.hoursRemaining);
    Alert.alert(
      'Still recovering?',
      `You trained ${groupList} within the last ${REST_WINDOW_HOURS} hours -- about ${hours}h of rest left. Muscles generally need a break before going again, but it's your call.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Train anyway',
          style: 'destructive',
          onPress: () => {
            startSession(day, { overrideRest: true });
            router.back();
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 px-6 pb-6">
        <ScreenHeader title="Choose a day" />
        {recentCompletions === null && (
          <Text className="mb-3 text-sm text-ink-faint">Checking rest status…</Text>
        )}
        <FlatList
          data={days}
          keyExtractor={(day) => String(day.id)}
          contentContainerStyle={{ gap: 10 }}
          renderItem={({ item: day }) => {
            const conflict =
              recentCompletions === null
                ? null
                : findRestConflict(day, recentCompletions, REST_WINDOW_HOURS, new Date());
            const groups = parseMuscleGroups(day.muscleGroups);

            return (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ disabled: recentCompletions === null }}
                disabled={recentCompletions === null}
                onPress={() => pickDay(day)}
                className={recentCompletions === null ? 'opacity-40' : undefined}>
                <Card className="gap-1.5">
                  <Text className="text-lg font-semibold text-ink">{day.label}</Text>
                  <Text className="text-sm text-ink-muted">
                    {day.exercises.length} exercise{day.exercises.length === 1 ? '' : 's'}
                  </Text>
                  {groups.length > 0 && (
                    <View className="mt-1 flex-row flex-wrap gap-1.5">
                      {groups.map((group) => (
                        <View key={group} className="rounded-full bg-pulse-500/15 px-2.5 py-1">
                          <Text className="text-xs text-pulse-400">{group.replace('_', ' ')}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                  {conflict && (
                    <Text className="mt-1 text-xs text-flame-500">
                      Trained recently -- about {Math.ceil(conflict.hoursRemaining)}h of rest left
                    </Text>
                  )}
                </Card>
              </Pressable>
            );
          }}
          ListEmptyComponent={loaded ? <Text className="text-ink-muted">No days yet.</Text> : null}
        />
      </View>
    </SafeAreaView>
  );
}
