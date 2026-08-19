import { router } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { OptionCard } from '@/components/onboarding/option-card';
import { Button } from '@/components/ui/button';
import { NumberField, parseOptionalNumber } from '@/components/ui/number-field';
import { db } from '@/db/client';
import { createRoutineFromTemplate } from '@/db/routines';
import { profiles } from '@/db/schema';
import type { SplitType } from '@/db/seed-data/templates';

type Step = 'welcome' | 'measurements' | 'goal' | 'split' | 'review';

const STEPS: Step[] = ['welcome', 'measurements', 'goal', 'split', 'review'];

type Goal = 'build_muscle' | 'lose_fat' | 'maintain' | 'strength';

const GOAL_OPTIONS: { value: Goal; title: string; description: string }[] = [
  { value: 'build_muscle', title: 'Build muscle', description: 'Hypertrophy-focused training' },
  { value: 'lose_fat', title: 'Lose fat', description: 'Stay in a calorie deficit, keep strength' },
  { value: 'maintain', title: 'Maintain', description: 'Stay consistent, hold steady' },
  { value: 'strength', title: 'Get stronger', description: 'Lower reps, heavier weight' },
];

const SPLIT_OPTIONS: { value: SplitType; title: string; description: string }[] = [
  { value: 'push_pull_legs', title: 'Push / Pull / Legs', description: '3 days a week' },
  { value: 'upper_lower', title: 'Upper / Lower', description: '4 days a week' },
  { value: 'bro_split', title: 'Bro Split', description: '6 days a week, one muscle group per day' },
];

export default function OnboardingScreen() {
  const [stepIndex, setStepIndex] = useState(0);
  const [heightCm, setHeightCm] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [goal, setGoal] = useState<Goal | null>(null);
  const [splitType, setSplitType] = useState<SplitType | null>(null);
  const [saving, setSaving] = useState(false);

  const step = STEPS[stepIndex];

  const goNext = () => setStepIndex((index) => Math.min(index + 1, STEPS.length - 1));
  const goBack = () => setStepIndex((index) => Math.max(index - 1, 0));

  const finishOnboarding = async (options: { withRoutine: boolean }) => {
    setSaving(true);
    try {
      await db.insert(profiles).values({
        heightCm: parseOptionalNumber(heightCm),
        weightKg: parseOptionalNumber(weightKg),
        goal: options.withRoutine ? goal : null,
        lastActiveAt: new Date().toISOString(),
      });

      if (options.withRoutine && splitType) {
        await createRoutineFromTemplate(splitType);
      }

      router.replace('/(tabs)');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 px-6 pt-4">
        <StepDots current={stepIndex} total={STEPS.length} />

        <View className="flex-1 pt-8">
          {step === 'welcome' && (
            <View className="flex-1 justify-center">
              <Text className="mb-3 text-4xl font-semibold text-ink">Welcome to Anvil</Text>
              <Text className="text-base text-ink-muted">
                Answer a few questions and we&apos;ll build you a starter routine — or skip
                straight to building your own.
              </Text>
            </View>
          )}

          {step === 'measurements' && (
            <View className="flex-1 justify-center gap-4">
              <Text className="mb-1 text-2xl font-semibold text-ink">
                Height &amp; weight
              </Text>
              <Text className="mb-2 text-sm text-ink-muted">
                Optional — helps tailor future recommendations. You can skip this.
              </Text>
              <NumberField label="Height (cm)" value={heightCm} onChangeText={setHeightCm} min={0} />
              <NumberField label="Weight (kg)" value={weightKg} onChangeText={setWeightKg} min={0} step={0.5} />
            </View>
          )}

          {step === 'goal' && (
            <View className="flex-1 gap-3">
              <Text className="mb-1 text-2xl font-semibold text-ink">What&apos;s your goal?</Text>
              {GOAL_OPTIONS.map((option) => (
                <OptionCard
                  key={option.value}
                  title={option.title}
                  description={option.description}
                  selected={goal === option.value}
                  onPress={() => setGoal(option.value)}
                />
              ))}
            </View>
          )}

          {step === 'split' && (
            <View className="flex-1 gap-3">
              <Text className="mb-1 text-2xl font-semibold text-ink">Pick a starting split</Text>
              {SPLIT_OPTIONS.map((option) => (
                <OptionCard
                  key={option.value}
                  title={option.title}
                  description={option.description}
                  selected={splitType === option.value}
                  onPress={() => setSplitType(option.value)}
                />
              ))}
            </View>
          )}

          {step === 'review' && (
            <View className="flex-1 justify-center gap-2">
              <Text className="mb-1 text-2xl font-semibold text-ink">Ready to go</Text>
              <ReviewRow label="Height" value={heightCm ? `${heightCm} cm` : 'Not set'} />
              <ReviewRow label="Weight" value={weightKg ? `${weightKg} kg` : 'Not set'} />
              <ReviewRow
                label="Goal"
                value={GOAL_OPTIONS.find((option) => option.value === goal)?.title ?? 'Not set'}
              />
              <ReviewRow
                label="Split"
                value={SPLIT_OPTIONS.find((option) => option.value === splitType)?.title ?? 'Not set'}
              />
            </View>
          )}
        </View>

        <View className="gap-3 pb-6">
          {step === 'welcome' && (
            <>
              <Button onPress={goNext}>Get Started</Button>
              <Button variant="ghost" disabled={saving} onPress={() => finishOnboarding({ withRoutine: false })}>
                I&apos;ll build my own routine
              </Button>
            </>
          )}

          {(step === 'measurements' || step === 'goal') && (
            <View className="flex-row gap-3">
              <View className="flex-1">
                <Button variant="secondary" onPress={goBack}>
                  Back
                </Button>
              </View>
              <View className="flex-1">
                <Button onPress={goNext} disabled={step === 'goal' && !goal}>
                  Continue
                </Button>
              </View>
            </View>
          )}

          {step === 'split' && (
            <View className="flex-row gap-3">
              <View className="flex-1">
                <Button variant="secondary" onPress={goBack}>
                  Back
                </Button>
              </View>
              <View className="flex-1">
                <Button onPress={goNext} disabled={!splitType}>
                  Continue
                </Button>
              </View>
            </View>
          )}

          {step === 'review' && (
            <View className="flex-row gap-3">
              <View className="flex-1">
                <Button variant="secondary" onPress={goBack} disabled={saving}>
                  Back
                </Button>
              </View>
              <View className="flex-1">
                <Button onPress={() => finishOnboarding({ withRoutine: true })} disabled={saving}>
                  {saving ? 'Creating...' : 'Create my routine'}
                </Button>
              </View>
            </View>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

function StepDots({ current, total }: { current: number; total: number }) {
  return (
    <View className="flex-row gap-1.5 pt-2">
      {Array.from({ length: total }).map((_, index) => (
        <View
          key={index}
          className={`h-1.5 flex-1 rounded-full ${index <= current ? 'bg-pulse-500' : 'bg-surface-raised'}`}
        />
      ))}
    </View>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-center justify-between border-b border-border py-3">
      <Text className="text-ink-muted">{label}</Text>
      <Text className="font-semibold text-ink">{value}</Text>
    </View>
  );
}
