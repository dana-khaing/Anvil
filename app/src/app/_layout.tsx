import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';

import '@/global.css';

import { AnimatedSplashOverlay } from '@/components/splash-overlay';
import { db } from '@/db/client';
import { seedExerciseLibrary } from '@/db/seed';
import migrations from '../../drizzle/migrations';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { success, error } = useMigrations(db, migrations);
  const [seeded, setSeeded] = useState(false);

  useEffect(() => {
    if (!success) return;
    seedExerciseLibrary(db).then(() => setSeeded(true));
  }, [success]);

  if (error) {
    return (
      <View className="flex-1 items-center justify-center bg-background px-6">
        <Text className="text-center text-danger">Database error: {error.message}</Text>
      </View>
    );
  }

  return (
    <ThemeProvider value={DarkTheme}>
      <AnimatedSplashOverlay ready={success && seeded} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
      </Stack>
    </ThemeProvider>
  );
}
