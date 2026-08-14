import { Text, TextInput, View } from 'react-native';

export type NumberFieldProps = {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
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

export function NumberField({ label, value, onChangeText }: NumberFieldProps) {
  return (
    <View>
      <Text className="mb-1.5 text-sm text-ink-muted">{label}</Text>
      <TextInput
        value={value}
        onChangeText={(text) => onChangeText(sanitizeNumericInput(text))}
        keyboardType="numeric"
        placeholder="0"
        placeholderTextColor="#5B6178"
        accessibilityLabel={label}
        className="rounded-xl border border-border bg-surface-raised px-4 py-3.5 text-base text-ink"
      />
    </View>
  );
}
