import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, ActivityIndicator, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Colors, Radius, Spacing } from '../../constants/theme';
import { supabase } from '../../lib/supabase';

// Job Detail — full job info + Apply CTA
// Params: job_id (uuid)

interface JobDetail {
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
  customer_id: string | null;
}

interface CustomerProfile {
  full_name: string | null;
  avatar_url: string | null;
}

// ── Helpers ────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const s = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (s < 60)    return 'just now';
  if (s < 3600)  return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function budgetLabel(min: number | null, max: number | null): string {
  if (min && max) return `$${min} – $${max}`;
  if (min)        return `From $${min}`;
  if (max)        return `Up to $${max}`;
  return 'Budget TBD';
}

function timingLabel(timing: string | null): string {
  if (timing === 'asap')      return 'ASAP';
  if (timing === 'scheduled') return 'Scheduled';
  if (timing === 'flexible')  return 'Flexible';
  return '—';
}

// ── Screen ─────────────────────────────────────────────────────

export default function JobDetailScreen() {
  const router     = useRouter();
  const { job_id } = useLocalSearchParams<{ job_id: string }>();

  const [loading, setLoading]               = useState(true);
  const [error, setError]                   = useState<string | null>(null);
  const [job, setJob]                       = useState<JobDetail | null>(null);
  const [customer, setCustomer]             = useState<CustomerProfile | null>(null);
  const [taskNames, setTaskNames]           = useState<string[]>([]);
  const [hasExistingBid, setHasExistingBid] = useState(false);
  const [currentUserId, setCurrentUserId]   = useState<string | null>(null);

  useEffect(() => {
    if (!job_id) {
      setError('No job specified.');
      setLoading(false);
      return;
    }

    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id ?? null);

      // 1 — Load job row
      const { data: jobData, error: jobErr } = await supabase
        .from('jobs')
        .select('id, title, description, category, budget_min, budget_max, neighborhood, timing, is_urgent, created_at, customer_id')
        .eq('id', job_id)
        .single();

      if (jobErr || !jobData) {
        setError('Job not found or no longer available.');
        setLoading(false);
        return;
      }

      setJob(jobData);

      // 2 — Parallel: customer profile + tasks + existing bid
      const [profileRes, tasksRes, bidRes] = await Promise.all([
        jobData.customer_id
          ? supabase
              .from('profiles')
              .select('full_name, avatar_url')
              .eq('id', jobData.customer_id)
              .single()
          : Promise.resolve({ data: null, error: null }),

        supabase
          .from('job_post_tasks')
          .select('task_library(name)')
          .eq('job_post_id', job_id),

        user
          ? supabase
              .from('bids')
              .select('id')
              .eq('job_id', job_id)
              .eq('worker_id', user.id)
              .maybeSingle()
          : Promise.resolve({ data: null, error: null }),
      ]);

      setCustomer((profileRes as any).data ?? null);

      const names: string[] = ((tasksRes.data ?? []) as any[])
        .map(r => r.task_library?.name)
        .filter(Boolean);
      setTaskNames(names);

      setHasExistingBid(!!((bidRes as any).data));
      setLoading(false);
    })();
  }, [job_id]);

  // ── Loading ────────────────────────────────────────────────────

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.gold} />
        </View>
      </SafeAreaView>
    );
  }

  // ── Error ──────────────────────────────────────────────────────

  if (error || !job) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.center}>
          <Text style={styles.emptyGlyph}>⚠️</Text>
          <Text style={styles.emptyHeading}>JOB NOT FOUND</Text>
          <Text style={styles.emptySub}>{error ?? 'This job may have been removed.'}</Text>
          <TouchableOpacity
            style={styles.outlineBtn}
            onPress={() => router.back()}
            activeOpacity={0.8}
          >
            <Text style={styles.outlineBtnText}>GO BACK</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Derived ────────────────────────────────────────────────────

  const isOwnJob       = !!job.customer_id && !!currentUserId && job.customer_id === currentUserId;
  const customerName   = customer?.full_name ?? 'Anonymous';
  const customerAvatar = customer?.avatar_url ?? null;
  const initials       = customerName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  // ── JSX ────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >

        {/* ── Posted by strip ── */}
        <View style={styles.postedByRow}>
          <View style={styles.avatarWrap}>
            {customerAvatar ? (
              <Image source={{ uri: customerAvatar }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarInitials}>{initials}</Text>
              </View>
            )}
          </View>
          <View style={styles.postedByInfo}>
            <Text style={styles.postedByEyebrow}>POSTED BY</Text>
            <Text style={styles.postedByName} numberOfLines={1}>{customerName}</Text>
            <Text style={styles.postedByTime}>{timeAgo(job.created_at)}</Text>
          </View>
        </View>

        {/* ── Title ── */}
        <Text style={styles.title}>{job.title}</Text>

        {/* ── Category pill + urgent badge ── */}
        <View style={styles.pillRow}>
          {job.category ? (
            <View style={styles.categoryPill}>
              <Text style={styles.categoryPillText}>{job.category.toUpperCase()}</Text>
            </View>
          ) : null}
          {job.is_urgent && (
            <View style={styles.urgentPill}>
              <Text style={styles.urgentPillText}>URGENT</Text>
            </View>
          )}
        </View>

        {/* ── Budget ── */}
        <Text style={styles.budget}>{budgetLabel(job.budget_min, job.budget_max)}</Text>

        {/* ── Description ── */}
        {job.description ? (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>DESCRIPTION</Text>
            <Text style={styles.descText}>{job.description}</Text>
          </View>
        ) : null}

        {/* ── Tasks ── */}
        {taskNames.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>TASKS</Text>
            <View style={styles.chipRow}>
              {taskNames.map((name, i) => (
                <View key={i} style={styles.taskChip}>
                  <Text style={styles.taskChipText}>{name}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ── Details ── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>DETAILS</Text>
          {job.neighborhood ? (
            <Text style={styles.detailRow}>📍  {job.neighborhood}</Text>
          ) : null}
          {job.timing ? (
            <Text style={styles.detailRow}>⏰  {timingLabel(job.timing)}</Text>
          ) : null}
        </View>

      </ScrollView>

      {/* ── CTA footer ── */}
      <View style={styles.footer}>
        {isOwnJob ? (
          <Text style={styles.ownJobText}>This is your job post</Text>
        ) : hasExistingBid ? (
          <View style={[styles.applyBtn, styles.applyBtnSent]}>
            <Text style={styles.applyBtnSentText}>✓  APPLICATION SENT</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.applyBtn}
            activeOpacity={0.85}
            onPress={() => router.push(`/(tabs)/apply?job_id=${job.id}` as any)}
          >
            <Text style={styles.applyBtnText}>APPLY FOR THIS JOB</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

// ── Styles ─────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container:     { flex: 1, backgroundColor: Colors.background },
  scroll:        { flex: 1 },
  scrollContent: { padding: Spacing.md, paddingBottom: Spacing.lg },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    padding: Spacing.xl,
  },

  // Error / empty states
  emptyGlyph: { fontSize: 40 },
  emptyHeading: {
    color: Colors.textPrimary,
    fontWeight: 'bold',
    fontSize: 18,
    letterSpacing: 1.5,
  },
  emptySub: {
    color: Colors.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
  },
  outlineBtn: {
    borderWidth: 1.5,
    borderColor: Colors.gold,
    borderRadius: Radius.full,
    paddingVertical: 10,
    paddingHorizontal: 28,
  },
  outlineBtnText: {
    color: Colors.gold,
    fontWeight: 'bold',
    fontSize: 13,
    letterSpacing: 1.5,
  },

  // Posted by strip
  postedByRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  avatarWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: Colors.gold,
    overflow: 'hidden',
    flexShrink: 0,
  },
  avatar:         { width: 44, height: 44 },
  avatarFallback: {
    width: 44,
    height: 44,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials:  { color: Colors.gold, fontWeight: 'bold', fontSize: 15 },
  postedByInfo:    { flex: 1 },
  postedByEyebrow: {
    color: Colors.gold,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2.5,
    marginBottom: 2,
  },
  postedByName: {
    color: Colors.textPrimary,
    fontWeight: 'bold',
    fontSize: 14,
  },
  postedByTime: { color: Colors.textSecondary, fontSize: 12, marginTop: 2 },

  // Title
  title: {
    color: Colors.textPrimary,
    fontWeight: 'bold',
    fontSize: 24,
    lineHeight: 30,
    marginBottom: Spacing.sm,
  },

  // Pills row
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: Spacing.md,
  },
  categoryPill: {
    borderWidth: 1.5,
    borderColor: Colors.gold,
    borderRadius: Radius.full,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  categoryPillText: {
    color: Colors.gold,
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  urgentPill: {
    borderWidth: 1.5,
    borderColor: Colors.red,
    borderRadius: Radius.full,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  urgentPillText: {
    color: Colors.red,
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 1,
  },

  // Budget
  budget: {
    color: Colors.gold,
    fontWeight: 'bold',
    fontSize: 26,
    marginBottom: Spacing.lg,
    letterSpacing: 0.5,
  },

  // Sections
  section:      { marginBottom: Spacing.lg },
  sectionLabel: {
    color: Colors.textSecondary,
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 2,
    marginBottom: 8,
  },
  descText: {
    color: Colors.textPrimary,
    fontSize: 14,
    lineHeight: 21,
  },

  // Task chips
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  taskChip: {
    borderWidth: 1,
    borderColor: Colors.gold,
    borderRadius: Radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  taskChipText: { color: Colors.gold, fontSize: 12, fontWeight: '600' },

  // Details
  detailRow: {
    color: Colors.textSecondary,
    fontSize: 14,
    marginBottom: 6,
    lineHeight: 20,
  },

  // Footer CTA
  footer: {
    padding: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.background,
  },
  applyBtn: {
    backgroundColor: Colors.gold,
    borderRadius: Radius.md,
    paddingVertical: 16,
    alignItems: 'center',
  },
  applyBtnSent: {
    backgroundColor: Colors.card,
    borderWidth: 1.5,
    borderColor: Colors.green,
  },
  applyBtnText:     { color: Colors.background, fontWeight: 'bold', fontSize: 14, letterSpacing: 2 },
  applyBtnSentText: { color: Colors.green,      fontWeight: 'bold', fontSize: 14, letterSpacing: 1.5 },
  ownJobText: {
    color: Colors.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 14,
    fontStyle: 'italic',
  },
});
