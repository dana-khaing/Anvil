import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import '@/global.css';

import { AnimatedSplashOverlay } from '@/components/splash-overlay';
import { db } from '@/db/client';
import { useAppBootstrap } from '@/hooks/use-app-bootstrap';
import '@/lib/notifications-background-task';
import { useProfileStore } from '@/stores/profile-store';
import migrations from '../../drizzle/migrations';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { success, error } = useMigrations(db, migrations);
  const profile = useProfileStore((state) => state.profile);
  const ready = useAppBootstrap(success);

  if (error) {
    return (
      <View className="flex-1 items-center justify-center bg-background px-6">
        <Text className="text-center text-danger">Database error: {error.message}</Text>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
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
    </GestureHandlerRootView>
  );
}
