import { useEffect, useState } from 'react';
import { Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAuthStore } from '@/stores/auth-store';
import { useNotificationsStore } from '@/stores/notifications-store';
import { useProfileStore } from '@/stores/profile-store';
import { useSyncStore } from '@/stores/sync-store';

export default function ProfileScreen() {
  const session = useAuthStore((state) => state.session);
  const authChecked = useAuthStore((state) => state.checked);
  const authError = useAuthStore((state) => state.error);
  const authLoading = useAuthStore((state) => state.loading);
  const signUp = useAuthStore((state) => state.signUp);
  const signIn = useAuthStore((state) => state.signIn);
  const signOut = useAuthStore((state) => state.signOut);

  const profile = useProfileStore((state) => state.profile);
  const loadProfile = useProfileStore((state) => state.load);

  const syncStatus = useSyncStore((state) => state.status);
  const lastSyncedAt = useSyncStore((state) => state.lastSyncedAt);
  const syncError = useSyncStore((state) => state.error);
  const sync = useSyncStore((state) => state.sync);

  const notificationsEnabled = useNotificationsStore((state) => state.enabled);
  const notificationsPermission = useNotificationsStore((state) => state.permissionStatus);
  const notificationsLoaded = useNotificationsStore((state) => state.loaded);
  const loadNotifications = useNotificationsStore((state) => state.load);
  const enableNotifications = useNotificationsStore((state) => state.enable);
  const disableNotifications = useNotificationsStore((state) => state.disable);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'signIn' | 'signUp'>('signIn');

  useEffect(() => {
    loadProfile();
    loadNotifications();
  }, [loadProfile, loadNotifications]);

  useEffect(() => {
    if (session) sync(session.user.id);
    // Runs once per session change, not on every sync() identity change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 gap-4 px-6 pb-32 pt-2">
        <Text className="text-4xl font-semibold text-ink">Profile</Text>

        <Card className="gap-1">
          <Text className="text-xs uppercase tracking-wide text-ink-faint">Your stats</Text>
          <Text className="text-ink">
            {profile?.heightCm ? `${profile.heightCm} cm` : 'Height not set'} ·{' '}
            {profile?.weightKg ? `${profile.weightKg} kg` : 'Weight not set'}
          </Text>
          <Text className="text-ink-muted">Goal: {profile?.goal ?? 'Not set'}</Text>
        </Card>

        {notificationsLoaded && (
          <Card className="gap-1">
            <View className="flex-row items-center justify-between">
              <View className="flex-1 pr-3">
                <Text className="text-xs uppercase tracking-wide text-ink-faint">Notifications</Text>
                <Text className="mt-1 text-ink-muted">
                  A daily reminder with a tip, plus a nudge if you&apos;ve been away for a few days.
                </Text>
              </View>
              <Switch
                value={notificationsEnabled}
                onValueChange={(next) => {
                  if (next) enableNotifications();
                  else disableNotifications();
                }}
                trackColor={{ true: '#7C5CFF' }}
              />
            </View>
            {notificationsPermission === 'denied' && (
              <Text className="mt-1 text-sm text-danger">
                Notifications are blocked in iOS Settings — enable them there first.
              </Text>
            )}
          </Card>
        )}

        {!authChecked ? null : session ? (
          <Card className="gap-3">
            <Text className="text-xs uppercase tracking-wide text-ink-faint">Account</Text>
            <Text className="text-ink">{session.user.email}</Text>

            <View className="flex-row items-center justify-between">
              <Text className="text-ink-muted">
                {syncStatus === 'syncing'
                  ? 'Syncing...'
                  : syncStatus === 'error'
                    ? `Sync failed: ${syncError}`
                    : lastSyncedAt
                      ? `Last synced ${new Date(lastSyncedAt).toLocaleTimeString()}`
                      : 'Not synced yet'}
              </Text>
            </View>

            <View className="flex-row gap-3">
              <View className="flex-1">
                <Button
                  variant="secondary"
                  onPress={() => sync(session.user.id)}
                  disabled={syncStatus === 'syncing'}>
                  Sync now
                </Button>
              </View>
              <View className="flex-1">
                <Button variant="ghost" onPress={signOut}>
                  Sign out
                </Button>
              </View>
            </View>
          </Card>
        ) : (
          <Card className="gap-3">
            <Text className="text-xs uppercase tracking-wide text-ink-faint">
              {mode === 'signIn' ? 'Sign in to sync across devices' : 'Create an account'}
            </Text>
            <Text className="text-ink-muted">
              Local-only mode works fully offline. Sign in any time to back up and sync.
            </Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="Email"
              placeholderTextColor="#5B6178"
              autoCapitalize="none"
              keyboardType="email-address"
              accessibilityLabel="Email"
              className="rounded-xl border border-border bg-background px-4 py-3 text-base text-ink"
            />
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Password"
              placeholderTextColor="#5B6178"
              secureTextEntry
              accessibilityLabel="Password"
              className="rounded-xl border border-border bg-background px-4 py-3 text-base text-ink"
            />
            {authError && <Text className="text-sm text-danger">{authError}</Text>}
            <Button
              onPress={() => (mode === 'signIn' ? signIn(email, password) : signUp(email, password))}
              disabled={authLoading || !email || !password}>
              {authLoading ? 'Please wait...' : mode === 'signIn' ? 'Sign in' : 'Sign up'}
            </Button>
            <Button
              variant="ghost"
              onPress={() => setMode(mode === 'signIn' ? 'signUp' : 'signIn')}>
              {mode === 'signIn' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
            </Button>
          </Card>
        )}
      </View>
    </SafeAreaView>
  );
}
