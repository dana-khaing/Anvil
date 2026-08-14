import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { type Equipment } from '@/db/seed-data/exercises';
import { type Exercise } from '@/stores/routines-store';

const EQUIPMENT_FILTERS: { value: Equipment | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'bodyweight', label: 'Bodyweight' },
  { value: 'dumbbell', label: 'Dumbbell' },
  { value: 'barbell', label: 'Barbell' },
  { value: 'machine', label: 'Machine' },
  { value: 'cable', label: 'Cable' },
];

export type SubstitutionPickerProps = {
  alternatives: Exercise[];
  onSelect: (exercise: Exercise) => void;
  onCancel: () => void;
};

/** Equipment-filterable list of alternates for the current exercise, e.g. when a machine isn't free. */
export function SubstitutionPicker({ alternatives, onSelect, onCancel }: SubstitutionPickerProps) {
  const [filter, setFilter] = useState<Equipment | 'all'>('all');

  const filtered = useMemo(
    () => (filter === 'all' ? alternatives : alternatives.filter((item) => item.equipment === filter)),
    [alternatives, filter]
  );

  return (
    <View className="gap-4">
      <Text className="text-lg font-semibold text-ink">Swap exercise</Text>

      <View className="flex-row flex-wrap gap-2">
        {EQUIPMENT_FILTERS.map((option) => {
          const selected = filter === option.value;
          return (
            <Pressable
              key={option.value}
              onPress={() => setFilter(option.value)}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              className={`rounded-full border px-3 py-1.5 ${
                selected ? 'border-pulse-500 bg-pulse-500/15' : 'border-border bg-surface-raised'
              }`}>
              <Text className={`text-sm ${selected ? 'text-pulse-400' : 'text-ink-muted'}`}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {filtered.length === 0 ? (
        <Text className="text-ink-muted">No alternatives with that equipment. Try another filter.</Text>
      ) : (
        <View className="gap-2">
          {filtered.map((exercise) => (
            <Pressable
              key={exercise.id}
              accessibilityRole="button"
              onPress={() => onSelect(exercise)}
              className="rounded-xl border border-border bg-surface-raised px-4 py-3">
              <Text className="text-base text-ink">{exercise.name}</Text>
              <Text className="mt-0.5 text-xs uppercase tracking-wide text-ink-faint">
                {exercise.equipment}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      <Pressable accessibilityRole="button" onPress={onCancel} className="items-center py-2">
        <Text className="text-ink-muted">Cancel</Text>
      </Pressable>
    </View>
  );
}
