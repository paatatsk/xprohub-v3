// app/(tabs)/account.tsx
// Screen: ACCOUNT — About, Legal, Sign Out, Delete Account
// Entry point: gear icon on Home screen header

import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import Constants from 'expo-constants';
import { Colors, Spacing, Radius } from '../../constants/theme';
import { supabase } from '../../lib/supabase';
import { useBiometrics } from '../../hooks/useBiometrics';
import { PRIVACY_POLICY_URL, TERMS_OF_SERVICE_URL, SUPPORT_EMAIL } from '../../lib/legal';

export default function AccountScreen() {
  const router = useRouter();
  const { clearCredentials } = useBiometrics();
  const appVersion = Constants.expoConfig?.version ?? '1.0.0';
  const [isDeleting, setIsDeleting] = useState(false);

  // ── Blocked users ──────────────────────────────────────────
  const [blockedUsers, setBlockedUsers] = useState<{ id: string; blocked_id: string; full_name: string }[]>([]);

  const fetchBlockedUsers = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from('user_blocks')
      .select('id, blocked_id, profiles!blocked_id(full_name)')
      .eq('blocker_id', user.id)
      .order('created_at', { ascending: false });
    setBlockedUsers(
      (data ?? []).map((r: any) => ({
        id: r.id,
        blocked_id: r.blocked_id,
        full_name: r.profiles?.full_name ?? 'User',
      })),
    );
  }, []);

  useFocusEffect(useCallback(() => { fetchBlockedUsers(); }, [fetchBlockedUsers]));

  async function handleUnblock(blockId: string, name: string) {
    const { error } = await supabase
      .from('user_blocks')
      .delete()
      .eq('id', blockId);
    if (error) {
      Alert.alert('Unblock Failed', "Couldn't unblock this user. Please try again.");
    } else {
      await fetchBlockedUsers();
    }
  }

  async function handleSignOut() {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      await clearCredentials();
      router.replace('/(onboarding)/welcome');
    } catch (err) {
      Alert.alert('Sign Out Failed', 'Please check your connection and try again.');
    }
  }

  function handleDeleteAccount() {
    Alert.alert(
      'Delete Your Account?',
      'This is permanent. Your profile, jobs, and payment history will be anonymized. You cannot undo this.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete My Account',
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            try {
              const { data, error: fnError } = await supabase.functions.invoke(
                'delete-account',
                { body: {} },
              );

              if (fnError) {
                Alert.alert(
                  'Connection Error',
                  "Couldn't reach our servers. Check your connection and try again.",
                );
                return;
              }

              if (data?.error === 'active_jobs' || data?.error === 'held_payments') {
                Alert.alert('Active Commitments', data.message);
                return;
              }

              if (data?.error) {
                Alert.alert(
                  'Deletion Failed',
                  data.message ?? 'Account deletion could not be completed. Please try again or contact hello@xprohub.com.',
                );
                return;
              }

              // Success — sign out, clear biometrics, route to welcome
              await supabase.auth.signOut();
              await clearCredentials();
              router.replace('/(onboarding)/welcome');
            } catch (err) {
              Alert.alert(
                'Deletion Failed',
                'Something went wrong. Please try again or contact hello@xprohub.com.',
              );
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ],
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>

        {/* ── ABOUT ── */}
        <Text style={styles.eyebrow}>ABOUT</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Version</Text>
            <Text style={styles.rowValue}>{appVersion}</Text>
          </View>
          <View style={styles.divider} />
          <TouchableOpacity
            style={styles.row}
            onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}`)}
            activeOpacity={0.7}
          >
            <Text style={styles.rowLabel}>Support</Text>
            <View style={styles.rowRight}>
              <Text style={styles.rowValueGold}>{SUPPORT_EMAIL}</Text>
              <Text style={styles.chevron}>›</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* ── LEGAL ── */}
        <Text style={styles.eyebrow}>LEGAL</Text>
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.row}
            onPress={() => WebBrowser.openBrowserAsync(PRIVACY_POLICY_URL)}
            activeOpacity={0.7}
          >
            <Text style={styles.rowLabel}>Privacy Policy</Text>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity
            style={styles.row}
            onPress={() => WebBrowser.openBrowserAsync(TERMS_OF_SERVICE_URL)}
            activeOpacity={0.7}
          >
            <Text style={styles.rowLabel}>Terms of Service</Text>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        </View>

        {/* ── BLOCKED USERS ── */}
        <Text style={styles.eyebrow}>BLOCKED USERS</Text>
        <View style={styles.card}>
          {blockedUsers.length === 0 ? (
            <View style={styles.row}>
              <Text style={styles.rowValue}>No blocked users</Text>
            </View>
          ) : (
            blockedUsers.map((block, i) => (
              <View key={block.id}>
                {i > 0 && <View style={styles.divider} />}
                <View style={styles.row}>
                  <Text style={styles.rowLabel} numberOfLines={1}>{block.full_name}</Text>
                  <TouchableOpacity
                    onPress={() => handleUnblock(block.id, block.full_name)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.unblockText}>UNBLOCK</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>

        {/* ── ACTIONS ── */}
        <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut} activeOpacity={0.7}>
          <Text style={styles.signOutText}>SIGN OUT</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.deleteBtn, isDeleting && { opacity: 0.5 }]}
          onPress={handleDeleteAccount}
          activeOpacity={0.7}
          disabled={isDeleting}
        >
          <Text style={styles.deleteText}>{isDeleting ? 'Deleting…' : 'DELETE ACCOUNT'}</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },

  // Section eyebrow
  eyebrow: {
    color: Colors.gold,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: Spacing.sm,
    marginTop: Spacing.lg,
    marginLeft: Spacing.xs,
  },

  // Card container
  card: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    overflow: 'hidden',
  },

  // Card row
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
  },
  rowLabel: {
    color: Colors.textPrimary,
    fontSize: 15,
    flex: 1,
  },
  unblockText: {
    color: Colors.gold,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1,
  },
  rowValue: {
    color: Colors.textSecondary,
    fontSize: 15,
  },
  rowValueGold: {
    color: Colors.gold,
    fontSize: 15,
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  chevron: {
    color: Colors.textSecondary,
    fontSize: 18,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginHorizontal: Spacing.md,
  },

  // Sign Out button
  signOutBtn: {
    marginTop: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.gold,
    borderRadius: Radius.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
  signOutText: {
    color: Colors.gold,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 1,
  },

  // Delete Account button
  deleteBtn: {
    marginTop: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.red,
    borderRadius: Radius.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
  deleteText: {
    color: Colors.red,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 1,
  },
});
