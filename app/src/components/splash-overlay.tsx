import * as SplashScreen from 'expo-splash-screen';
import { useState } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { FadeOut } from 'react-native-reanimated';

import { colors } from '@/constants/colors';

const FADE_DURATION = 350;

type AnimatedSplashOverlayProps = {
  /** True once the app has real content to show (e.g. DB migrations done). */
  ready: boolean;
};

/**
 * Hides the native splash screen on first layout, then keeps a matching JS
 * overlay up until `ready`, fading it out so there's no flash of unstyled
 * or empty content while data loads on launch.
 */
export function AnimatedSplashOverlay({ ready }: AnimatedSplashOverlayProps) {
  const [nativeSplashHidden, setNativeSplashHidden] = useState(false);

  if (nativeSplashHidden && ready) return null;

  return (
    <Animated.View
      exiting={FadeOut.duration(FADE_DURATION)}
      style={styles.overlay}
      onLayout={() => {
        if (!nativeSplashHidden) {
          SplashScreen.hideAsync().finally(() => setNativeSplashHidden(true));
        }
      }}
    />
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.background,
    zIndex: 1000,
  },
});
