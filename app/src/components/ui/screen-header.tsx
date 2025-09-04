import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

export type ScreenHeaderProps = {
  title: string;
  onBack?: () => void;
  right?: React.ReactNode;
};

export function ScreenHeader({ title, onBack, right }: ScreenHeaderProps) {
  return (
    <View className="flex-row items-center justify-between py-3">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Back"
        onPress={onBack ?? (() => router.back())}
        hitSlop={12}
        className="h-10 w-10 items-center justify-center rounded-full bg-surface-raised">
        <Ionicons name="chevron-back" size={20} color="#F4F5FA" />
      </Pressable>
      <Text className="flex-1 px-3 text-lg font-semibold text-ink" numberOfLines={1}>
        {title}
      </Text>
      {right ?? <View className="h-10 w-10" />}
    </View>
  );
}
