import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors, Radius, Spacing } from '../../constants/theme';

// Screen 13 — Live Market
// Two-feed toggle: Jobs Feed | Workers Feed
// Step 3A: visual shell + toggle + empty states. No data yet.
// TODO Step 3B: pull Jobs from Supabase jobs table (sorted by recency)
// TODO Step 3B: pull Workers from profiles + worker_skills (business card wall)
// TODO Step 3B: category_id query param → filter both feeds

type Feed = 'jobs' | 'workers';

export default function MarketScreen() {
  const router = useRouter();
  const [activeFeed, setActiveFeed] = useState<Feed>('jobs');

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>

      {/* ── Toggle ── */}
      <View style={styles.toggleRow}>
        <TouchableOpacity
          style={[styles.toggleBtn, activeFeed === 'jobs' && styles.toggleBtnActive]}
          onPress={() => setActiveFeed('jobs')}
          activeOpacity={0.8}
        >
          <Text style={[styles.toggleText, activeFeed === 'jobs' && styles.toggleTextActive]}>
            JOBS
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.toggleBtn, activeFeed === 'workers' && styles.toggleBtnActive]}
          onPress={() => setActiveFeed('workers')}
          activeOpacity={0.8}
        >
          <Text style={[styles.toggleText, activeFeed === 'workers' && styles.toggleTextActive]}>
            WORKERS
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── Empty state ── */}
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIconRing}>
          <Text style={styles.emptyIconGlyph}>
            {activeFeed === 'jobs' ? '📋' : '👷'}
          </Text>
        </View>
        <Text style={styles.emptyHeading}>
          {activeFeed === 'jobs' ? 'NO JOBS POSTED YET' : 'NO WORKERS LISTED YET'}
        </Text>
        <Text style={styles.emptySub}>
          {activeFeed === 'jobs'
            ? 'Be the first to post a job'
            : 'Check back soon — workers joining daily'}
        </Text>
      </View>

      {/* ── FAB — Jobs feed only ── */}
      {activeFeed === 'jobs' && (
        <TouchableOpacity
          style={styles.fab}
          activeOpacity={0.85}
          onPress={() => {
            // TODO: gate check → Level 2 gate → Post a Job flow
          }}
        >
          <Text style={styles.fabText}>+ POST A JOB</Text>
        </TouchableOpacity>
      )}

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  // Toggle
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginTop: Spacing.lg,
    marginHorizontal: Spacing.md,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: Spacing.xl,
    borderRadius: Radius.full,
    borderWidth: 1.5,
    borderColor: Colors.gold,
    alignItems: 'center',
  },
  toggleBtnActive: {
    backgroundColor: Colors.gold,
  },
  toggleText: {
    color: Colors.gold,
    fontWeight: 'bold',
    fontSize: 13,
    letterSpacing: 1.5,
  },
  toggleTextActive: {
    color: Colors.background,
  },

  // Empty state
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    gap: 16,
  },
  emptyIconRing: {
    width: 88,
    height: 88,
    borderRadius: Radius.full,
    borderWidth: 2,
    borderColor: Colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyIconGlyph: {
    fontSize: 36,
  },
  emptyHeading: {
    color: Colors.textPrimary,
    fontWeight: 'bold',
    fontSize: 18,
    letterSpacing: 1.5,
    textAlign: 'center',
  },
  emptySub: {
    color: Colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },

  // FAB
  fab: {
    position: 'absolute',
    bottom: 28,
    right: 20,
    backgroundColor: Colors.gold,
    borderRadius: Radius.full,
    paddingVertical: 14,
    paddingHorizontal: 22,
  },
  fabText: {
    color: Colors.background,
    fontWeight: 'bold',
    fontSize: 13,
    letterSpacing: 1,
  },
});
