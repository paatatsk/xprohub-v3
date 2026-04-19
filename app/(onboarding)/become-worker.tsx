import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors, Radius, Spacing } from '../../constants/theme';
import { supabase } from '../../lib/supabase';

// Become a Worker — 3-step onboarding
// Step 1: pick categories  →  Step 2: pick tasks  →  Step 3: choose Superpowers
// On Finish: upserts worker_skills (onConflict user_id,task_id) → Live Market

type Step = 1 | 2 | 3;

interface Category {
  id: number;
  name: string;
  icon_slug: string;
}

interface Task {
  id: number;
  name: string;
  category_id: number;
  price_min: number;
  price_max: number;
}

function iconForSlug(slug: string): string {
  const map: Record<string, string> = {
    'home-cleaning':    '🧹',
    'errands-delivery': '📦',
    'pet-care':         '🐾',
    'child-care':       '👶',
    'elder-care':       '🧓',
    'moving-labor':     '🚚',
    'tutoring':         '📚',
    'coaching':         '🏆',
    'personal-asst':    '🗂️',
    'vehicle-care':     '🚗',
    'handyman':         '🔨',
    'gardening':        '🌿',
    'trash-recycling':  '♻️',
    'events':           '🎉',
    'electrical':       '⚡',
    'plumbing':         '🔧',
    'painting':         '🎨',
    'carpentry':        '🪚',
    'it-tech':          '💻',
    'hvac':             '❄️',
  };
  return map[slug] ?? '▪';
}

export default function BecomeWorkerScreen() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);

  // Step 1 state
  const [categories, setCategories]         = useState<Category[]>([]);
  const [taskCounts, setTaskCounts]         = useState<Record<number, number>>({});
  const [catsLoading, setCatsLoading]       = useState(true);
  const [selectedCatIds, setSelectedCatIds] = useState<Set<number>>(new Set());

  // Step 2 state
  const [tasks, setTasks]                     = useState<Task[]>([]);
  const [tasksLoading, setTasksLoading]       = useState(false);
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<number>>(new Set());

  // Step 3 state
  const [featuredTaskIds, setFeaturedTaskIds] = useState<Set<number>>(new Set());

  // Submit state
  const [submitting, setSubmitting]   = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // ── Load categories + task counts on mount ─────────────────────

  useEffect(() => {
    supabase
      .from('task_categories')
      .select('id, name, icon_slug')
      .order('sort_order', { ascending: true })
      .then(({ data }) => {
        setCategories(data ?? []);
        setCatsLoading(false);
      });

    supabase
      .from('task_library')
      .select('category_id')
      .eq('is_active', true)
      .then(({ data }) => {
        if (!data) return;
        const counts: Record<number, number> = {};
        for (const row of data) {
          counts[row.category_id] = (counts[row.category_id] ?? 0) + 1;
        }
        setTaskCounts(counts);
      });
  }, []);

  // ── Step transitions ────────────────────────────────────────────

  const goToStep2 = async () => {
    setTasks([]);           // clear stale tasks from previous attempt
    setTasksLoading(true);
    setStep(2);
    const { data } = await supabase
      .from('task_library')
      .select('id, name, category_id, price_min, price_max')
      .in('category_id', [...selectedCatIds])
      .eq('is_active', true)
      .order('task_code', { ascending: true });
    setTasks(data ?? []);
    setTasksLoading(false);
  };

  const goToStep3 = () => {
    // Pre-select up to 3 tasks as Superpowers (first 3 from selection)
    const all = [...selectedTaskIds];
    setFeaturedTaskIds(new Set(all.slice(0, 3)));
    setStep(3);
  };

  const goBackToStep1 = () => {
    // Preserve category selections; clear task state in case categories change
    setTasks([]);
    setSelectedTaskIds(new Set());
    setStep(1);
  };

  const goBackToStep2 = () => {
    setStep(2);
  };

  // ── Toggle helpers ──────────────────────────────────────────────

  const toggleCat = useCallback((id: number) => {
    setSelectedCatIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const toggleTask = useCallback((id: number) => {
    setSelectedTaskIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const toggleFeatured = useCallback((id: number) => {
    setFeaturedTaskIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else if (next.size < 3) {
        next.add(id);
      }
      return next;
    });
  }, []);

  // ── Finish: upsert worker_skills ────────────────────────────────

  const handleFinish = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setSubmitError('Session expired. Please sign in again.');
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    const rows = [...selectedTaskIds].map(task_id => ({
      user_id:     user.id,
      task_id,
      is_featured: featuredTaskIds.has(task_id),
    }));

    const { error } = await supabase
      .from('worker_skills')
      .upsert(rows, { onConflict: 'user_id,task_id' });

    if (error) {
      setSubmitError(error.message);
      setSubmitting(false);
      return;
    }

    setSubmitting(false);
    router.replace('/(tabs)/market');
  };

  // ── STEP 1 — Category picker ────────────────────────────────────

  if (step === 1) {
    const n = selectedCatIds.size;
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.eyebrow}>STEP 1 OF 3</Text>
          <Text style={styles.heading}>WHAT DO YOU DO?</Text>
          <Text style={styles.subhead}>
            Pick one or more categories where you have skills
          </Text>

          {catsLoading ? (
            <ActivityIndicator color={Colors.gold} style={{ marginTop: 40 }} />
          ) : (
            <View style={styles.catGrid}>
              {categories.map(cat => {
                const active = selectedCatIds.has(cat.id);
                return (
                  <TouchableOpacity
                    key={cat.id}
                    style={[styles.catTile, active && styles.catTileActive]}
                    onPress={() => toggleCat(cat.id)}
                    activeOpacity={0.75}
                  >
                    <Text style={styles.catEmoji}>{iconForSlug(cat.icon_slug)}</Text>
                    <Text style={[styles.catName, active && styles.catNameActive]}>
                      {cat.name.toUpperCase()}
                    </Text>
                    {taskCounts[cat.id] !== undefined && (
                      <Text style={styles.catCount}>
                        {taskCounts[cat.id]} task{taskCounts[cat.id] !== 1 ? 's' : ''}
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          <View style={styles.bottomBar}>
            <Text style={styles.counterText}>
              {n === 0
                ? 'Select at least one category'
                : `${n} categor${n === 1 ? 'y' : 'ies'} selected`}
            </Text>
            <TouchableOpacity
              style={[styles.continueBtn, n === 0 && styles.continueBtnDisabled]}
              onPress={goToStep2}
              disabled={n === 0}
              activeOpacity={0.85}
            >
              <Text style={styles.continueBtnText}>Continue →</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── STEP 2 — Task picker ────────────────────────────────────────

  if (step === 2) {
    const n = selectedTaskIds.size;
    const catOrder = categories.filter(c => selectedCatIds.has(c.id));
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.eyebrow}>STEP 2 OF 3</Text>
          <Text style={styles.heading}>PICK YOUR SKILLS</Text>
          <Text style={styles.subhead}>
            {n === 0
              ? 'Tap the skills you offer'
              : `${n} skill${n === 1 ? '' : 's'} selected`}
          </Text>

          {tasksLoading ? (
            <ActivityIndicator color={Colors.gold} style={{ marginTop: 40 }} />
          ) : (
            catOrder.map(cat => {
              const catTasks = tasks.filter(t => t.category_id === cat.id);
              if (catTasks.length === 0) return null;
              return (
                <View key={cat.id} style={styles.fieldGroup}>
                  <Text style={styles.sectionLabel}>
                    {iconForSlug(cat.icon_slug)}{'  '}{cat.name.toUpperCase()}
                  </Text>
                  <View style={styles.chipWrap}>
                    {catTasks.map(task => {
                      const active = selectedTaskIds.has(task.id);
                      return (
                        <TouchableOpacity
                          key={task.id}
                          style={[styles.chip, active && styles.chipActive]}
                          onPress={() => toggleTask(task.id)}
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
                </View>
              );
            })
          )}

          <View style={styles.bottomBar}>
            <Text style={styles.counterText}>
              {n === 0
                ? 'Select at least one skill'
                : `${n} skill${n === 1 ? '' : 's'} selected`}
            </Text>
            <View style={styles.bottomRow}>
              <TouchableOpacity
                style={styles.backBtn}
                onPress={goBackToStep1}
                activeOpacity={0.7}
              >
                <Text style={styles.backBtnText}>← Back</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.continueBtn, styles.continueBtnFlex, n === 0 && styles.continueBtnDisabled]}
                onPress={goToStep3}
                disabled={n === 0}
                activeOpacity={0.85}
              >
                <Text style={styles.continueBtnText}>Continue →</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── STEP 3 — Superpower picker ──────────────────────────────────

  const selectedTasks = tasks.filter(t => selectedTaskIds.has(t.id));
  const nFeatured = featuredTaskIds.size;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.eyebrow}>STEP 3 OF 3</Text>
        <Text style={styles.heading}>YOUR SUPERPOWERS</Text>
        <Text style={styles.subhead}>
          Pick up to 3 skills to feature on your business card
        </Text>

        <View style={styles.fieldGroup}>
          {selectedTasks.map(task => {
            const isFeatured = featuredTaskIds.has(task.id);
            const canToggle  = isFeatured || featuredTaskIds.size < 3;
            return (
              <TouchableOpacity
                key={task.id}
                style={[styles.superRow, isFeatured && styles.superRowActive]}
                onPress={() => toggleFeatured(task.id)}
                disabled={!canToggle}
                activeOpacity={0.8}
              >
                <View style={[styles.superCheck, isFeatured && styles.superCheckActive]}>
                  {isFeatured && <Text style={styles.superCheckMark}>✓</Text>}
                </View>
                <View style={styles.superTaskInfo}>
                  <Text style={[styles.superTaskName, isFeatured && styles.superTaskNameActive]}>
                    {task.name}
                  </Text>
                  <Text style={styles.superTaskPrice}>
                    ${task.price_min}–${task.price_max}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.bottomBar}>
          <Text style={styles.counterText}>{nFeatured}/3 featured</Text>
          <View style={styles.bottomRow}>
            <TouchableOpacity
              style={styles.backBtn}
              onPress={goBackToStep2}
              activeOpacity={0.7}
            >
              <Text style={styles.backBtnText}>← Back</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.continueBtn, styles.continueBtnFlex, submitting && styles.continueBtnDisabled]}
              onPress={handleFinish}
              disabled={submitting}
              activeOpacity={0.85}
            >
              {submitting
                ? <ActivityIndicator color={Colors.background} />
                : <Text style={styles.continueBtnText}>FINISH</Text>}
            </TouchableOpacity>
          </View>
          {submitError && <Text style={styles.errorText}>{submitError}</Text>}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ─────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container:     { flex: 1, backgroundColor: Colors.background },
  scroll:        { flex: 1 },
  scrollContent: { padding: Spacing.md, paddingBottom: Spacing.xxl },

  // Header
  eyebrow: {
    color: Colors.gold,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 3,
    marginBottom: 4,
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

  // Section label (step 2 category group header)
  sectionLabel: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 1.5,
    marginBottom: 8,
  },

  // Category grid (step 1)
  catGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 8,
  },
  catTile: {
    width: '47.5%',
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    padding: Spacing.md,
    alignItems: 'flex-start',
    gap: 6,
  },
  catTileActive:  { borderColor: Colors.gold, backgroundColor: Colors.gold + '1A' },
  catEmoji:       { fontSize: 28 },
  catName: {
    color: Colors.textPrimary,
    fontSize: 13,
    fontWeight: 'bold',
    letterSpacing: 0.5,
    lineHeight: 18,
  },
  catNameActive:  { color: Colors.gold },
  catCount:       { color: Colors.textSecondary, fontSize: 11 },

  // Field group
  fieldGroup: { marginBottom: Spacing.lg },

  // Task chips (step 2)
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

  // Superpower rows (step 3)
  superRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    gap: 12,
  },
  superRowActive:       { borderColor: Colors.gold, backgroundColor: Colors.gold + '1A' },
  superCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
  },
  superCheckActive:     { borderColor: Colors.gold, backgroundColor: Colors.gold },
  superCheckMark:       { color: Colors.background, fontSize: 13, fontWeight: 'bold' },
  superTaskInfo:        { flex: 1 },
  superTaskName:        { color: Colors.textPrimary, fontSize: 14, fontWeight: '600' },
  superTaskNameActive:  { color: Colors.gold },
  superTaskPrice:       { color: Colors.textSecondary, fontSize: 12, marginTop: 2 },

  // Bottom bar
  bottomBar: {
    marginTop: Spacing.xl,
    gap: Spacing.sm,
  },
  counterText: {
    color: Colors.textSecondary,
    fontSize: 13,
    textAlign: 'center',
  },
  bottomRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  backBtn: {
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingVertical: 16,
    paddingHorizontal: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnText:         { color: Colors.textSecondary, fontWeight: '600', fontSize: 14 },
  continueBtn: {
    backgroundColor: Colors.gold,
    borderRadius: Radius.md,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueBtnFlex:     { flex: 1 },
  continueBtnDisabled: { opacity: 0.5 },
  continueBtnText: {
    color: Colors.background,
    fontWeight: 'bold',
    fontSize: 15,
    letterSpacing: 1.5,
  },
  errorText: {
    color: Colors.red,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 4,
  },
});
