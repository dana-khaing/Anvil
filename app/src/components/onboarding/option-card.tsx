import * as Haptics from 'expo-haptics';
import { Platform, Pressable, Text, View } from 'react-native';

export type OptionCardProps = {
  title: string;
  description: string;
  selected: boolean;
  onPress: () => void;
};

export function OptionCard({ title, description, selected, onPress }: OptionCardProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={() => {
        if (Platform.OS !== 'web') {
          Haptics.selectionAsync();
        }
        onPress();
      }}
      className={`rounded-2xl border p-4 ${
        selected ? 'border-pulse-500 bg-pulse-500/10' : 'border-border bg-surface-raised'
      }`}>
      <View className="flex-row items-center justify-between">
        <Text className={`text-base font-semibold ${selected ? 'text-pulse-400' : 'text-ink'}`}>
          {title}
        </Text>
        <View
          className={`h-5 w-5 rounded-full border-2 ${
            selected ? 'border-pulse-500 bg-pulse-500' : 'border-ink-faint'
          }`}
        />
      </View>
      <Text className="mt-1 text-sm text-ink-muted">{description}</Text>
    </Pressable>
  );
}
