import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, TextInput, ActivityIndicator, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Colors, Radius, Spacing } from '../../constants/theme';
import { supabase } from '../../lib/supabase';
import { useTrustLevel } from '../../hooks/useTrustLevel';

// Direct Hire v2 — launched from Workers Feed "Hire Directly" button
// Params: worker_id (uuid), worker_name (display string)
// Full job form pre-targeted at a specific worker.
// Backend: jobs INSERT (status=matched, worker_id set) → job_post_tasks
//          → chats → messages → job-chat placeholder

type Timing = 'asap' | 'scheduled' | 'flexible';

interface WorkerSkill {
  task_id:       number;
  task_name:     string;
  price_min:     number;
  price_max:     number;
  is_featured:   boolean;
  category_name: string | null;
}

interface FormErrors {
  title?:        string;
  neighborhood?: string;
  tasks?:        string;
  budget?:       string;
}

export default function DirectHireScreen() {
  const router = useRouter();
  const { worker_id, worker_name } = useLocalSearchParams<{
    worker_id:   string;
    worker_name: string;
  }>();

  const { trustLevel } = useTrustLevel();

  // Worker data
  const [avatarUrl, setAvatarUrl]     = useState<string | null>(null);
  const [skills, setSkills]           = useState<WorkerSkill[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  // Form state
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<number>>(new Set());
  const [title, setTitle]               = useState('');
  const [description, setDescription]   = useState('');
  const [budgetMin, setBudgetMin]       = useState('');
  const [budgetMax, setBudgetMax]       = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [timing, setTiming]             = useState<Timing>('flexible');
  const [isUrgent, setIsUrgent]         = useState(false);

  // UI state
  const [errors, setErrors]           = useState<FormErrors>({});
  const [submitting, setSubmitting]   = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // ── Load worker profile + skills ──────────────────────────────

  useEffect(() => {
    if (!worker_id) return;

    Promise.all([
      supabase
        .from('profiles')
        .select('avatar_url')
        .eq('id', worker_id)
        .single(),
      supabase
        .from('worker_skills')
        .select('task_id, is_featured, task_library ( name, price_min, price_max, task_categories ( name ) )')
        .eq('user_id', worker_id)
        .order('is_featured', { ascending: false }),
    ]).then(([profileRes, skillsRes]) => {
      if (profileRes.data) {
        setAvatarUrl(profileRes.data.avatar_url);
      }
      if (skillsRes.data) {
        const mapped: WorkerSkill[] = (skillsRes.data as any[])
          .map(row => ({
            task_id:       row.task_id,
            task_name:     row.task_library?.name                  ?? '',
            price_min:     row.task_library?.price_min             ?? 0,
            price_max:     row.task_library?.price_max             ?? 0,
            is_featured:   row.is_featured                         ?? false,
            category_name: row.task_library?.task_categories?.name ?? null,
          }))
          .filter(s => s.task_name !== '');
        setSkills(mapped);
      }
      setDataLoading(false);
    });
  }, [worker_id]);

  // ── Form helpers ──────────────────────────────────────────────

  const toggleTask = useCallback((id: number) => {
    setSelectedTaskIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const clearError = (key: keyof FormErrors) =>
    setErrors(e => ({ ...e, [key]: undefined }));

  const validate = (): FormErrors => {
    const e: FormErrors = {};
    if (!title.trim())              e.title        = 'Job title is required';
    if (!neighborhood.trim())       e.neighborhood = 'Neighborhood is required';
    if (selectedTaskIds.size === 0) e.tasks        = 'Select at least one skill';
    const mn = parseFloat(budgetMin), mx = parseFloat(budgetMax);
    if (budgetMin && budgetMax && !isNaN(mn) && !isNaN(mx) && mn > mx)
      e.budget = 'Min budget cannot exceed max budget';
    return e;
  };

  // ── Submit ────────────────────────────────────────────────────

  const handleSubmit = async () => {
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length > 0) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setSubmitError('Session expired. Please sign in again.');
      return;
    }

    // Belt-and-suspenders gate check (primary gate fires at market.tsx Hire button).
    // null trustLevel = still loading → allow through, no false-block.
    if (trustLevel === 'explorer') {
      const selfDest =
        `/(tabs)/direct-hire?worker_id=${worker_id}` +
        `&worker_name=${encodeURIComponent(worker_name ?? '')}`;
      router.replace(
        `/(onboarding)/verify-level-2?destination=${encodeURIComponent(selfDest)}` as Parameters<typeof router.replace>[0]
      );
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    // Derive category from first selected task (for jobs.category column)
    const firstTaskId    = Array.from(selectedTaskIds)[0];
    const firstTask      = skills.find(s => s.task_id === firstTaskId);
    const categoryForJob = firstTask?.category_name ?? null;

    // First chat message: description if provided, else fall back to title
    const firstMessage = description.trim() || title.trim();

    // 1. INSERT job (status = matched — pre-targeted, not visible in Live Market)
    const { data: newJob, error: jobErr } = await supabase
      .from('jobs')
      .insert({
        customer_id:  user.id,
        worker_id,
        title:        title.trim(),
        description:  description.trim() || null,
        category:     categoryForJob,
        status:       'matched',
        budget_min:   budgetMin ? parseFloat(budgetMin) : null,
        budget_max:   budgetMax ? parseFloat(budgetMax) : null,
        neighborhood: neighborhood.trim(),
        timing,
        is_urgent:    isUrgent,
      })
      .select('id')
      .single();

    if (jobErr || !newJob) {
      setSubmitError(jobErr?.message ?? 'Failed to create job. Please try again.');
      setSubmitting(false);
      return;
    }

    // 2. INSERT job_post_tasks (one row per selected skill)
    const taskRows = Array.from(selectedTaskIds).map(task_id => ({
      job_post_id: newJob.id,
      task_id,
    }));

    const { error: taskErr } = await supabase
      .from('job_post_tasks')
      .insert(taskRows);

    if (taskErr) {
      setSubmitError('Job created but task link failed. Contact support if this persists.');
      setSubmitting(false);
      return;
    }

    // 3. INSERT chat
    const { data: newChat, error: chatErr } = await supabase
      .from('chats')
      .insert({
        job_id:          newJob.id,
        customer_id:     user.id,
        worker_id,
        last_message:    firstMessage,
        last_message_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (chatErr || !newChat) {
      setSubmitError('Job created but chat failed to open. Contact support if this persists.');
      setSubmitting(false);
      return;
    }

    // 4. INSERT first message (non-fatal — chat exists either way)
    const { error: msgErr } = await supabase
      .from('messages')
      .insert({
        chat_id:      newChat.id,
        sender_id:    user.id,
        content:      firstMessage,
        message_type: 'text',
      });

    if (msgErr) {
      console.warn('First message insert failed:', msgErr.message);
    }

    setSubmitting(false);
    router.replace(
      `/(tabs)/job-chat?chat_id=${newChat.id}` +
      `&worker_name=${encodeURIComponent(worker_name ?? 'Worker')}` +
      `&first_message=${encodeURIComponent(firstMessage)}`
    );
  };

  // ── Derived ───────────────────────────────────────────────────

  const displayName      = worker_name ?? 'Worker';
  const initials         = displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const superpowers      = skills.filter(s => s.is_featured).slice(0, 3);
  const isSubmitDisabled = submitting || selectedTaskIds.size === 0;

  // ── Loading ───────────────────────────────────────────────────

  if (dataLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.gold} />
        </View>
      </SafeAreaView>
    );
  }

  // ── Form ──────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >

        {/* ── Worker header strip ── */}
        <View style={styles.workerHeader}>
          <View style={styles.avatarWrap}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarInitials}>{initials}</Text>
              </View>
            )}
          </View>
          <View style={styles.workerMeta}>
            <Text style={styles.hiringEyebrow}>HIRING</Text>
            <Text style={styles.workerName} numberOfLines={1}>{displayName}</Text>
            {superpowers.length > 0 && (
              <View style={styles.superpowerRow}>
                {superpowers.map(sp => (
                  <View key={sp.task_id} style={styles.spChip}>
                    <Text style={styles.spChipText} numberOfLines={1}>{sp.task_name}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>

        {/* ── Skill picker (this worker's skills, multi-select) ── */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>
            SKILL <Text style={styles.required}>*</Text>
          </Text>
          {skills.length === 0 ? (
            <Text style={styles.emptyText}>No skills listed for this worker.</Text>
          ) : (
            <View style={styles.chipWrap}>
              {skills.map(skill => {
                const active = selectedTaskIds.has(skill.task_id);
                return (
                  <TouchableOpacity
                    key={skill.task_id}
                    style={[styles.chip, active && styles.chipActive]}
                    onPress={() => { toggleTask(skill.task_id); clearError('tasks'); }}
                    activeOpacity={0.75}
                  >
                    <Text style={[styles.chipName, active && styles.chipNameActive]}>
                      {skill.task_name}
                    </Text>
                    <Text style={[styles.chipPrice, active && styles.chipPriceActive]}>
                      ${skill.price_min}–${skill.price_max}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
          {errors.tasks && <Text style={styles.errorText}>{errors.tasks}</Text>}
        </View>

        {/* ── Title ── */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>
            JOB TITLE <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={[styles.input, errors.title && styles.inputError]}
            placeholder="e.g. Deep clean 2BR apartment"
            placeholderTextColor={Colors.textSecondary}
            value={title}
            onChangeText={t => { setTitle(t.slice(0, 80)); clearError('title'); }}
            maxLength={80}
          />
          <View style={styles.rowBetween}>
            {errors.title
              ? <Text style={styles.errorText}>{errors.title}</Text>
              : <View />}
            <Text style={styles.charCount}>{title.length}/80</Text>
          </View>
        </View>

        {/* ── Description ── */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>
            DESCRIPTION <Text style={styles.optional}>(optional)</Text>
          </Text>
          <TextInput
            style={[styles.input, styles.inputMultiline]}
            placeholder="Any extra details or special requirements..."
            placeholderTextColor={Colors.textSecondary}
            value={description}
            onChangeText={t => setDescription(t.slice(0, 500))}
            multiline
            numberOfLines={3}
            maxLength={500}
          />
          <Text style={[styles.charCount, { textAlign: 'right' }]}>
            {description.length}/500
          </Text>
        </View>

        {/* ── Budget ── */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>
            BUDGET <Text style={styles.optional}>(optional)</Text>
          </Text>
          <View style={styles.budgetRow}>
            <View style={styles.budgetHalf}>
              <Text style={styles.budgetLabel}>MIN $</Text>
              <TextInput
                style={[styles.input, errors.budget && styles.inputError]}
                placeholder="0"
                placeholderTextColor={Colors.textSecondary}
                value={budgetMin}
                onChangeText={t => { setBudgetMin(t); clearError('budget'); }}
                keyboardType="numeric"
              />
            </View>
            <View style={styles.budgetHalf}>
              <Text style={styles.budgetLabel}>MAX $</Text>
              <TextInput
                style={[styles.input, errors.budget && styles.inputError]}
                placeholder="0"
                placeholderTextColor={Colors.textSecondary}
                value={budgetMax}
                onChangeText={t => { setBudgetMax(t); clearError('budget'); }}
                keyboardType="numeric"
              />
            </View>
          </View>
          {errors.budget && <Text style={styles.errorText}>{errors.budget}</Text>}
        </View>

        {/* ── Neighborhood ── */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>
            NEIGHBORHOOD <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={[styles.input, errors.neighborhood && styles.inputError]}
            placeholder="e.g. Brooklyn, Midtown, Astoria"
            placeholderTextColor={Colors.textSecondary}
            value={neighborhood}
            onChangeText={t => { setNeighborhood(t); clearError('neighborhood'); }}
          />
          {errors.neighborhood &&
            <Text style={styles.errorText}>{errors.neighborhood}</Text>}
        </View>

        {/* ── Timing ── */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>TIMING</Text>
          <View style={styles.timingRow}>
            {(['asap', 'scheduled', 'flexible'] as Timing[]).map(t => (
              <TouchableOpacity
                key={t}
                style={[styles.timingBtn, timing === t && styles.timingBtnActive]}
                onPress={() => setTiming(t)}
                activeOpacity={0.8}
              >
                <Text style={[styles.timingText, timing === t && styles.timingTextActive]}>
                  {t === 'asap' ? 'ASAP' : t.charAt(0).toUpperCase() + t.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── Urgent toggle ── */}
        <View style={styles.fieldGroup}>
          <TouchableOpacity
            style={styles.urgentRow}
            onPress={() => setIsUrgent(u => !u)}
            activeOpacity={0.85}
          >
            <View>
              <Text style={styles.label}>URGENT</Text>
              <Text style={styles.urgentSub}>Appears in same-day feed</Text>
            </View>
            <View style={[styles.toggleTrack, isUrgent && styles.toggleTrackOn]}>
              <View style={[styles.toggleThumb, isUrgent && styles.toggleThumbOn]} />
            </View>
          </TouchableOpacity>
        </View>

        {/* ── Submit ── */}
        <TouchableOpacity
          style={[styles.submitBtn, isSubmitDisabled && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={isSubmitDisabled}
          activeOpacity={0.85}
        >
          {submitting
            ? <ActivityIndicator color={Colors.background} />
            : <Text style={styles.submitText}>SEND REQUEST</Text>}
        </TouchableOpacity>

        {submitError && <Text style={styles.submitError}>{submitError}</Text>}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:     { flex: 1, backgroundColor: Colors.background },
  scroll:        { flex: 1 },
  scrollContent: { padding: Spacing.md, paddingBottom: Spacing.xxl },
  center:        { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // Worker header strip
  workerHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.gold,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  avatarWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: Colors.gold,
    overflow: 'hidden',
    flexShrink: 0,
  },
  avatar:         { width: 48, height: 48 },
  avatarFallback: {
    width: 48,
    height: 48,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: { color: Colors.gold, fontWeight: 'bold', fontSize: 16 },
  workerMeta:     { flex: 1 },
  hiringEyebrow: {
    color: Colors.gold,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 3,
    marginBottom: 2,
  },
  workerName: {
    color: Colors.textPrimary,
    fontWeight: 'bold',
    fontSize: 17,
    letterSpacing: 0.3,
    marginBottom: 6,
  },
  superpowerRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  spChip: {
    borderWidth: 1,
    borderColor: Colors.gold,
    borderRadius: Radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  spChipText: { color: Colors.gold, fontSize: 10, fontWeight: '600' },

  // Field group
  fieldGroup: { marginBottom: Spacing.lg },
  label: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  required: { color: Colors.red },
  optional: { color: Colors.textSecondary, fontWeight: 'normal' },

  // Task chips
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  chip: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.sm,
    backgroundColor: Colors.card,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 2,
  },
  chipActive:      { borderColor: Colors.gold, backgroundColor: Colors.gold + '22' },
  chipName:        { color: Colors.textPrimary, fontSize: 13, fontWeight: '600' },
  chipNameActive:  { color: Colors.gold },
  chipPrice:       { color: Colors.textSecondary, fontSize: 11 },
  chipPriceActive: { color: Colors.gold, opacity: 0.8 },
  emptyText:       { color: Colors.textSecondary, fontSize: 13, fontStyle: 'italic' },

  // Inputs
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
  inputMultiline: { minHeight: 90, textAlignVertical: 'top', paddingTop: 12 },
  inputError:     { borderColor: Colors.red },

  // Helpers
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  charCount:  { color: Colors.textSecondary, fontSize: 11, marginTop: 4 },
  errorText:  { color: Colors.red, fontSize: 12, marginTop: 4 },

  // Budget
  budgetRow:   { flexDirection: 'row', gap: 12 },
  budgetHalf:  { flex: 1 },
  budgetLabel: {
    color: Colors.textSecondary,
    fontSize: 11,
    letterSpacing: 1,
    marginBottom: 6,
  },

  // Timing
  timingRow: { flexDirection: 'row', gap: 8 },
  timingBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.full,
    paddingVertical: 10,
    alignItems: 'center',
  },
  timingBtnActive:  { borderColor: Colors.gold, backgroundColor: Colors.gold },
  timingText:       { color: Colors.textSecondary, fontSize: 12, fontWeight: 'bold' },
  timingTextActive: { color: Colors.background },

  // Urgent toggle
  urgentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    padding: Spacing.md,
  },
  urgentSub: { color: Colors.textSecondary, fontSize: 12, marginTop: 2 },
  toggleTrack: {
    width: 48,
    height: 28,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.border,
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  toggleTrackOn:  { backgroundColor: Colors.gold, borderColor: Colors.gold },
  toggleThumb: {
    width: 20,
    height: 20,
    borderRadius: Radius.full,
    backgroundColor: Colors.textSecondary,
    alignSelf: 'flex-start',
  },
  toggleThumbOn: { backgroundColor: Colors.background, alignSelf: 'flex-end' },

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
    marginTop: Spacing.sm,
  },
});
