import { useEffect, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { colors } from '@/constants/colors';
import { describeAction } from '@/stores/chat-actions';
import {
  buildExerciseCatalogContext,
  buildRoutineContext,
  parseActionPayload,
  type ChatMessage,
  useChatStore,
} from '@/stores/chat-store';
import { useExerciseLibraryStore } from '@/stores/exercise-library-store';
import { useProfileStore } from '@/stores/profile-store';
import { useRoutinesStore } from '@/stores/routines-store';

export default function ChatScreen() {
  const messages = useChatStore((state) => state.messages);
  const loaded = useChatStore((state) => state.loaded);
  const sending = useChatStore((state) => state.sending);
  const error = useChatStore((state) => state.error);
  const load = useChatStore((state) => state.load);
  const send = useChatStore((state) => state.send);

  const profile = useProfileStore((state) => state.profile);
  const loadProfile = useProfileStore((state) => state.load);
  const activeRoutine = useRoutinesStore((state) => state.activeRoutine);
  const days = useRoutinesStore((state) => state.days);
  const loadRoutines = useRoutinesStore((state) => state.load);
  const exerciseCatalog = useExerciseLibraryStore((state) => state.exercises);
  const loadExerciseCatalog = useExerciseLibraryStore((state) => state.load);

  const [draft, setDraft] = useState('');

  useEffect(() => {
    load();
    loadProfile();
    loadRoutines();
    loadExerciseCatalog();
  }, [load, loadProfile, loadRoutines, loadExerciseCatalog]);

  const onSend = () => {
    const context = `${buildRoutineContext(profile, activeRoutine, days)}\n\n${buildExerciseCatalogContext(exerciseCatalog)}`;
    const content = draft;
    setDraft('');
    send(content, context);
  };

  if (!loaded) {
    return <SafeAreaView className="flex-1 bg-background" />;
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={16}>
        <Text className="px-6 pb-2 pt-2 text-4xl font-semibold text-ink">Coach</Text>

        <FlatList
          data={messages}
          keyExtractor={(message) => String(message.id)}
          contentContainerClassName="gap-3 px-6 pb-4"
          ListEmptyComponent={
            <Text className="mt-8 text-center text-ink-muted">
              Ask about your routine, an exercise, or general training questions. Requires a
              connection — everything else in Anvil works offline.
            </Text>
          }
          renderItem={({ item }) => <MessageBubble message={item} />}
        />

        {error && <Text className="px-6 pb-2 text-sm text-danger">{error}</Text>}

        <View className="flex-row items-end gap-3 px-6 pb-32 pt-2">
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Ask your coach..."
            placeholderTextColor={colors.inkFaint}
            multiline
            accessibilityLabel="Message"
            className="max-h-28 flex-1 rounded-xl border border-border bg-surface-raised px-4 py-3 text-base text-ink"
          />
          <Button onPress={onSend} disabled={sending || !draft.trim()}>
            {sending ? '...' : 'Send'}
          </Button>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const ACTION_STATUS_LABEL: Record<'confirmed' | 'declined' | 'failed', string> = {
  confirmed: 'Applied.',
  declined: 'Declined.',
  failed: 'Failed.',
};

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';
  const confirmAction = useChatStore((state) => state.confirmAction);
  const declineAction = useChatStore((state) => state.declineAction);
  const [busy, setBusy] = useState(false);

  // Corrupt/unrecognized payloads fail closed to a plain text bubble rather than a broken card.
  const action = parseActionPayload(message.actionPayload);
  const isPending = action !== null && message.actionStatus === 'pending';

  const onConfirm = async () => {
    setBusy(true);
    await confirmAction(message.id);
    setBusy(false);
  };

  const onDecline = async () => {
    setBusy(true);
    await declineAction(message.id);
    setBusy(false);
  };

  return (
    <View
      accessible
      accessibilityLabel={`${isUser ? 'You' : 'Coach'}: ${message.content}`}
      className={`max-w-[85%] rounded-2xl px-4 py-3 ${isUser ? 'self-end bg-pulse-500' : 'self-start bg-surface-raised'}`}>
      <Text className="text-ink">{message.content}</Text>

      {isPending && (
        <View className="mt-3 gap-2 border-t border-border pt-3">
          <Text className="text-sm text-ink-muted">{describeAction(action)}</Text>
          <View className="flex-row gap-2">
            <View className="flex-1">
              <Button variant="secondary" disabled={busy} onPress={onDecline}>
                Decline
              </Button>
            </View>
            <View className="flex-1">
              <Button disabled={busy} onPress={onConfirm}>
                {busy ? '...' : 'Confirm'}
              </Button>
            </View>
          </View>
        </View>
      )}

      {action && message.actionStatus && message.actionStatus !== 'pending' && (
        <Text className="mt-2 text-xs text-ink-faint">{ACTION_STATUS_LABEL[message.actionStatus]}</Text>
      )}
    </View>
  );
}
