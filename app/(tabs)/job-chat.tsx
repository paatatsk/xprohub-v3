import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { Colors, Radius, Spacing } from '../../constants/theme';

// Job Chat — placeholder screen after Direct Hire request is sent
// Params: chat_id, worker_name, first_message
// TODO: full Supabase Realtime chat UI (messages table, live subscription)

export default function JobChatScreen() {
  const { worker_name, first_message } = useLocalSearchParams<{
    chat_id?:      string;
    worker_name?:  string;
    first_message?: string;
  }>();

  const displayName = worker_name ?? 'Worker';

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.inner}>

        {/* ── Header ── */}
        <Text style={styles.heading}>CHAT</Text>
        <Text style={styles.subhead}>Conversation with {displayName}</Text>

        {/* ── First message bubble ── */}
        {first_message ? (
          <View style={styles.bubbleWrap}>
            <View style={styles.bubble}>
              <Text style={styles.bubbleSender}>YOU</Text>
              <Text style={styles.bubbleText}>{first_message}</Text>
            </View>
          </View>
        ) : null}

        {/* ── Placeholder notice ── */}
        <View style={styles.todoCard}>
          <Text style={styles.todoIcon}>✉️</Text>
          <Text style={styles.todoText}>
            Your request has been sent to {displayName}.
            Full chat UI coming in a later step.
          </Text>
        </View>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  inner: {
    flex: 1,
    padding: Spacing.md,
  },

  heading: {
    color: Colors.gold,
    fontSize: 28,
    fontWeight: 'bold',
    letterSpacing: 2,
    marginBottom: 4,
  },
  subhead: {
    color: Colors.textSecondary,
    fontSize: 13,
    marginBottom: Spacing.lg,
  },

  // Message bubble (customer's sent message)
  bubbleWrap: {
    alignItems: 'flex-end',
    marginBottom: Spacing.md,
  },
  bubble: {
    backgroundColor: Colors.gold + '22',
    borderWidth: 1,
    borderColor: Colors.gold,
    borderRadius: Radius.md,
    borderBottomRightRadius: 4,
    padding: Spacing.md,
    maxWidth: '80%',
    gap: 4,
  },
  bubbleSender: {
    color: Colors.gold,
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1.5,
  },
  bubbleText: {
    color: Colors.textPrimary,
    fontSize: 14,
    lineHeight: 20,
  },

  // Placeholder notice
  todoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginTop: Spacing.lg,
  },
  todoIcon: { fontSize: 20 },
  todoText: {
    flex: 1,
    color: Colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
  },
});
