import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { NumberField, parseOptionalNumber } from '@/components/ui/number-field';
import { ProgressRing } from '@/components/ui/progress-ring';
import { WeightChart } from '@/components/ui/weight-chart';
import { colors } from '@/constants/colors';
import { useProgressStore } from '@/stores/progress-store';
import { summarizeWeightTrend, useStatsStore } from '@/stores/stats-store';

export default function ProgressScreen() {
  const streak = useProgressStore((state) => state.streak);
  const totalWorkouts = useProgressStore((state) => state.totalWorkouts);
  const monthlyGoal = useProgressStore((state) => state.monthlyGoal);
  const badges = useProgressStore((state) => state.badges);
  const loaded = useProgressStore((state) => state.loaded);
  const load = useProgressStore((state) => state.load);
  const setMonthlyTarget = useProgressStore((state) => state.setMonthlyTarget);

  const history = useStatsStore((state) => state.history);
  const calendar = useStatsStore((state) => state.calendar);
  const weightChart = useStatsStore((state) => state.weightChart);
  const statsLoaded = useStatsStore((state) => state.loaded);
  const loadStats = useStatsStore((state) => state.load);

  const [editingGoal, setEditingGoal] = useState(false);
  const [targetInput, setTargetInput] = useState('');

  useEffect(() => {
    load();
    loadStats();
  }, [load, loadStats]);

  if (!loaded || !statsLoaded) {
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
              color={streak.currentStreak > 0 ? colors.flame500 : colors.inkFaint}
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
              <ProgressRing progress={goalProgress} size={64} strokeWidth={7} colors={[colors.pulse500, colors.cyan400]} />
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
                accessible
                accessibilityLabel={`${badge.label}: ${badge.description}. ${badge.earned ? 'Earned' : 'Locked'}.`}
                className={`w-[47%] gap-1 rounded-xl border p-3 ${
                  badge.earned ? 'border-pulse-500 bg-pulse-500/10' : 'border-border bg-surface'
                }`}>
                <Ionicons
                  name={badge.earned ? 'ribbon' : 'lock-closed-outline'}
                  size={20}
                  color={badge.earned ? colors.pulse400 : colors.inkFaint}
                />
                <Text className={`text-sm font-semibold ${badge.earned ? 'text-ink' : 'text-ink-faint'}`}>
                  {badge.label}
                </Text>
                <Text className="text-xs text-ink-faint">{badge.description}</Text>
              </View>
            ))}
          </View>
        </Card>

        <Card className="gap-3">
          <Text className="text-xs uppercase tracking-wide text-ink-faint">Last 8 weeks</Text>
          <View
            className="flex-row flex-wrap gap-1"
            accessible
            accessibilityLabel={`${calendar.filter((day) => day.completed).length} of ${calendar.length} days completed in the last 8 weeks`}>
            {calendar.map((day) => (
              <View
                key={day.date}
                className={`h-3.5 w-3.5 rounded-sm ${day.completed ? 'bg-flame-500' : 'bg-surface'}`}
              />
            ))}
          </View>
        </Card>

        {weightChart && (
          <Card className="gap-3">
            <Text className="text-xs uppercase tracking-wide text-ink-faint">{weightChart.exerciseName}</Text>
            {weightChart.points.length >= 2 ? (
              <>
                <WeightChart
                  points={weightChart.points}
                  accessibilityLabel={summarizeWeightTrend(weightChart.exerciseName, weightChart.points)}
                />
                <Text className="text-ink-muted">
                  {weightChart.points[0].weightKg}kg → {weightChart.points[weightChart.points.length - 1].weightKg}kg
                </Text>
              </>
            ) : (
              <Text className="text-ink-muted">
                {weightChart.points[0].weightKg}kg logged so far — a couple more sessions and this becomes a
                trend line.
              </Text>
            )}
          </Card>
        )}

        <Card className="gap-3">
          <Text className="text-xs uppercase tracking-wide text-ink-faint">History</Text>
          {history.length === 0 ? (
            <Text className="text-ink-muted">Completed workouts will show up here.</Text>
          ) : (
            <View className="gap-3">
              {history.map((entry) => (
                <View key={entry.sessionId} className="flex-row items-center justify-between">
                  <View>
                    <Text className="text-ink">{entry.dayLabel}</Text>
                    <Text className="text-xs text-ink-faint">
                      {new Date(entry.finishedAt).toLocaleDateString()}
                    </Text>
                  </View>
                  <Text className="text-ink-muted">
                    {entry.exerciseCount} exercise{entry.exerciseCount === 1 ? '' : 's'} · {entry.setCount} sets
                  </Text>
                </View>
              ))}
            </View>
          )}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
