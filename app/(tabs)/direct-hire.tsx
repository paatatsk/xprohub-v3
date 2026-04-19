import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, TextInput, ActivityIndicator, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Colors, Radius, Spacing } from '../../constants/theme';
import { supabase } from '../../lib/supabase';

// Direct Hire — launched from Workers Feed "Hire Directly" button
// Params: worker_id (uuid), worker_name (display string)
// Flow: pick skill → write message → optional budget → SEND REQUEST
// Backend: jobs INSERT (status=matched) → job_post_tasks → chats → messages

interface WorkerSkill {
  task_id: number;
  task_name: string;
  price_min: number;
  price_max: number;
}

export default function DirectHireScreen() {
  const router = useRouter();
  const { worker_id, worker_name } = useLocalSearchParams<{
    worker_id: string;
    worker_name: string;
  }>();

  // Worker data
  const [avatarUrl, setAvatarUrl]   = useState<string | null>(null);
  const [skills, setSkills]         = useState<WorkerSkill[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  // Form state
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [message, setMessage]               = useState('');
  const [budgetMin, setBudgetMin]           = useState('');
  const [budgetMax, setBudgetMax]           = useState('');

  // Submit state
  const [submitting, setSubmitting]   = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // ── Load worker profile + skills in parallel ──────────────────

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
        .select('task_id, is_featured, task_library ( name, price_min, price_max )')
        .eq('user_id', worker_id)
        .order('is_featured', { ascending: false }),
    ]).then(([profileRes, skillsRes]) => {
      if (profileRes.data) {
        setAvatarUrl(profileRes.data.avatar_url);
      }
      if (skillsRes.data) {
        const mapped: WorkerSkill[] = (skillsRes.data as any[])
          .map(row => ({
            task_id:   row.task_id,
            task_name: row.task_library?.name     ?? '',
            price_min: row.task_library?.price_min ?? 0,
            price_max: row.task_library?.price_max ?? 0,
          }))
          .filter(s => s.task_name !== '');
        setSkills(mapped);
      }
      setDataLoading(false);
    });
  }, [worker_id]);

  // ── Submit ────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!selectedTaskId || !message.trim() || !worker_id) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setSubmitError('Session expired. Please sign in again.');
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    const selectedSkill = skills.find(s => s.task_id === selectedTaskId);
    const title = selectedSkill
      ? `${selectedSkill.task_name} — Direct Hire`
      : 'Direct Hire Request';

    // 1. INSERT job (status = matched — not public, won't appear in Live Market)
    const { data: newJob, error: jobErr } = await supabase
      .from('jobs')
      .insert({
        customer_id: user.id,
        worker_id,
        title,
        description: message.trim(),
        status:      'matched',
        budget_min:  budgetMin ? parseFloat(budgetMin) : null,
        budget_max:  budgetMax ? parseFloat(budgetMax) : null,
      })
      .select('id')
      .single();

    if (jobErr || !newJob) {
      setSubmitError(jobErr?.message ?? 'Failed to create job. Please try again.');
      setSubmitting(false);
      return;
    }

    // 2. INSERT job_post_tasks
    const { error: taskErr } = await supabase
      .from('job_post_tasks')
      .insert({ job_post_id: newJob.id, task_id: selectedTaskId });

    if (taskErr) {
      setSubmitError('Job created but task link failed. Contact support if this persists.');
      setSubmitting(false);
      return;
    }

    // 3. INSERT chat — requires migration 20260419000003_chat_insert_policy.sql
    const { data: newChat, error: chatErr } = await supabase
      .from('chats')
      .insert({
        job_id:           newJob.id,
        customer_id:      user.id,
        worker_id,
        last_message:     message.trim(),
        last_message_at:  new Date().toISOString(),
      })
      .select('id')
      .single();

    if (chatErr || !newChat) {
      setSubmitError('Job created but chat failed to open. Contact support if this persists.');
      setSubmitting(false);
      return;
    }

    // 4. INSERT first message (customer's request becomes the opening line)
    const { error: msgErr } = await supabase
      .from('messages')
      .insert({
        chat_id:      newChat.id,
        sender_id:    user.id,
        content:      message.trim(),
        message_type: 'text',
      });

    if (msgErr) {
      // Non-fatal — chat exists, full message history will be wired later
      console.warn('First message insert failed:', msgErr.message);
    }

    setSubmitting(false);
    router.replace(
      `/(tabs)/job-chat?chat_id=${newChat.id}` +
      `&worker_name=${encodeURIComponent(worker_name ?? 'Worker')}` +
      `&first_message=${encodeURIComponent(message.trim())}`
    );
  };

  // ── Derived ───────────────────────────────────────────────────

  const displayName = worker_name ?? 'Worker';
  const initials    = displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const canSubmit   = !!selectedTaskId && message.trim().length > 0 && !submitting;

  // ── Loading ───────────────────────────────────────────────────

  if (dataLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.gold} />
        </View>
      </SafeAreaView>
    );
  }

  // ── Form ──────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >

        {/* ── Worker identity strip ── */}
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
            <Text style={styles.hireEyebrow}>HIRE</Text>
            <Text style={styles.workerName} numberOfLines={1}>{displayName}</Text>
          </View>
        </View>

        {/* ── Skill picker ── */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>
            FOR WHAT? <Text style={styles.required}>*</Text>
          </Text>
          {skills.length === 0 ? (
            <Text style={styles.emptySkills}>No skills listed for this worker.</Text>
          ) : (
            <View style={styles.chipWrap}>
              {skills.map(skill => {
                const active = selectedTaskId === skill.task_id;
                return (
                  <TouchableOpacity
                    key={skill.task_id}
                    style={[styles.chip, active && styles.chipActive]}
                    onPress={() => setSelectedTaskId(active ? null : skill.task_id)}
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
        </View>

        {/* ── Message ── */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>
            WHAT DO YOU NEED? <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={[styles.input, styles.inputMultiline]}
            placeholder="Describe what you need help with..."
            placeholderTextColor={Colors.textSecondary}
            value={message}
            onChangeText={t => setMessage(t.slice(0, 500))}
            multiline
            numberOfLines={4}
            maxLength={500}
          />
          <Text style={styles.charCount}>{message.length}/500</Text>
        </View>

        {/* ── Budget (optional) ── */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>
            BUDGET <Text style={styles.optional}>(optional)</Text>
          </Text>
          <View style={styles.budgetRow}>
            <View style={styles.budgetHalf}>
              <Text style={styles.budgetLabel}>MIN $</Text>
              <TextInput
                style={styles.input}
                placeholder="0"
                placeholderTextColor={Colors.textSecondary}
                value={budgetMin}
                onChangeText={setBudgetMin}
                keyboardType="numeric"
              />
            </View>
            <View style={styles.budgetHalf}>
              <Text style={styles.budgetLabel}>MAX $</Text>
              <TextInput
                style={styles.input}
                placeholder="0"
                placeholderTextColor={Colors.textSecondary}
                value={budgetMax}
                onChangeText={setBudgetMax}
                keyboardType="numeric"
              />
            </View>
          </View>
        </View>

        {/* ── Submit ── */}
        <TouchableOpacity
          style={[styles.submitBtn, !canSubmit && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={!canSubmit}
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

  // Worker header
  workerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  avatarWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: Colors.gold,
    overflow: 'hidden',
    flexShrink: 0,
  },
  avatar:         { width: 56, height: 56 },
  avatarFallback: {
    width: 56,
    height: 56,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: { color: Colors.gold, fontWeight: 'bold', fontSize: 18 },
  workerMeta:     { flex: 1 },
  hireEyebrow: {
    color: Colors.gold,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 3,
    marginBottom: 2,
  },
  workerName: {
    color: Colors.textPrimary,
    fontWeight: 'bold',
    fontSize: 18,
    letterSpacing: 0.3,
  },

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

  // Skill chips
  chipWrap:        { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
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
  emptySkills:     { color: Colors.textSecondary, fontSize: 13, fontStyle: 'italic' },

  // Input
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
  charCount:      { color: Colors.textSecondary, fontSize: 11, marginTop: 4, textAlign: 'right' },

  // Budget
  budgetRow:   { flexDirection: 'row', gap: 12 },
  budgetHalf:  { flex: 1 },
  budgetLabel: {
    color: Colors.textSecondary,
    fontSize: 11,
    letterSpacing: 1,
    marginBottom: 6,
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
    marginTop: Spacing.sm,
  },
});
