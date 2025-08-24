import { BlurView } from 'expo-blur';
import { type ReactNode } from 'react';
import { Platform, View, type ViewProps } from 'react-native';

export type GlassPanelProps = ViewProps & {
  children: ReactNode;
  intensity?: number;
};

/**
 * A translucent, blurred surface for the futuristic glassmorphism look.
 * Falls back to a flat semi-transparent surface on web, where BlurView
 * has no native backdrop-filter equivalent in React Native Web.
 */
export function GlassPanel({ children, intensity = 40, className, style, ...rest }: GlassPanelProps) {
  if (Platform.OS === 'web') {
    return (
      <View
        className={`overflow-hidden rounded-2xl border border-border bg-surface-raised/80 ${className ?? ''}`}
        style={style}
        {...rest}>
        {children}
      </View>
    );
  }

  return (
    <BlurView
      intensity={intensity}
      tint="dark"
      className={`overflow-hidden rounded-2xl border border-border ${className ?? ''}`}
      style={style}
      {...rest}>
      {children}
    </BlurView>
  );
}
