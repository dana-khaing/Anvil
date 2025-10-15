import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { FlatList, Pressable, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useRoutinesStore } from '@/stores/routines-store';

export default function RoutinesScreen() {
  const days = useRoutinesStore((state) => state.days);
  const loaded = useRoutinesStore((state) => state.loaded);
  const load = useRoutinesStore((state) => state.load);
  const addDay = useRoutinesStore((state) => state.addDay);

  const [addingDay, setAddingDay] = useState(false);
  const [newDayLabel, setNewDayLabel] = useState('');

  useEffect(() => {
    load();
  }, [load]);

  const submitNewDay = async () => {
    const label = newDayLabel.trim();
    if (!label) return;
    await addDay(label);
    setNewDayLabel('');
    setAddingDay(false);
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 px-6 pb-32 pt-2">
        <Text className="mb-4 text-4xl font-semibold text-ink">Routines</Text>

        {loaded && days.length === 0 && !addingDay && (
          <Card className="mb-4">
            <Text className="mb-3 text-ink-muted">
              No days yet. Add one to start building your routine, just like &quot;D1 - Chest and
              Tricep&quot;.
            </Text>
            <Button onPress={() => setAddingDay(true)}>Add your first day</Button>
          </Card>
        )}

        <FlatList
          data={days}
          keyExtractor={(day) => String(day.id)}
          contentContainerStyle={{ gap: 12 }}
          renderItem={({ item: day }) => (
            <Pressable onPress={() => router.push(`/routines/${day.id}`)}>
              <Card>
                <Text className="text-lg font-semibold text-ink">{day.label}</Text>
                <Text className="mt-1 text-sm text-ink-muted">
                  {day.exercises.length} exercise{day.exercises.length === 1 ? '' : 's'}
                </Text>
              </Card>
            </Pressable>
          )}
          ListFooterComponent={
            days.length > 0 && !addingDay ? (
              <Pressable
                onPress={() => setAddingDay(true)}
                className="mt-1 flex-row items-center justify-center gap-2 rounded-2xl border border-dashed border-border py-4">
                <Ionicons name="add" size={18} color="#9AA1B8" />
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
              placeholder="e.g. D1 - Chest and Tricep"
              placeholderTextColor="#7A8099"
              className="rounded-xl border border-border bg-background px-4 py-3 text-base text-ink"
            />
            <View className="flex-row gap-3">
              <View className="flex-1">
                <Button
                  variant="secondary"
                  onPress={() => {
                    setAddingDay(false);
                    setNewDayLabel('');
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
