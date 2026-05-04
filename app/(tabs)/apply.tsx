import { useState, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, TextInput, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Colors, Radius, Spacing } from '../../constants/theme';
import { supabase } from '../../lib/supabase';
import { useStripeStatus } from '../../hooks/useStripeStatus';

// Apply — worker submits a bid on a job
// Params: job_id (uuid)
// Flow: bids INSERT (no chat yet — chat opens on acceptance, Option B)

type MessageMode = 0 | 1 | 2 | 'custom';

interface ApplyJob {
  id: string;
  title: string;
  category: string | null;
  budget_min: number | null;
  budget_max: number | null;
  timing: string | null;
  customer_id: string | null;
}

interface WorkerProfile {
  full_name: string | null;
  belt_level: string | null;
}

// Compute final message from mode selection
function resolveFinalMessage(
  mode: MessageMode | null,
  templates: [string, string, string],
  custom: string,
): string {
  if (mode === null)     return '';
  if (mode === 'custom') return custom.trim();
  return templates[mode];
}

// ── Screen ─────────────────────────────────────────────────────

export default function ApplyScreen() {
  const router     = useRouter();
  const { job_id } = useLocalSearchParams<{ job_id: string }>();
  const { chargesEnabled, loading: stripeLoading } = useStripeStatus();

  // Data
  const [loading, setLoading]               = useState(true);
  const [loadError, setLoadError]           = useState<string | null>(null);
  const [job, setJob]                       = useState<ApplyJob | null>(null);
  const [workerProfile, setWorkerProfile]   = useState<WorkerProfile | null>(null);
  const [firstTaskName, setFirstTaskName]   = useState<string | null>(null);
  const [alreadyApplied, setAlreadyApplied] = useState(false);
  const [isOwnJob, setIsOwnJob]             = useState(false);

  // Form state
  const [messageMode, setMessageMode]     = useState<MessageMode | null>(null);
  const [customText, setCustomText]       = useState('');
  const [proposedPrice, setProposedPrice] = useState('');

  // Submit state
  const [submitting, setSubmitting]   = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // ── Load ──────────────────────────────────────────────────────

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setLoadError('Session expired. Please sign in again.');
        setLoading(false);
        return;
      }

      if (!job_id) {
        setLoadError('No job specified.');
        setLoading(false);
        return;
      }

      const [jobRes, profileRes, tasksRes, bidRes] = await Promise.all([
        supabase
          .from('jobs')
          .select('id, title, category, budget_min, budget_max, timing, customer_id')
          .eq('id', job_id)
          .single(),
        supabase
          .from('profiles')
          .select('full_name, belt_level')
          .eq('id', user.id)
          .single(),
        supabase
          .from('job_post_tasks')
          .select('task_library(name)')
          .eq('job_post_id', job_id)
          .limit(1),
        supabase
          .from('bids')
          .select('id')
          .eq('job_id', job_id)
          .eq('worker_id', user.id)
          .maybeSingle(),
      ]);

      if (jobRes.error || !jobRes.data) {
        setLoadError('Job not found.');
        setLoading(false);
        return;
      }

      setJob(jobRes.data);
      setWorkerProfile(profileRes.data ?? null);
      setFirstTaskName(
        (tasksRes.data?.[0] as any)?.task_library?.name ?? jobRes.data.category ?? null
      );
      setAlreadyApplied(!!bidRes.data);
      setIsOwnJob(jobRes.data.customer_id === user.id);
      setLoading(false);
    })();
  }, [job_id]);

  // ── Templates (derived) ────────────────────────────────────────

  const templates: [string, string, string] = useMemo(() => {
    if (!job) return ['', '', ''];
    const timingStr =
      job.timing === 'asap'      ? 'today' :
      job.timing === 'scheduled' ? 'on your schedule' :
                                   'whenever works for you';
    const beltLevel = workerProfile?.belt_level ?? null;
    const beltCtx   = beltLevel && beltLevel !== 'white'
      ? `${beltLevel.charAt(0).toUpperCase() + beltLevel.slice(1)} belt — `
      : '';
    const task = firstTaskName ?? 'this type of job';

    return [
      `Hi! I've worked on ${task} jobs before. ${beltCtx}Ready to do yours well, ${timingStr}.`,
      `Hi! I'm available ${timingStr} for your ${task} job. I take care with details and communicate clearly.`,
      `Interested in your ${task} job. ${beltCtx}Let me know when works for you.`,
    ];
  }, [job, workerProfile, firstTaskName]);

  // ── Derived submit state ───────────────────────────────────────

  const finalMessage     = resolveFinalMessage(messageMode, templates, customText);
  const priceNum         = parseFloat(proposedPrice);
  const isSubmitDisabled = submitting
    || !finalMessage
    || !proposedPrice
    || isNaN(priceNum)
    || priceNum <= 0;

  const showBudgetWarning = (
    proposedPrice.length > 0 &&
    !isNaN(priceNum) && priceNum > 0 &&
    job?.budget_min != null && job?.budget_max != null &&
    (priceNum < job.budget_min || priceNum > job.budget_max)
  );

  const budgetHint = job
    ? (job.budget_min && job.budget_max)
      ? `Customer budget: $${job.budget_min} – $${job.budget_max}`
      : (job.budget_min || job.budget_max)
        ? `Customer budget: ${job.budget_min ? `from $${job.budget_min}` : `up to $${job.budget_max}`}`
        : 'Customer: open budget'
    : '';

  // ── Submit ─────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!finalMessage) { setSubmitError('Please select or write a message.'); return; }
    if (!proposedPrice || isNaN(priceNum) || priceNum <= 0) {
      setSubmitError('Please enter a valid price greater than $0.');
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSubmitError('Session expired. Please sign in again.'); return; }

    // Stripe gate — worker must have charges enabled to apply
    if (!stripeLoading && !chargesEnabled) {
      router.push(
        `/(tabs)/stripe-connect?returnTo=${encodeURIComponent(`/(tabs)/apply?job_id=${job_id}`)}` as any
      );
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    const { error: bidErr } = await supabase
      .from('bids')
      .insert({
        job_id,
        worker_id:      user.id,
        proposed_price: priceNum,
        message:        finalMessage,
        status:         'pending',
      });

    setSubmitting(false);

    if (bidErr) {
      // 23505 = unique_violation — already applied
      if ((bidErr as any).code === '23505') {
        setSubmitError("You've already applied to this job.");
      } else {
        setSubmitError(bidErr.message ?? 'Failed to submit application. Please try again.');
      }
      return;
    }

    router.replace(`/(tabs)/apply-success?job_id=${job_id}` as any);
  };

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

  // ── Load error ─────────────────────────────────────────────────

  if (loadError || !job) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.center}>
          <Text style={styles.gateGlyph}>⚠️</Text>
          <Text style={styles.gateHeading}>UNABLE TO LOAD</Text>
          <Text style={styles.gateSub}>{loadError ?? 'Something went wrong.'}</Text>
          <TouchableOpacity style={styles.outlineBtn} onPress={() => router.back()} activeOpacity={0.8}>
            <Text style={styles.outlineBtnText}>GO BACK</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Guard: own job ─────────────────────────────────────────────

  if (isOwnJob) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.center}>
          <Text style={styles.gateGlyph}>🚧</Text>
          <Text style={styles.gateHeading}>YOUR OWN JOB</Text>
          <Text style={styles.gateSub}>You can't apply to a job you posted.</Text>
          <TouchableOpacity style={styles.outlineBtn} onPress={() => router.back()} activeOpacity={0.8}>
            <Text style={styles.outlineBtnText}>GO BACK</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Guard: already applied ─────────────────────────────────────

  if (alreadyApplied) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.center}>
          <Text style={styles.gateGlyph}>✓</Text>
          <Text style={styles.gateHeading}>ALREADY APPLIED</Text>
          <Text style={styles.gateSub}>
            You've already submitted an application for this job.
            You'll be notified when the customer responds.
          </Text>
          <TouchableOpacity style={styles.outlineBtn} onPress={() => router.back()} activeOpacity={0.8}>
            <Text style={styles.outlineBtnText}>GO BACK</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Form ───────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >

        {/* ── 1. Job context strip ── */}
        <View style={styles.jobContextCard}>
          <Text style={styles.jobContextEyebrow}>APPLYING FOR</Text>
          <Text style={styles.jobContextTitle} numberOfLines={2}>{job.title}</Text>
          <View style={styles.jobContextMeta}>
            {(job.budget_min || job.budget_max) ? (
              <Text style={styles.jobContextBudget}>
                {job.budget_min && job.budget_max
                  ? `$${job.budget_min} – $${job.budget_max}`
                  : job.budget_min ? `From $${job.budget_min}` : `Up to $${job.budget_max}`}
              </Text>
            ) : null}
            {job.category ? (
              <View style={styles.contextPill}>
                <Text style={styles.contextPillText}>{job.category.toUpperCase()}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* ── 2. Your message ── */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>
            YOUR MESSAGE <Text style={styles.required}>*</Text>
          </Text>
          <Text style={styles.fieldHint}>Tap a ready message or write your own.</Text>

          {/* Template cards */}
          {([0, 1, 2] as const).map(i => {
            const isSelected = messageMode === i;
            const isDimmed   = messageMode === 'custom';
            return (
              <TouchableOpacity
                key={i}
                style={[
                  styles.templateCard,
                  isSelected && styles.templateCardActive,
                  isDimmed   && styles.templateCardDim,
                ]}
                onPress={() => setMessageMode(i)}
                activeOpacity={0.8}
              >
                <Text style={[styles.templateText, isSelected && styles.templateTextActive]}>
                  {templates[i]}
                </Text>
              </TouchableOpacity>
            );
          })}

          {/* Write my own */}
          <TouchableOpacity
            style={[
              styles.templateCard,
              styles.writeOwnCard,
              messageMode === 'custom' && styles.templateCardActive,
            ]}
            onPress={() => setMessageMode('custom')}
            activeOpacity={0.8}
          >
            <Text style={[styles.writeOwnText, messageMode === 'custom' && styles.templateTextActive]}>
              WRITE MY OWN
            </Text>
          </TouchableOpacity>

          {/* Custom TextInput — expands when write-my-own selected */}
          {messageMode === 'custom' && (
            <View style={styles.customInputWrap}>
              <TextInput
                style={[styles.input, styles.inputMultiline]}
                placeholder="Write your message to the customer..."
                placeholderTextColor={Colors.textSecondary}
                value={customText}
                onChangeText={t => setCustomText(t.slice(0, 500))}
                multiline
                numberOfLines={4}
                maxLength={500}
                autoFocus
              />
              <Text style={[styles.charCount, { textAlign: 'right' }]}>
                {customText.length}/500
              </Text>
            </View>
          )}
        </View>

        {/* ── 3. Proposed price ── */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>
            YOUR PRICE <Text style={styles.required}>*</Text>
          </Text>
          <Text style={styles.fieldHint}>{budgetHint}</Text>
          <View style={styles.priceInputRow}>
            <Text style={styles.priceDollar}>$</Text>
            <TextInput
              style={[styles.input, styles.priceInput]}
              placeholder="0"
              placeholderTextColor={Colors.textSecondary}
              value={proposedPrice}
              onChangeText={t => { setProposedPrice(t); setSubmitError(null); }}
              keyboardType="numeric"
            />
          </View>
          {showBudgetWarning && (
            <Text style={styles.budgetWarn}>
              ⚠ Outside customer's budget range.
            </Text>
          )}
        </View>

        {/* ── Submit error ── */}
        {submitError ? (
          <Text style={styles.submitError}>{submitError}</Text>
        ) : null}

        {/* ── Submit ── */}
        <TouchableOpacity
          style={[styles.submitBtn, isSubmitDisabled && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={isSubmitDisabled}
          activeOpacity={0.85}
        >
          {submitting
            ? <ActivityIndicator color={Colors.background} />
            : <Text style={styles.submitText}>SUBMIT APPLICATION</Text>}
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ─────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container:     { flex: 1, backgroundColor: Colors.background },
  scroll:        { flex: 1 },
  scrollContent: { padding: Spacing.md, paddingBottom: Spacing.xxl },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    padding: Spacing.xl,
  },

  // Gate screens
  gateGlyph: { fontSize: 44, marginBottom: 4 },
  gateHeading: {
    color: Colors.textPrimary,
    fontWeight: 'bold',
    fontSize: 18,
    letterSpacing: 1.5,
    textAlign: 'center',
  },
  gateSub: {
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
    marginTop: 4,
  },
  outlineBtnText: {
    color: Colors.gold,
    fontWeight: 'bold',
    fontSize: 13,
    letterSpacing: 1.5,
  },

  // Job context card
  jobContextCard: {
    backgroundColor: Colors.card,
    borderWidth: 1.5,
    borderColor: Colors.gold,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    gap: 6,
  },
  jobContextEyebrow: {
    color: Colors.gold,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 3,
  },
  jobContextTitle: {
    color: Colors.textPrimary,
    fontWeight: 'bold',
    fontSize: 16,
    lineHeight: 22,
  },
  jobContextMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  jobContextBudget: {
    color: Colors.gold,
    fontWeight: 'bold',
    fontSize: 14,
  },
  contextPill: {
    borderWidth: 1,
    borderColor: Colors.gold,
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  contextPillText: {
    color: Colors.gold,
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1,
  },

  // Field group
  fieldGroup: { marginBottom: Spacing.lg },
  label: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  fieldHint: {
    color: Colors.textSecondary,
    fontSize: 12,
    marginBottom: 12,
  },
  required: { color: Colors.red },

  // Template cards
  templateCard: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: 8,
  },
  templateCardActive: {
    borderColor: Colors.gold,
    backgroundColor: Colors.gold + '18',
  },
  templateCardDim: { opacity: 0.45 },
  templateText: {
    color: Colors.textPrimary,
    fontSize: 13,
    lineHeight: 19,
  },
  templateTextActive: { color: Colors.gold },

  // Write my own
  writeOwnCard: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  writeOwnText: {
    color: Colors.textSecondary,
    fontWeight: 'bold',
    fontSize: 12,
    letterSpacing: 1.5,
  },

  // Custom input
  customInputWrap: { marginTop: 4 },
  input: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    color: Colors.textPrimary,
    fontSize: 15,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
  },
  inputMultiline: { minHeight: 100, textAlignVertical: 'top', paddingTop: 12 },
  charCount:      { color: Colors.textSecondary, fontSize: 11, marginTop: 4 },

  // Price field
  priceInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  priceDollar: {
    color: Colors.gold,
    fontSize: 22,
    fontWeight: 'bold',
    lineHeight: 28,
  },
  priceInput: { flex: 1 },
  budgetWarn: {
    color: '#E5901A',   // amber — soft warning, not an error
    fontSize: 12,
    marginTop: 6,
  },

  // Submit
  submitBtn: {
    backgroundColor: Colors.gold,
    borderRadius: Radius.md,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  submitBtnDisabled: { opacity: 0.5 },
  submitText: {
    color: Colors.background,
    fontWeight: 'bold',
    fontSize: 15,
    letterSpacing: 2,
  },
  submitError: {
    color: Colors.red,
    fontSize: 13,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
});
