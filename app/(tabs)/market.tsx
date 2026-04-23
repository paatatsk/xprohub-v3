import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  FlatList, ActivityIndicator, RefreshControl, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Colors, Radius, Spacing } from '../../constants/theme';
import { supabase } from '../../lib/supabase';
import { useTrustLevel } from '../../hooks/useTrustLevel';

// Screen 13 — Live Market
// Step 3B: Jobs Feed wired to Supabase
// Step 3C: category_id URL param → Jobs Feed filter
// Step 5:  Workers Feed wired to Supabase (profiles + worker_skills)
//          Category filter on Workers Feed via task_library.category_id

type Feed = 'jobs' | 'workers';

// ── Types ──────────────────────────────────────────────────────

interface Job {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  budget_min: number | null;
  budget_max: number | null;
  neighborhood: string | null;
  timing: string | null;
  is_urgent: boolean;
  created_at: string;
  customer_id: string;          // needed for job-detail navigation
}

interface Worker {
  id: string;
  full_name: string;
  avatar_url: string | null;
  bio: string | null;
  belt: string | null;       // belt_level — placeholder until belt system wired
  rating: number | null;     // rating_avg — updates via review trigger
  superpowers: string[];     // up to 3 is_featured task names
}

// ── Helpers ────────────────────────────────────────────────────

function timingLabel(timing: string | null): string {
  if (timing === 'asap')      return 'ASAP';
  if (timing === 'scheduled') return 'Scheduled';
  if (timing === 'flexible')  return 'Flexible';
  return '';
}

function budgetLabel(min: number | null, max: number | null): string {
  if (min && max) return `$${min}–$${max}`;
  if (min)        return `From $${min}`;
  if (max)        return `Up to $${max}`;
  return 'Budget TBD';
}

function beltLabel(belt: string | null): string {
  if (!belt) return 'Newcomer';
  return belt.charAt(0).toUpperCase() + belt.slice(1) + ' Belt';
}

// ── Job Card ───────────────────────────────────────────────────

function JobCard({ job, onPress }: { job: Job; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle} numberOfLines={2}>{job.title}</Text>
        {job.is_urgent && (
          <View style={styles.urgentBadge}>
            <Text style={styles.urgentText}>URGENT</Text>
          </View>
        )}
      </View>

      {job.description ? (
        <Text style={styles.cardDesc} numberOfLines={2}>{job.description}</Text>
      ) : null}

      <View style={styles.cardMeta}>
        <Text style={styles.cardBudget}>{budgetLabel(job.budget_min, job.budget_max)}</Text>
        <View style={styles.cardTags}>
          {job.neighborhood ? (
            <Text style={styles.cardTag}>📍 {job.neighborhood}</Text>
          ) : null}
          {job.timing ? (
            <Text style={styles.cardTag}>🕐 {timingLabel(job.timing)}</Text>
          ) : null}
          {job.category ? (
            <Text style={styles.cardTag}>{job.category}</Text>
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ── Worker Card ────────────────────────────────────────────────

function WorkerCard({ worker, onHire }: { worker: Worker; onHire: () => void }) {
  const initials = worker.full_name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <View style={styles.card}>
      <View style={styles.workerRow}>
        {/* Avatar */}
        <View style={styles.avatarWrap}>
          {worker.avatar_url ? (
            <Image source={{ uri: worker.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarInitials}>{initials}</Text>
            </View>
          )}
        </View>

        {/* Info stack */}
        <View style={styles.workerInfo}>
          <Text style={styles.workerName} numberOfLines={1}>{worker.full_name}</Text>
          <Text style={styles.workerBio} numberOfLines={2}>
            {worker.bio ?? 'Worker on XProHub'}
          </Text>

          {/* Superpower chips */}
          {worker.superpowers.length > 0 && (
            <View style={styles.superpowers}>
              {worker.superpowers.map((sp, i) => (
                <View key={i} style={styles.superChip}>
                  <Text style={styles.superChipText} numberOfLines={1}>{sp}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Belt + Rating + Hire row */}
          <View style={styles.workerFooter}>
            <Text style={styles.workerBelt}>{beltLabel(worker.belt)}</Text>
            {worker.rating != null && worker.rating > 0 ? (
              <Text style={styles.workerRating}>★ {worker.rating.toFixed(1)}</Text>
            ) : null}
            <TouchableOpacity
              style={styles.hireBtn}
              activeOpacity={0.8}
              onPress={onHire}
            >
              <Text style={styles.hireBtnText}>Hire Directly</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}

// ── Screen ─────────────────────────────────────────────────────

export default function MarketScreen() {
  const router = useRouter();
  const [activeFeed, setActiveFeed] = useState<Feed>('jobs');
  const { category_id } = useLocalSearchParams<{ category_id?: string }>();
  const { trustLevel } = useTrustLevel();

  // Category filter state (name resolved for display + Jobs Feed .eq())
  const [categoryName, setCategoryName] = useState<string | null>(null);

  // Jobs feed state
  const [jobs, setJobs]             = useState<Job[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]           = useState<string | null>(null);

  // Workers feed state
  const [workers, setWorkers]                     = useState<Worker[]>([]);
  const [workersLoading, setWorkersLoading]       = useState(true);
  const [workersRefreshing, setWorkersRefreshing] = useState(false);
  const [workersError, setWorkersError]           = useState<string | null>(null);

  // Resolve category name from id — used for filter strip label + Jobs Feed .eq()
  useEffect(() => {
    if (!category_id) {
      setCategoryName(null);
      return;
    }
    supabase
      .from('task_categories')
      .select('name')
      .eq('id', Number(category_id))
      .single()
      .then(({ data }) => {
        setCategoryName(data?.name ?? null);
      });
  }, [category_id]);

  // ── Fetch Jobs ───────────────────────────────────────────────

  const fetchJobs = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    let query = supabase
      .from('jobs')
      .select('id, title, description, category, budget_min, budget_max, neighborhood, timing, is_urgent, created_at, customer_id')
      .eq('status', 'open')
      .order('created_at', { ascending: false })
      .limit(50);

    if (categoryName) {
      query = query.eq('category', categoryName);
    }

    const { data, error: err } = await query;

    if (err) setError(err.message);
    else setJobs(data ?? []);

    if (isRefresh) setRefreshing(false);
    else setLoading(false);
  }, [categoryName]);

  useEffect(() => { fetchJobs(); }, [fetchJobs]);

  // ── Fetch Workers ────────────────────────────────────────────
  // RLS confirmed applied: migration 20260419000002_enable_worker_skills_rls.sql
  // worker_skills has public SELECT + self-write policies as of 2026-04-19.

  const fetchWorkers = useCallback(async (isRefresh = false) => {
    if (isRefresh) setWorkersRefreshing(true);
    else setWorkersLoading(true);
    setWorkersError(null);

    // Step 1: if category filter active, resolve task_ids in that category
    let taskIdFilter: number[] | null = null;
    if (category_id) {
      const { data: taskRows } = await supabase
        .from('task_library')
        .select('id')
        .eq('category_id', Number(category_id))
        .eq('is_active', true);
      taskIdFilter = taskRows?.map(r => r.id) ?? [];
      if (taskIdFilter.length === 0) {
        // No tasks exist in this category — no workers to show
        setWorkers([]);
        if (isRefresh) setWorkersRefreshing(false);
        else setWorkersLoading(false);
        return;
      }
    }

    // Step 2: query worker_skills with profile + task name joins.
    // Ordered featured-first so superpowers appear at the head of each
    // worker's rows during client-side aggregation.
    // Limit 300 rows ≈ comfortable for 50–100 workers at current scale.
    let query = supabase
      .from('worker_skills')
      .select(`
        user_id,
        is_featured,
        task_library ( name ),
        profiles ( id, full_name, avatar_url, bio, belt_level, rating_avg, created_at )
      `)
      .order('is_featured', { ascending: false })
      .limit(300);

    if (taskIdFilter !== null) {
      query = query.in('task_id', taskIdFilter);
    }

    const { data: rows, error: err } = await query;

    if (err) {
      setWorkersError(err.message);
    } else {
      // Aggregate by user_id — each worker appears once, superpowers
      // built from the first 3 is_featured rows encountered.
      const workerMap = new Map<string, Worker>();

      for (const row of (rows ?? [])) {
        const profile = row.profiles as {
          id: string;
          full_name: string | null;
          avatar_url: string | null;
          bio: string | null;
          belt_level: string | null;
          rating_avg: number | null;
          created_at: string;
        } | null;

        if (!profile) continue;

        if (!workerMap.has(row.user_id)) {
          workerMap.set(row.user_id, {
            id: profile.id,
            full_name: profile.full_name ?? 'Anonymous',
            avatar_url: profile.avatar_url,
            bio: profile.bio,
            belt: profile.belt_level,
            rating: profile.rating_avg,
            superpowers: [],
          });
        }

        const worker = workerMap.get(row.user_id)!;
        if (row.is_featured && worker.superpowers.length < 3) {
          const tl = row.task_library as { name: string } | null;
          if (tl?.name) worker.superpowers.push(tl.name);
        }
      }

      setWorkers(Array.from(workerMap.values()));
    }

    if (isRefresh) setWorkersRefreshing(false);
    else setWorkersLoading(false);
  }, [category_id]);

  useEffect(() => { fetchWorkers(); }, [fetchWorkers]);

  // ── Clear filter ─────────────────────────────────────────────

  const clearFilter = () => { router.replace('/(tabs)/market'); };

  // ── Filter strip ─────────────────────────────────────────────

  const renderFilterStrip = () => {
    if (!categoryName) return null;
    return (
      <View style={styles.filterStrip}>
        <View style={styles.filterAccent} />
        <Text style={styles.filterText}>Showing: {categoryName}</Text>
        <TouchableOpacity onPress={clearFilter} activeOpacity={0.7}>
          <Text style={styles.filterClear}>Clear</Text>
        </TouchableOpacity>
      </View>
    );
  };

  // ── Render Jobs content ──────────────────────────────────────

  const renderJobsContent = () => {
    if (loading) {
      return (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={Colors.gold} />
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.centerBox}>
          <Text style={styles.emptyIconGlyph}>⚠️</Text>
          <Text style={styles.emptyHeading}>COULDN'T LOAD JOBS</Text>
          <Text style={styles.emptySub}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => fetchJobs()}>
            <Text style={styles.retryText}>TRY AGAIN</Text>
          </TouchableOpacity>
        </View>
      );
    }

    const emptyLabel = categoryName
      ? `No ${categoryName} jobs posted yet`
      : 'Be the first to post a job';

    return (
      <FlatList
        data={jobs}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
            <JobCard
              job={item}
              onPress={() => router.push(`/(tabs)/job-detail?job_id=${item.id}` as any)}
            />
          )}
        contentContainerStyle={jobs.length === 0 ? styles.fillCenter : styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchJobs(true)}
            tintColor={Colors.gold}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyInner}>
            <View style={styles.emptyIconRing}>
              <Text style={styles.emptyIconGlyph}>📋</Text>
            </View>
            <Text style={styles.emptyHeading}>NO JOBS POSTED YET</Text>
            <Text style={styles.emptySub}>{emptyLabel}</Text>
          </View>
        }
      />
    );
  };

  // ── Render Workers content ───────────────────────────────────

  const renderWorkersContent = () => {
    if (workersLoading) {
      return (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={Colors.gold} />
        </View>
      );
    }

    if (workersError) {
      return (
        <View style={styles.centerBox}>
          <Text style={styles.emptyIconGlyph}>⚠️</Text>
          <Text style={styles.emptyHeading}>COULDN'T LOAD WORKERS</Text>
          <Text style={styles.emptySub}>{workersError}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => fetchWorkers()}>
            <Text style={styles.retryText}>TRY AGAIN</Text>
          </TouchableOpacity>
        </View>
      );
    }

    const emptyLabel = categoryName
      ? `No ${categoryName} workers yet`
      : 'Workers joining daily — check back soon';

    return (
      <FlatList
        data={workers}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <WorkerCard
            worker={item}
            onHire={() => {
              const hireDest =
                `/(tabs)/direct-hire?worker_id=${item.id}` +
                `&worker_name=${encodeURIComponent(item.full_name)}`;
              if (trustLevel === 'explorer') {
                router.push(`/(onboarding)/verify-level-2?destination=${encodeURIComponent(hireDest)}`);
              } else {
                router.push(hireDest);
              }
            }}
          />
        )}
        contentContainerStyle={workers.length === 0 ? styles.fillCenter : styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={workersRefreshing}
            onRefresh={() => fetchWorkers(true)}
            tintColor={Colors.gold}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyInner}>
            <View style={styles.emptyIconRing}>
              <Text style={styles.emptyIconGlyph}>👷</Text>
            </View>
            <Text style={styles.emptyHeading}>NO WORKERS LISTED YET</Text>
            <Text style={styles.emptySub}>{emptyLabel}</Text>
          </View>
        }
      />
    );
  };

  // ── JSX ──────────────────────────────────────────────────────

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

      {/* ── Category filter strip — both feeds ── */}
      {renderFilterStrip()}

      {/* ── Feeds ── */}
      {activeFeed === 'jobs'    && renderJobsContent()}
      {activeFeed === 'workers' && renderWorkersContent()}

      {/* ── FAB — Jobs feed only ── */}
      {activeFeed === 'jobs' && (
        <TouchableOpacity
          style={styles.fab}
          activeOpacity={0.85}
          onPress={() => {
            const fabDestination = category_id
              ? `/(tabs)/post?category_id=${category_id}`
              : '/(tabs)/post';
            if (trustLevel === 'explorer') {
              router.push(`/(onboarding)/verify-level-2?destination=${encodeURIComponent(fabDestination)}`);
            } else {
              router.push(fabDestination);
            }
          }}
        >
          <Text style={styles.fabText}>+ POST A JOB</Text>
        </TouchableOpacity>
      )}

    </SafeAreaView>
  );
}

// ── Styles ─────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  // Toggle
  toggleRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: Spacing.lg,
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
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

  // Filter strip
  filterStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    borderRadius: Radius.sm,
    overflow: 'hidden',
    gap: 10,
  },
  filterAccent: {
    width: 3,
    alignSelf: 'stretch',
    backgroundColor: Colors.gold,
  },
  filterText: {
    flex: 1,
    color: Colors.textPrimary,
    fontSize: 13,
    fontWeight: '600',
    paddingVertical: 10,
  },
  filterClear: {
    color: Colors.gold,
    fontSize: 13,
    fontWeight: 'bold',
    paddingVertical: 10,
    paddingRight: 14,
    letterSpacing: 0.5,
  },

  // Layout helpers
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    gap: 16,
  },
  fillCenter: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  listContent: {
    paddingHorizontal: Spacing.md,
    paddingBottom: 100,
  },

  // Empty / error states
  emptyInner: {
    alignItems: 'center',
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
  retryBtn: {
    marginTop: 8,
    borderWidth: 1.5,
    borderColor: Colors.gold,
    borderRadius: Radius.full,
    paddingVertical: 10,
    paddingHorizontal: 28,
  },
  retryText: {
    color: Colors.gold,
    fontWeight: 'bold',
    fontSize: 13,
    letterSpacing: 1.5,
  },

  // Job card (shared base with worker card)
  card: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    gap: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  cardTitle: {
    flex: 1,
    color: Colors.textPrimary,
    fontWeight: 'bold',
    fontSize: 16,
    lineHeight: 22,
  },
  urgentBadge: {
    backgroundColor: Colors.red,
    borderRadius: Radius.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  urgentText: {
    color: Colors.textPrimary,
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  cardDesc: {
    color: Colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  cardMeta: {
    gap: 6,
  },
  cardBudget: {
    color: Colors.gold,
    fontWeight: 'bold',
    fontSize: 15,
  },
  cardTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  cardTag: {
    color: Colors.textSecondary,
    fontSize: 12,
  },

  // Worker card
  workerRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  avatarWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: Colors.gold,
    overflow: 'hidden',
    flexShrink: 0,
  },
  avatar: {
    width: 48,
    height: 48,
  },
  avatarFallback: {
    width: 48,
    height: 48,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    color: Colors.gold,
    fontWeight: 'bold',
    fontSize: 16,
  },
  workerInfo: {
    flex: 1,
    gap: 4,
  },
  workerName: {
    color: Colors.textPrimary,
    fontWeight: 'bold',
    fontSize: 15,
    letterSpacing: 0.3,
  },
  workerBio: {
    color: Colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
  },
  superpowers: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  superChip: {
    borderWidth: 1,
    borderColor: Colors.gold,
    borderRadius: Radius.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  superChipText: {
    color: Colors.gold,
    fontSize: 11,
    fontWeight: '600',
  },
  workerFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  workerBelt: {
    color: Colors.gold,
    fontSize: 12,
    fontWeight: 'bold',
    flex: 1,
  },
  workerRating: {
    color: Colors.textSecondary,
    fontSize: 12,
  },
  hireBtn: {
    borderWidth: 1.5,
    borderColor: Colors.gold,
    borderRadius: Radius.full,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  hireBtnText: {
    color: Colors.gold,
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 0.5,
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
