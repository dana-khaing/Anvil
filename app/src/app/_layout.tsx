import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { AppState, Text, View } from 'react-native';

import '@/global.css';

import { AnimatedSplashOverlay } from '@/components/splash-overlay';
import { db } from '@/db/client';
import { seedExerciseLibrary } from '@/db/seed';
import { useAuthStore } from '@/stores/auth-store';
import { useNotificationsStore } from '@/stores/notifications-store';
import { useProfileStore } from '@/stores/profile-store';
import { useSyncStore } from '@/stores/sync-store';
import migrations from '../../drizzle/migrations';

// Continuous-sync cadence (Day 30) while the app is foregrounded -- a
// periodic pull catches changes made on another device without requiring
// this device to background/foreground first. Deliberately not shorter:
// this is a solo user's own handful of devices, not a live collaborative
// surface, so a few minutes of staleness is an acceptable tradeoff against
// hammering the database on every screen visit.
const SYNC_INTERVAL_MS = 5 * 60 * 1000;

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { success, error } = useMigrations(db, migrations);
  const [seeded, setSeeded] = useState(false);
  const profile = useProfileStore((state) => state.profile);
  const profileChecked = useProfileStore((state) => state.checked);
  const loadProfile = useProfileStore((state) => state.load);
  const authChecked = useAuthStore((state) => state.checked);
  const initAuth = useAuthStore((state) => state.init);
  const session = useAuthStore((state) => state.session);
  const loadNotifications = useNotificationsStore((state) => state.load);
  const sync = useSyncStore((state) => state.sync);

  useEffect(() => {
    if (!success) return;
    seedExerciseLibrary(db).then(() => {
      setSeeded(true);
      loadProfile();
    });
    initAuth();
    // Best-effort: re-tops the daily-reminder queue if notifications are
    // already enabled. Not part of the `ready` gate below -- a native
    // scheduling round-trip shouldn't hold up the rest of the app.
    loadNotifications();
  }, [success, loadProfile, initAuth, loadNotifications]);

  useEffect(() => {
    if (!success || !session) return;

    sync(session.user.id);

    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') sync(session.user.id);
    });
    const interval = setInterval(() => sync(session.user.id), SYNC_INTERVAL_MS);

    return () => {
      subscription.remove();
      clearInterval(interval);
    };
  }, [success, session, sync]);

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
