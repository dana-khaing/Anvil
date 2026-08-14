import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card } from '@/components/ui/card';

type ScreenPlaceholderProps = {
  title: string;
  description: string;
};

/** Temporary placeholder screen body — replaced feature-by-feature on later build days. */
export function ScreenPlaceholder({ title, description }: ScreenPlaceholderProps) {
  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 justify-center px-6 pb-32">
        <Text className="mb-3 text-4xl font-semibold text-ink">{title}</Text>
        <Card>
          <Text className="text-ink-muted">{description}</Text>
        </Card>
      </View>
    </SafeAreaView>
  );
}
