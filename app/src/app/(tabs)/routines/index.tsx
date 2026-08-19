import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { FlatList, Pressable, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { MuscleGroupPicker } from '@/components/ui/muscle-group-picker';
import { colors } from '@/constants/colors';
import { parseMuscleGroups, useRoutinesStore } from '@/stores/routines-store';

export default function RoutinesScreen() {
  const days = useRoutinesStore((state) => state.days);
  const loaded = useRoutinesStore((state) => state.loaded);
  const load = useRoutinesStore((state) => state.load);
  const addDay = useRoutinesStore((state) => state.addDay);

  const [addingDay, setAddingDay] = useState(false);
  const [newDayLabel, setNewDayLabel] = useState('');
  const [newDayMuscleGroups, setNewDayMuscleGroups] = useState<string[]>([]);

  useEffect(() => {
    load();
  }, [load]);

  const submitNewDay = async () => {
    const label = newDayLabel.trim();
    if (!label) return;
    await addDay(label, newDayMuscleGroups);
    setNewDayLabel('');
    setNewDayMuscleGroups([]);
    setAddingDay(false);
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 px-6 pb-32 pt-2">
        <Text className="mb-4 text-4xl font-semibold text-ink">Routines</Text>

        {loaded && days.length === 0 && !addingDay && (
          <Card className="mb-4">
            <Text className="mb-3 text-ink-muted">
              No days yet. Add one to start building your routine.
            </Text>
            <Button onPress={() => setAddingDay(true)}>Add your first day</Button>
          </Card>
        )}

        <FlatList
          data={days}
          keyExtractor={(day) => String(day.id)}
          contentContainerStyle={{ gap: 12 }}
          renderItem={({ item: day }) => {
            const groups = parseMuscleGroups(day.muscleGroups);
            return (
            <Pressable accessibilityRole="button" onPress={() => router.push(`/routines/${day.id}`)}>
              <Card>
                <Text className="text-lg font-semibold text-ink">{day.label}</Text>
                <Text className="mt-1 text-sm text-ink-muted">
                  {day.exercises.length} exercise{day.exercises.length === 1 ? '' : 's'}
                </Text>
                {groups.length > 0 && (
                  <View className="mt-2 flex-row flex-wrap gap-1.5">
                    {groups.map((group) => (
                      <View key={group} className="rounded-full bg-pulse-500/15 px-2.5 py-1">
                        <Text className="text-xs text-pulse-400">{group.replace('_', ' ')}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </Card>
            </Pressable>
            );
          }}
          ListFooterComponent={
            days.length > 0 && !addingDay ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => setAddingDay(true)}
                className="mt-1 flex-row items-center justify-center gap-2 rounded-2xl border border-dashed border-border py-4">
                <Ionicons name="add" size={18} color={colors.inkMuted} />
                <Text className="text-ink-muted">Add another day</Text>
              </Pressable>
            ) : null
          }
        />

        {addingDay && (
          <Card className="mt-3 gap-3">
            <TextInput
              autoFocus
              value={newDayLabel}
              onChangeText={setNewDayLabel}
              placeholder="e.g. Push Day"
              placeholderTextColor={colors.inkFaint}
              accessibilityLabel="Day name"
              className="rounded-xl border border-border bg-background px-4 py-3 text-base text-ink"
            />
            <View>
              <Text className="mb-1.5 text-sm text-ink-muted">Muscle group(s) (optional)</Text>
              <MuscleGroupPicker selected={newDayMuscleGroups} onChange={setNewDayMuscleGroups} />
            </View>
            <View className="flex-row gap-3">
              <View className="flex-1">
                <Button
                  variant="secondary"
                  onPress={() => {
                    setAddingDay(false);
                    setNewDayLabel('');
                    setNewDayMuscleGroups([]);
                  }}>
                  Cancel
                </Button>
              </View>
              <View className="flex-1">
                <Button onPress={submitNewDay} disabled={!newDayLabel.trim()}>
                  Save
                </Button>
              </View>
            </View>
          </Card>
        )}
      </View>
    </SafeAreaView>
  );
}
