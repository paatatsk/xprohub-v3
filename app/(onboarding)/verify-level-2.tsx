import { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Colors, Radius, Spacing } from '../../constants/theme';
import { supabase } from '../../lib/supabase';

// Level 2 Gate — shown when an Explorer taps Post a Job or Hire Directly.
// Real SMS + Stripe verification is deferred. "Skip For Now" sets trust_level
// and forwards the user to their original destination.

export default function VerifyLevel2Screen() {
  const router = useRouter();
  const { destination } = useLocalSearchParams<{ destination?: string }>();

  const [skipping, setSkipping] = useState<'starter' | 'pro' | null>(null);
  const [error, setError]       = useState<string | null>(null);

  const dest = destination ? decodeURIComponent(destination) : '/(tabs)';

  const handleSkip = async (level: 'starter' | 'pro') => {
    setSkipping(level);
    setError(null);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError('Session expired. Please sign in again.');
      setSkipping(null);
      return;
    }

    const { error: updateErr } = await supabase
      .from('profiles')
      .update({ trust_level: level })
      .eq('id', user.id);

    if (updateErr) {
      setError('Could not update your profile. Please try again.');
      setSkipping(null);
      return;
    }

    router.replace(dest as Parameters<typeof router.replace>[0]);
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >

        {/* ── Header ── */}
        <Text style={styles.heading}>VERIFY TO CONTINUE</Text>
        <Text style={styles.subhead}>
          Pick a path to post jobs, hire workers, or apply for work
        </Text>

        {/* ── Tile 1: Starter ── */}
        <View style={styles.tile}>
          <Text style={styles.tileEyebrow}>QUICK PATH</Text>
          <Text style={styles.tileTitle}>STARTER</Text>
          <Text style={styles.tileSub}>Jobs under $50 — fast onboarding</Text>

          <View style={styles.bullets}>
            <Text style={styles.bullet}>· Phone number verified</Text>
            <Text style={styles.bullet}>· Basic payment setup via Stripe</Text>
          </View>

          <TouchableOpacity
            style={[styles.skipBtn, skipping === 'pro' && styles.btnDisabled]}
            onPress={() => handleSkip('starter')}
            disabled={skipping !== null}
            activeOpacity={0.85}
          >
            {skipping === 'starter'
              ? <ActivityIndicator color={Colors.background} />
              : <Text style={styles.skipBtnText}>SKIP FOR NOW</Text>}
          </TouchableOpacity>
        </View>

        {/* ── Tile 2: Pro ── */}
        <View style={styles.tile}>
          <Text style={styles.tileEyebrow}>FULL ACCESS</Text>
          <Text style={styles.tileTitle}>PRO</Text>
          <Text style={styles.tileSub}>All jobs, any size — full verification</Text>

          <View style={styles.bullets}>
            <Text style={styles.bullet}>· Phone + address verified</Text>
            <Text style={styles.bullet}>· Government ID uploaded</Text>
            <Text style={styles.bullet}>· Stripe Connect banking setup</Text>
          </View>

          <TouchableOpacity
            style={[styles.skipBtnOutline, skipping === 'starter' && styles.btnDisabled]}
            onPress={() => handleSkip('pro')}
            disabled={skipping !== null}
            activeOpacity={0.85}
          >
            {skipping === 'pro'
              ? <ActivityIndicator color={Colors.gold} />
              : <Text style={styles.skipBtnOutlineText}>SKIP FOR NOW</Text>}
          </TouchableOpacity>
        </View>

        {/* ── Error ── */}
        {error && <Text style={styles.errorText}>{error}</Text>}

        {/* ── Deferral notice ── */}
        <Text style={styles.deferralNote}>
          Real verification coming soon. Skip for now lets you test all features.
        </Text>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:     { flex: 1, backgroundColor: Colors.background },
  scroll:        { flex: 1 },
  scrollContent: { padding: Spacing.md, paddingBottom: Spacing.xxl },

  heading: {
    color: Colors.gold,
    fontSize: 26,
    fontWeight: 'bold',
    letterSpacing: 2,
    marginBottom: 8,
  },
  subhead: {
    color: Colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: Spacing.lg,
  },

  // Tiles
  tile: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.gold,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  tileEyebrow: {
    color: Colors.gold,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 3,
    marginBottom: 4,
  },
  tileTitle: {
    color: Colors.textPrimary,
    fontSize: 22,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginBottom: 4,
  },
  tileSub: {
    color: Colors.textSecondary,
    fontSize: 13,
    marginBottom: Spacing.md,
  },

  // Bullets
  bullets: { gap: 6, marginBottom: Spacing.md },
  bullet:  { color: Colors.textPrimary, fontSize: 14, lineHeight: 20 },

  // Starter skip button (solid gold)
  skipBtn: {
    backgroundColor: Colors.gold,
    borderRadius: Radius.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
  skipBtnText: {
    color: Colors.background,
    fontWeight: 'bold',
    fontSize: 13,
    letterSpacing: 2,
  },

  // Pro skip button (gold outline)
  skipBtnOutline: {
    borderWidth: 1,
    borderColor: Colors.gold,
    borderRadius: Radius.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
  skipBtnOutlineText: {
    color: Colors.gold,
    fontWeight: 'bold',
    fontSize: 13,
    letterSpacing: 2,
  },

  btnDisabled: { opacity: 0.4 },

  errorText: {
    color: Colors.red,
    fontSize: 13,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  deferralNote: {
    color: Colors.textSecondary,
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 17,
    marginTop: Spacing.sm,
    opacity: 0.7,
  },
});
