import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { type BottomTabBarProps } from 'expo-router/js-tabs';
import { Platform, Pressable, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GlassPanel } from '@/components/ui/glass-panel';

type IconName = keyof typeof Ionicons.glyphMap;

const TAB_ICONS: Record<string, { active: IconName; inactive: IconName }> = {
  index: { active: 'flash', inactive: 'flash-outline' },
  routines: { active: 'barbell', inactive: 'barbell-outline' },
  progress: { active: 'stats-chart', inactive: 'stats-chart-outline' },
  chat: { active: 'sparkles', inactive: 'sparkles-outline' },
  profile: { active: 'person-circle', inactive: 'person-circle-outline' },
};

export function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      pointerEvents="box-none"
      className="absolute inset-x-4 items-center"
      style={{ bottom: insets.bottom + 12 }}>
      <GlassPanel className="flex-row gap-1 p-2">
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;
          const icons = TAB_ICONS[route.name] ?? TAB_ICONS.index;

          return (
            <TabBarButton
              key={route.key}
              label={String(options.title ?? route.name)}
              iconName={isFocused ? icons.active : icons.inactive}
              isFocused={isFocused}
              onPress={() => {
                const event = navigation.emit({
                  type: 'tabPress',
                  target: route.key,
                  canPreventDefault: true,
                });

                if (Platform.OS !== 'web') {
                  Haptics.selectionAsync();
                }

                if (!isFocused && !event.defaultPrevented) {
                  navigation.navigate(route.name);
                }
              }}
            />
          );
        })}
      </GlassPanel>
    </View>
  );
}

type TabBarButtonProps = {
  label: string;
  iconName: IconName;
  isFocused: boolean;
  onPress: () => void;
};

function TabBarButton({ label, iconName, isFocused, onPress }: TabBarButtonProps) {
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(isFocused ? 1 : 0.94, { damping: 14, stiffness: 220 }) }],
  }));

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={isFocused ? { selected: true } : {}}
      accessibilityLabel={label}
      onPress={onPress}
      className="items-center justify-center rounded-xl px-4 py-2"
      style={{ minWidth: 56 }}>
      <Animated.View
        className={`items-center justify-center rounded-xl px-3 py-1.5 ${isFocused ? 'bg-pulse-500/20' : ''}`}
        style={animatedStyle}>
        <Ionicons name={iconName} size={22} color={isFocused ? '#9C82FF' : '#5B6178'} />
      </Animated.View>
    </Pressable>
  );
}
