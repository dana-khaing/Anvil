import { Pressable, Text, View } from 'react-native';

/**
 * Mixes the exercise catalog's 10 specific muscle-group values (see
 * src/db/seed-data/exercises.ts) with 3 coarse umbrella categories, since
 * the user should be able to tag a day either way -- "Chest and Tricep"
 * or just "Upper Body", whichever fits how they actually think about it.
 */
export const MUSCLE_GROUP_OPTIONS = [
  'chest',
  'back',
  'shoulders',
  'biceps',
  'triceps',
  'quads',
  'hamstrings',
  'glutes',
  'calves',
  'core',
  'upper_body',
  'lower_body',
  'full_body',
] as const;

export type MuscleGroupOption = (typeof MUSCLE_GROUP_OPTIONS)[number];

const LABELS: Record<MuscleGroupOption, string> = {
  chest: 'Chest',
  back: 'Back',
  shoulders: 'Shoulders',
  biceps: 'Biceps',
  triceps: 'Triceps',
  quads: 'Quads',
  hamstrings: 'Hamstrings',
  glutes: 'Glutes',
  calves: 'Calves',
  core: 'Core',
  upper_body: 'Upper Body',
  lower_body: 'Lower Body',
  full_body: 'Full Body',
};

export type MuscleGroupPickerProps = {
  selected: string[];
  onChange: (next: string[]) => void;
};

/** Multi-select chip grid for tagging a routine day's muscle group(s). */
export function MuscleGroupPicker({ selected, onChange }: MuscleGroupPickerProps) {
  const toggle = (value: MuscleGroupOption) => {
    onChange(selected.includes(value) ? selected.filter((item) => item !== value) : [...selected, value]);
  };

  return (
    <View className="flex-row flex-wrap gap-2">
      {MUSCLE_GROUP_OPTIONS.map((option) => {
        const isSelected = selected.includes(option);
        return (
          <Pressable
            key={option}
            onPress={() => toggle(option)}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
            className={`rounded-full border px-3 py-1.5 ${
              isSelected ? 'border-pulse-500 bg-pulse-500/15' : 'border-border bg-surface-raised'
            }`}>
            <Text className={`text-sm ${isSelected ? 'text-pulse-400' : 'text-ink-muted'}`}>
              {LABELS[option]}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
