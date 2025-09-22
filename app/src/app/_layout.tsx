import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';

import '@/global.css';

import { AnimatedSplashOverlay } from '@/components/splash-overlay';
import { db } from '@/db/client';
import { seedExerciseLibrary } from '@/db/seed';
import { useAuthStore } from '@/stores/auth-store';
import { useProfileStore } from '@/stores/profile-store';
import migrations from '../../drizzle/migrations';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { success, error } = useMigrations(db, migrations);
  const [seeded, setSeeded] = useState(false);
  const profile = useProfileStore((state) => state.profile);
  const profileChecked = useProfileStore((state) => state.checked);
  const loadProfile = useProfileStore((state) => state.load);
  const authChecked = useAuthStore((state) => state.checked);
  const initAuth = useAuthStore((state) => state.init);

  useEffect(() => {
    if (!success) return;
    seedExerciseLibrary(db).then(() => {
      setSeeded(true);
      loadProfile();
    });
    initAuth();
  }, [success, loadProfile, initAuth]);

  if (error) {
    return (
      <View className="flex-1 items-center justify-center bg-background px-6">
        <Text className="text-center text-danger">Database error: {error.message}</Text>
      </View>
    );
  }

  const ready = success && seeded && profileChecked && authChecked;

  return (
    <ThemeProvider value={DarkTheme}>
      <AnimatedSplashOverlay ready={ready} />
      {ready && (
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Protected guard={profile !== null}>
            <Stack.Screen name="(tabs)" />
          </Stack.Protected>
          <Stack.Protected guard={profile === null}>
            <Stack.Screen name="onboarding" />
          </Stack.Protected>
        </Stack>
      )}
    </ThemeProvider>
  );
}
