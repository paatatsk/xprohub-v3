import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  TextInput, ScrollView, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { Colors, Radius, Spacing } from '../../constants/theme';
import { supabase } from '../../lib/supabase';

// Screen 7 — Post a Job
// Step 4A: Form scaffold + category pre-fill. No Supabase write yet.
// TODO Step 4B: INSERT into jobs + job_post_tasks on submit
// TODO Step 4B: Level 2 gate check before form loads
// FLAG: job_post_tasks has no RLS INSERT policy yet — add before 4B

type Timing = 'asap' | 'scheduled' | 'flexible';

interface Task {
  id: number;
  name: string;
  price_min: number;
  price_max: number;
}

interface FormErrors {
  title?:        string;
  neighborhood?: string;
  tasks?:        string;
  budget?:       string;
}

export default function PostScreen() {
  const { category_id } = useLocalSearchParams<{ category_id?: string }>();
  const catId = category_id ? parseInt(category_id, 10) : null;

  // Category meta
  const [categoryName, setCategoryName] = useState<string | null>(null);

  // Task picker
  const [tasks, setTasks]               = useState<Task[]>([]);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<number>>(new Set());

  // Form fields
  const [title, setTitle]               = useState('');
  const [description, setDescription]   = useState('');
  const [budgetMin, setBudgetMin]       = useState('');
  const [budgetMax, setBudgetMax]       = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [timing, setTiming]             = useState<Timing>('flexible');
  const [isUrgent, setIsUrgent]         = useState(false);

  // UI state
  const [errors, setErrors]       = useState<FormErrors>({});
  const [submitted, setSubmitted] = useState(false);

  // Load tasks (filtered by category if present) + category name
  useEffect(() => {
    const taskQuery = catId
      ? supabase
          .from('task_library')
          .select('id, name, price_min, price_max')
          .eq('is_active', true)
          .eq('category_id', catId)
          .order('task_code', { ascending: true })
      : supabase
          .from('task_library')
          .select('id, name, price_min, price_max')
          .eq('is_active', true)
          .order('task_code', { ascending: true });

    taskQuery.then(({ data }) => {
      setTasks(data ?? []);
      setTasksLoading(false);
    });

    if (catId) {
      supabase
        .from('task_categories')
        .select('name')
        .eq('id', catId)
        .single()
        .then(({ data }) => { if (data) setCategoryName(data.name); });
    }
  }, [catId]);

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
    if (!title.trim())        e.title = 'Job title is required';
    if (!neighborhood.trim()) e.neighborhood = 'Neighborhood is required';
    if (selectedTaskIds.size === 0) e.tasks = 'Select at least one task';
    const mn = parseFloat(budgetMin), mx = parseFloat(budgetMax);
    if (budgetMin && budgetMax && !isNaN(mn) && !isNaN(mx) && mn > mx)
      e.budget = 'Min budget cannot exceed max budget';
    return e;
  };

  const handleSubmit = () => {
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length > 0) return;

    const payload = {
      title:        title.trim(),
      description:  description.trim() || null,
      category:     categoryName ?? null,
      budget_min:   budgetMin ? parseFloat(budgetMin) : null,
      budget_max:   budgetMax ? parseFloat(budgetMax) : null,
      neighborhood: neighborhood.trim(),
      timing,
      is_urgent:    isUrgent,
      status:       'open',
      task_ids:     Array.from(selectedTaskIds), // → job_post_tasks at Step 4B
    };

    console.log('[Post a Job] payload:', JSON.stringify(payload, null, 2));
    setSubmitted(true);
  };

  const resetForm = () => {
    setTitle(''); setDescription(''); setBudgetMin(''); setBudgetMax('');
    setNeighborhood(''); setTiming('flexible'); setIsUrgent(false);
    setSelectedTaskIds(new Set()); setErrors({}); setSubmitted(false);
  };

  if (submitted) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.successBox}>
          <View style={styles.successRing}>
            <Text style={styles.successIcon}>✓</Text>
          </View>
          <Text style={styles.successHeading}>JOB READY TO POST</Text>
          <Text style={styles.successSub}>
            Supabase write wired in Step 4B.{'\n'}Check console for payload.
          </Text>
          <TouchableOpacity style={styles.resetBtn} onPress={resetForm}>
            <Text style={styles.resetText}>POST ANOTHER</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >

        {/* ── Heading ── */}
        <Text style={styles.heading}>POST A JOB</Text>
        <Text style={styles.subhead}>
          {categoryName ? `Category: ${categoryName}` : 'Fill in the details below'}
        </Text>

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

        {/* ── Task picker ── */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>
            TASKS <Text style={styles.required}>*</Text>
          </Text>
          {tasksLoading ? (
            <ActivityIndicator color={Colors.gold} style={{ marginVertical: 12 }} />
          ) : (
            <View style={styles.chipWrap}>
              {tasks.map(task => {
                const active = selectedTaskIds.has(task.id);
                return (
                  <TouchableOpacity
                    key={task.id}
                    style={[styles.chip, active && styles.chipActive]}
                    onPress={() => { toggleTask(task.id); clearError('tasks'); }}
                    activeOpacity={0.75}
                  >
                    <Text style={[styles.chipName, active && styles.chipNameActive]}>
                      {task.name}
                    </Text>
                    <Text style={[styles.chipPrice, active && styles.chipPriceActive]}>
                      ${task.price_min}–${task.price_max}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
          {errors.tasks && <Text style={styles.errorText}>{errors.tasks}</Text>}
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
        <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} activeOpacity={0.85}>
          <Text style={styles.submitText}>POST JOB</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:     { flex: 1, backgroundColor: Colors.background },
  scroll:        { flex: 1 },
  scrollContent: { padding: Spacing.md, paddingBottom: Spacing.xxl },

  // Heading
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

  // Task chips
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
  timingRow:        { flexDirection: 'row', gap: 8 },
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
  urgentSub:      { color: Colors.textSecondary, fontSize: 12, marginTop: 2 },
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
  toggleThumbOn:  { backgroundColor: Colors.background, alignSelf: 'flex-end' },

  // Submit
  submitBtn: {
    backgroundColor: Colors.gold,
    borderRadius: Radius.md,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  submitText: {
    color: Colors.background,
    fontWeight: 'bold',
    fontSize: 15,
    letterSpacing: 2,
  },

  // Success state
  successBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    gap: 16,
  },
  successRing: {
    width: 88,
    height: 88,
    borderRadius: Radius.full,
    borderWidth: 2,
    borderColor: Colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  successIcon:    { color: Colors.gold, fontSize: 36, fontWeight: 'bold' },
  successHeading: { color: Colors.textPrimary, fontSize: 20, fontWeight: 'bold', letterSpacing: 1.5 },
  successSub:     { color: Colors.textSecondary, fontSize: 14, textAlign: 'center', lineHeight: 20 },
  resetBtn: {
    marginTop: 8,
    borderWidth: 1.5,
    borderColor: Colors.gold,
    borderRadius: Radius.full,
    paddingVertical: 10,
    paddingHorizontal: 28,
  },
  resetText: { color: Colors.gold, fontWeight: 'bold', fontSize: 13, letterSpacing: 1.5 },
});
