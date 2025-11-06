import { Pressable, Text, TextInput, View } from 'react-native';

import { colors } from '@/constants/colors';

export type NumberFieldProps = {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  min?: number;
  max?: number;
  step?: number;
};

/** Strips everything but digits and keeps at most one decimal point. */
export function sanitizeNumericInput(text: string): string {
  const cleaned = text.replace(/[^0-9.]/g, '');
  const firstDot = cleaned.indexOf('.');
  if (firstDot === -1) return cleaned;
  return cleaned.slice(0, firstDot + 1) + cleaned.slice(firstDot + 1).replace(/\./g, '');
}

/**
 * Parses a NumberField's value for storage. Returns null for empty input or
 * anything that doesn't resolve to a finite number (e.g. a lone "."),
 * rather than letting NaN reach a DB write.
 */
export function parseOptionalNumber(text: string): number | null {
  if (!text) return null;
  const value = Number(text);
  return Number.isFinite(value) ? value : null;
}

/** Applies a +/- stepper delta to a NumberField's raw string value, clamped to [min, max]. Empty/invalid input steps from 0. */
export function stepValue(value: string, delta: number, min = -Infinity, max = Infinity): string {
  const current = parseOptionalNumber(value) ?? 0;
  const next = Math.min(max, Math.max(min, current + delta));
  return String(next);
}

export function NumberField({ label, value, onChangeText, min, max, step = 1 }: NumberFieldProps) {
  return (
    <View>
      <Text className="mb-1.5 text-sm text-ink-muted">{label}</Text>
      <View className="flex-row items-center gap-2">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Decrease ${label}`}
          hitSlop={8}
          onPress={() => onChangeText(stepValue(value, -step, min, max))}
          className="h-11 w-11 items-center justify-center rounded-xl border border-border bg-surface-raised">
          <Text className="text-lg text-ink-muted">−</Text>
        </Pressable>
        <TextInput
          value={value}
          onChangeText={(text) => onChangeText(sanitizeNumericInput(text))}
          keyboardType="numeric"
          placeholder="0"
          placeholderTextColor={colors.inkFaint}
          accessibilityLabel={label}
          className="flex-1 rounded-xl border border-border bg-surface-raised px-2 py-3.5 text-center text-base text-ink"
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Increase ${label}`}
          hitSlop={8}
          onPress={() => onChangeText(stepValue(value, step, min, max))}
          className="h-11 w-11 items-center justify-center rounded-xl border border-border bg-surface-raised">
          <Text className="text-lg text-ink-muted">+</Text>
        </Pressable>
      </View>
    </View>
  );
}
