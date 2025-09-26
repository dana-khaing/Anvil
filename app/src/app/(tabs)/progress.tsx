import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { NumberField, parseOptionalNumber } from '@/components/ui/number-field';
import { ProgressRing } from '@/components/ui/progress-ring';
import { useProgressStore } from '@/stores/progress-store';

export default function ProgressScreen() {
  const streak = useProgressStore((state) => state.streak);
  const totalWorkouts = useProgressStore((state) => state.totalWorkouts);
  const monthlyGoal = useProgressStore((state) => state.monthlyGoal);
  const badges = useProgressStore((state) => state.badges);
  const loaded = useProgressStore((state) => state.loaded);
  const load = useProgressStore((state) => state.load);
  const setMonthlyTarget = useProgressStore((state) => state.setMonthlyTarget);

  const [editingGoal, setEditingGoal] = useState(false);
  const [targetInput, setTargetInput] = useState('');

  useEffect(() => {
    load();
  }, [load]);

  if (!loaded) {
    return <SafeAreaView className="flex-1 bg-background" />;
  }

  const goalProgress =
    monthlyGoal && monthlyGoal.targetCount > 0
      ? Math.min(1, monthlyGoal.completedCount / monthlyGoal.targetCount)
      : 0;

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView className="flex-1 px-6" contentContainerClassName="gap-4 pb-32 pt-2">
        <Text className="text-4xl font-semibold text-ink">Progress</Text>

        <Card className="flex-row items-center gap-4">
          <View className="h-14 w-14 items-center justify-center rounded-full bg-flame-500/15">
            <Ionicons
              name={streak.currentStreak > 0 ? 'flame' : 'flame-outline'}
              size={28}
              color={streak.currentStreak > 0 ? '#FF7A1A' : '#5B6178'}
            />
          </View>
          <View className="flex-1">
            <Text className="text-2xl font-semibold text-ink">
              {streak.currentStreak} day{streak.currentStreak === 1 ? '' : 's'}
            </Text>
            <Text className="text-ink-muted">
              Longest streak: {streak.longestStreak} · {totalWorkouts} workout{totalWorkouts === 1 ? '' : 's'} total
            </Text>
          </View>
        </Card>

        <Card className="gap-3">
          <Text className="text-xs uppercase tracking-wide text-ink-faint">Monthly goal</Text>

          {monthlyGoal && !editingGoal ? (
            <View className="flex-row items-center gap-4">
              <ProgressRing progress={goalProgress} size={64} strokeWidth={7} colors={['#7C5CFF', '#22D3EE']} />
              <View className="flex-1">
                <Text className="text-xl font-semibold text-ink">
                  {monthlyGoal.completedCount} / {monthlyGoal.targetCount} workouts
                </Text>
                <Text
                  className="mt-1 text-sm text-pulse-400"
                  onPress={() => {
                    setTargetInput(String(monthlyGoal.targetCount));
                    setEditingGoal(true);
                  }}>
                  Edit target
                </Text>
              </View>
            </View>
          ) : (
            <View className="gap-3">
              <Text className="text-ink-muted">
                {monthlyGoal
                  ? 'Set a new target for this month.'
                  : "You don't have a goal set for this month yet."}
              </Text>
              <NumberField label="Workouts this month" value={targetInput} onChangeText={setTargetInput} />
              <Button
                onPress={async () => {
                  const target = parseOptionalNumber(targetInput);
                  if (!target || target <= 0) return;
                  await setMonthlyTarget(Math.round(target));
                  setEditingGoal(false);
                  setTargetInput('');
                }}
                disabled={!parseOptionalNumber(targetInput)}>
                Save target
              </Button>
            </View>
          )}
        </Card>

        <Card className="gap-3">
          <Text className="text-xs uppercase tracking-wide text-ink-faint">Badges</Text>
          <View className="flex-row flex-wrap gap-3">
            {badges.map((badge) => (
              <View
                key={badge.id}
                className={`w-[47%] gap-1 rounded-xl border p-3 ${
                  badge.earned ? 'border-pulse-500 bg-pulse-500/10' : 'border-border bg-surface'
                }`}>
                <Ionicons
                  name={badge.earned ? 'ribbon' : 'lock-closed-outline'}
                  size={20}
                  color={badge.earned ? '#9C82FF' : '#5B6178'}
                />
                <Text className={`text-sm font-semibold ${badge.earned ? 'text-ink' : 'text-ink-faint'}`}>
                  {badge.label}
                </Text>
                <Text className="text-xs text-ink-faint">{badge.description}</Text>
              </View>
            ))}
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
