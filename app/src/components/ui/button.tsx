import * as Haptics from 'expo-haptics';
import { type ReactNode } from 'react';
import { Platform, Pressable, Text, type PressableProps } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';

export type ButtonProps = Omit<PressableProps, 'children'> & {
  variant?: ButtonVariant;
  children: ReactNode;
};

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: 'bg-pulse-500 active:bg-pulse-600',
  secondary: 'bg-surface-raised border border-border',
  ghost: 'bg-transparent',
};

const VARIANT_TEXT_CLASSES: Record<ButtonVariant, string> = {
  primary: 'text-ink',
  secondary: 'text-ink',
  ghost: 'text-pulse-400',
};

export function Button({ variant = 'primary', children, disabled, style, ...rest }: ButtonProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      accessibilityRole="button"
      disabled={disabled}
      onPressIn={(event) => {
        // Reanimated's `.value` setter is its documented API for driving shared values
        // from JS-thread handlers, not a React state mutation the compiler should flag.
        // eslint-disable-next-line react-hooks/immutability
        scale.value = withTiming(0.96, { duration: 100 });
        if (Platform.OS !== 'web') {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        rest.onPressIn?.(event);
      }}
      onPressOut={(event) => {
        // eslint-disable-next-line react-hooks/immutability
        scale.value = withTiming(1, { duration: 150 });
        rest.onPressOut?.(event);
      }}
      className={`items-center justify-center rounded-xl px-5 py-3.5 ${VARIANT_CLASSES[variant]} ${disabled ? 'opacity-40' : ''}`}
      style={[animatedStyle, style]}
      {...rest}>
      {typeof children === 'string' ? (
        <Text className={`text-base font-semibold ${VARIANT_TEXT_CLASSES[variant]}`}>
          {children}
        </Text>
      ) : (
        children
      )}
    </AnimatedPressable>
  );
}
