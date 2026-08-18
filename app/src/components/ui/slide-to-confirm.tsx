import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useCallback, useState } from 'react';
import { Platform, View, type LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { colors } from '@/constants/colors';

const THUMB_SIZE = 48;
const TRACK_PADDING = 4;
const COMPLETE_THRESHOLD = 0.82;
// Same damping/stiffness as tab-bar.tsx's focus-scale spring, for consistency.
const SPRING_BACK = { damping: 14, stiffness: 220 };

export type SlideToConfirmProps = {
  label?: string;
  onConfirm: () => void | Promise<void>;
  accessibilityLabel: string;
  accessibilityHint?: string;
};

/**
 * Drag-to-confirm control for finishing an exercise. Mount fresh per
 * exercise (pass `key={currentExercise.id}` at the call site) so drag
 * position and `committing` state never carry over from a previous
 * exercise's slide.
 *
 * Accessibility: the drag is not the only way to trigger `onConfirm` --
 * `accessibilityActions`/`onAccessibilityAction` wires VoiceOver's and
 * TalkBack's standard double-tap ("activate") straight to the same confirm
 * path, so a user who can't perform the drag isn't blocked.
 */
export function SlideToConfirm({
  label = 'Slide to finish',
  onConfirm,
  accessibilityLabel,
  accessibilityHint = 'Drag right to finish this exercise, or double tap to finish it immediately.',
}: SlideToConfirmProps) {
  const [trackWidth, setTrackWidth] = useState(0);
  const [committing, setCommitting] = useState(false);
  const translateX = useSharedValue(0);
  const labelOpacity = useSharedValue(1);

  const maxTranslate = Math.max(0, trackWidth - THUMB_SIZE - TRACK_PADDING * 2);

  const onLayout = (event: LayoutChangeEvent) => {
    setTrackWidth(event.nativeEvent.layout.width);
  };

  const resetTrack = useCallback(() => {
    // eslint-disable-next-line react-hooks/immutability
    translateX.value = withSpring(0, SPRING_BACK);
    // eslint-disable-next-line react-hooks/immutability
    labelOpacity.value = withTiming(1, { duration: 150 });
  }, [translateX, labelOpacity]);

  const handleConfirm = useCallback(() => {
    setCommitting(true);
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    Promise.resolve(onConfirm()).catch(() => {
      // Matches finishExercise's own lack of elaborate error handling --
      // this is a local DB write, not a network call. Just un-stick the
      // control rather than leaving it permanently disabled.
      setCommitting(false);
      resetTrack();
    });
  }, [onConfirm, resetTrack]);

  const activate = useCallback(() => {
    if (committing) return;
    if (maxTranslate > 0) {
      // eslint-disable-next-line react-hooks/immutability
      translateX.value = withTiming(maxTranslate, { duration: 150 });
      // eslint-disable-next-line react-hooks/immutability
      labelOpacity.value = withTiming(0, { duration: 150 });
    }
    handleConfirm();
  }, [committing, maxTranslate, translateX, labelOpacity, handleConfirm]);

  const pan = Gesture.Pan()
    .enabled(!committing && maxTranslate > 0)
    .onUpdate((event) => {
      const next = Math.min(Math.max(event.translationX, 0), maxTranslate);
      // eslint-disable-next-line react-hooks/immutability
      translateX.value = next;
      // eslint-disable-next-line react-hooks/immutability
      labelOpacity.value = 1 - next / maxTranslate;
    })
    .onEnd(() => {
      if (translateX.value >= maxTranslate * COMPLETE_THRESHOLD) {
        // eslint-disable-next-line react-hooks/immutability
        translateX.value = withTiming(maxTranslate, { duration: 120 });
        // eslint-disable-next-line react-hooks/immutability
        labelOpacity.value = withTiming(0, { duration: 120 });
        runOnJS(handleConfirm)();
      } else {
        translateX.value = withSpring(0, SPRING_BACK);
        labelOpacity.value = withTiming(1, { duration: 150 });
      }
    });

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));
  const fillStyle = useAnimatedStyle(() => ({
    width: translateX.value + THUMB_SIZE,
  }));
  const labelStyle = useAnimatedStyle(() => ({
    opacity: labelOpacity.value,
  }));

  return (
    <View
      onLayout={onLayout}
      accessible
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: committing }}
      accessibilityActions={[{ name: 'activate' }]}
      onAccessibilityAction={(event) => {
        if (event.nativeEvent.actionName === 'activate') activate();
      }}
      className="h-14 justify-center overflow-hidden rounded-full border border-border bg-surface-raised"
      style={{ padding: TRACK_PADDING }}>
      <Animated.View
        pointerEvents="none"
        className="absolute inset-y-0 left-0 rounded-full bg-pulse-500/25"
        style={fillStyle}
      />
      <View pointerEvents="none" className="absolute inset-0 items-center justify-center">
        <Animated.Text className="text-center text-sm font-medium text-ink-muted" style={labelStyle}>
          {committing ? 'Finishing…' : label}
        </Animated.Text>
      </View>
      <GestureDetector gesture={pan}>
        <Animated.View
          className="items-center justify-center rounded-full bg-pulse-500"
          style={[{ width: THUMB_SIZE, height: THUMB_SIZE }, thumbStyle]}>
          <Ionicons name="chevron-forward" size={20} color={colors.ink} />
        </Animated.View>
      </GestureDetector>
    </View>
  );
}
