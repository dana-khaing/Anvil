import * as SplashScreen from 'expo-splash-screen';
import { useState } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { FadeOut } from 'react-native-reanimated';

const FADE_DURATION = 350;

/**
 * Keeps the native splash screen up until layout settles, then fades to the
 * app background so there's no flash of unstyled content on launch.
 */
export function AnimatedSplashOverlay() {
  const [visible, setVisible] = useState(true);

  if (!visible) return null;

  return (
    <Animated.View
      exiting={FadeOut.duration(FADE_DURATION)}
      style={styles.overlay}
      onLayout={() => {
        SplashScreen.hideAsync().finally(() => setVisible(false));
      }}
    />
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#05060B',
    zIndex: 1000,
  },
});
