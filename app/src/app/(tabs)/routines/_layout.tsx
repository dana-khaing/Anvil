import { Stack } from 'expo-router';

export default function RoutinesStackLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="[dayId]" />
      <Stack.Screen name="exercise-form" options={{ presentation: 'modal' }} />
    </Stack>
  );
}
