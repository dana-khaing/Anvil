import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { NumberField, parseOptionalNumber } from '@/components/ui/number-field';
import { ScreenHeader } from '@/components/ui/screen-header';
import { useExerciseLibraryStore } from '@/stores/exercise-library-store';
import { useRoutinesStore } from '@/stores/routines-store';

export default function ExerciseFormScreen() {
  const { dayId, entryId } = useLocalSearchParams<{ dayId: string; entryId?: string }>();
  const days = useRoutinesStore((state) => state.days);
  const addExercise = useRoutinesStore((state) => state.addExercise);
  const updateExercise = useRoutinesStore((state) => state.updateExercise);

  const libraryExercises = useExerciseLibraryStore((state) => state.exercises);
  const loadLibrary = useExerciseLibraryStore((state) => state.load);

  const day = days.find((item) => String(item.id) === dayId);
  const existingEntry = day?.exercises.find((item) => String(item.id) === entryId);

  const [exerciseId, setExerciseId] = useState<string | null>(existingEntry?.exerciseId ?? null);
  const [search, setSearch] = useState('');
  const [weight, setWeight] = useState(existingEntry?.targetWeightKg?.toString() ?? '');
  const [repsMin, setRepsMin] = useState(existingEntry?.targetRepsMin?.toString() ?? '8');
  const [repsMax, setRepsMax] = useState(existingEntry?.targetRepsMax?.toString() ?? '12');
  const [sets, setSets] = useState(existingEntry?.targetSets?.toString() ?? '3');
  const [videoUrl, setVideoUrl] = useState(existingEntry?.videoUrl ?? '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadLibrary();
  }, [loadLibrary]);

  const filteredExercises = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return libraryExercises;
    return libraryExercises.filter((exercise) => exercise.name.toLowerCase().includes(query));
  }, [libraryExercises, search]);

  const selectedExercise = libraryExercises.find((exercise) => exercise.id === exerciseId);

  const save = async () => {
    if (!exerciseId) return;
    setSaving(true);
    try {
      const input = {
        exerciseId,
        targetWeightKg: parseOptionalNumber(weight),
        targetRepsMin: parseOptionalNumber(repsMin),
        targetRepsMax: parseOptionalNumber(repsMax),
        targetSets: parseOptionalNumber(sets) ?? 3,
        videoUrl: videoUrl.trim() || null,
      };

      if (existingEntry) {
        await updateExercise(existingEntry.id, input);
      } else if (day) {
        await addExercise(day.id, input);
      }
      router.back();
    } finally {
      setSaving(false);
    }
  };

  if (!exerciseId) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 px-6">
          <ScreenHeader title="Choose an exercise" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search exercises"
            placeholderTextColor="#7A8099"
            accessibilityLabel="Search exercises"
            className="mb-3 rounded-xl border border-border bg-surface-raised px-4 py-3 text-base text-ink"
          />
          <FlatList
            data={filteredExercises}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ gap: 8, paddingBottom: 32 }}
            renderItem={({ item }) => (
              <Pressable
                accessibilityRole="button"
                onPress={() => setExerciseId(item.id)}
                className="rounded-xl border border-border bg-surface-raised px-4 py-3">
                <Text className="text-base text-ink">{item.name}</Text>
                <Text className="mt-0.5 text-xs uppercase tracking-wide text-ink-faint">
                  {item.equipment} · {item.muscleGroup}
                </Text>
              </Pressable>
            )}
            ListEmptyComponent={
              <Text className="text-ink-muted">
                {search.trim() ? `No exercises match "${search.trim()}".` : 'No exercises found.'}
              </Text>
            }
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 px-6">
        <ScreenHeader title={selectedExercise?.name ?? 'Exercise'} />

        <View className="gap-4">
          <View className="flex-row gap-3">
            <View className="flex-1">
              <NumberField label="Weight (kg)" value={weight} onChangeText={setWeight} />
            </View>
            <View className="flex-1">
              <NumberField label="Sets" value={sets} onChangeText={setSets} />
            </View>
          </View>
          <View className="flex-row gap-3">
            <View className="flex-1">
              <NumberField label="Reps min" value={repsMin} onChangeText={setRepsMin} />
            </View>
            <View className="flex-1">
              <NumberField label="Reps max" value={repsMax} onChangeText={setRepsMax} />
            </View>
          </View>
          <View>
            <Text className="mb-1.5 text-sm text-ink-muted">Video link (optional)</Text>
            <TextInput
              value={videoUrl}
              onChangeText={setVideoUrl}
              placeholder="https://youtube.com/..."
              placeholderTextColor="#7A8099"
              autoCapitalize="none"
              keyboardType="url"
              accessibilityLabel="Video link (optional)"
              className="rounded-xl border border-border bg-surface-raised px-4 py-3.5 text-base text-ink"
            />
          </View>
        </View>

        <View className="flex-1" />

        <View className="gap-3 pb-6">
          {!existingEntry && (
            <Button variant="secondary" onPress={() => setExerciseId(null)} disabled={saving}>
              Choose a different exercise
            </Button>
          )}
          <Button onPress={save} disabled={saving}>
            {saving ? 'Saving...' : existingEntry ? 'Save changes' : 'Add to day'}
          </Button>
        </View>
      </View>
    </SafeAreaView>
  );
}
