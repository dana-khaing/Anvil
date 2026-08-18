import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';

import { Button } from '@/components/ui/button';

export const REST_SECONDS = 120;

export type RestTimerProps = {
  /** Fires once, either when the countdown reaches zero or when the user taps Skip. */
  onComplete: () => void;
};

/** Formats whole seconds as `M:SS` for the countdown display. */
export function formatCountdown(secondsRemaining: number): string {
  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

/** Skippable rest countdown shown between sets and between exercises. */
export function RestTimer({ onComplete }: RestTimerProps) {
  const [secondsRemaining, setSecondsRemaining] = useState(REST_SECONDS);

  useEffect(() => {
    if (secondsRemaining <= 0) {
      onComplete();
      return;
    }
    const interval = setInterval(() => {
      setSecondsRemaining((current) => current - 1);
    }, 1000);
    return () => clearInterval(interval);
    // onComplete is a store-bound callback the caller may recreate per render;
    // re-running this effect on its identity would restart the countdown.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsRemaining]);

  return (
    <View className="items-center gap-3 rounded-2xl border border-border bg-surface-raised p-6">
      <Text className="text-xs uppercase tracking-wide text-ink-faint">Rest</Text>
      <Text
        className="text-4xl font-semibold tabular-nums text-ink"
        accessibilityLabel={`${secondsRemaining} seconds of rest remaining`}>
        {formatCountdown(secondsRemaining)}
      </Text>
      <Button variant="secondary" onPress={onComplete}>
        Skip
      </Button>
    </View>
  );
}
