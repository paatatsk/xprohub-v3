import { useState } from 'react';
import {
  View, Text, TextInput, StyleSheet,
  TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/Button';
import { Colors, Spacing, Radius } from '../../constants/theme';

export default function SignUpScreen() {
  const router = useRouter();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [done, setDone]         = useState(false);

  async function handleSignUp() {
    setError('');
    if (!email.trim() || !password || !confirm) {
      setError('Please fill in all fields.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    const { error: authError } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
    });
    setLoading(false);
    if (authError) {
      setError(authError.message);
    } else {
      setDone(true);
    }
  }

  if (done) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.confirmedContainer}>
          <Text style={styles.confirmedIcon}>✓</Text>
          <Text style={styles.title}>CHECK YOUR EMAIL</Text>
          <Text style={styles.confirmedText}>
            We sent a confirmation link to{'\n'}
            <Text style={styles.confirmedEmail}>{email}</Text>
          </Text>
          <Text style={styles.confirmedHint}>
            Click the link in the email to activate your account, then come back and sign in.
          </Text>
          <View style={styles.buttonRow}>
            <Button label="GO TO SIGN IN" onPress={() => router.replace('/(auth)/login')} />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <TouchableOpacity style={styles.backButton} onPress={() => router.replace('/(onboarding)/welcome')} activeOpacity={0.7}>
        <Text style={styles.backArrow}>←</Text>
      </TouchableOpacity>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.kav}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

          <Text style={styles.title}>CREATE ACCOUNT</Text>
          <Text style={styles.sub}>Join XProHub — work, earn, repeat.</Text>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor={Colors.textSecondary}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="At least 6 characters"
            placeholderTextColor={Colors.textSecondary}
            secureTextEntry
          />

          <Text style={styles.label}>Confirm Password</Text>
          <TextInput
            style={styles.input}
            value={confirm}
            onChangeText={setConfirm}
            placeholder="Repeat your password"
            placeholderTextColor={Colors.textSecondary}
            secureTextEntry
          />

          <View style={styles.buttonRow}>
            <Button label="CREATE ACCOUNT" onPress={handleSignUp} loading={loading} />
          </View>

          <View style={styles.switchRow}>
            <Text style={styles.switchText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => router.replace('/(auth)/login')}>
              <Text style={styles.switchLink}>Sign in</Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:       { flex: 1, backgroundColor: Colors.background },
  backButton: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm, paddingBottom: Spacing.xs, alignSelf: 'flex-start' },
  backArrow:  { color: Colors.gold, fontSize: 28, lineHeight: 32 },
  kav:  { flex: 1 },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xl,
  },
  title: {
    color: Colors.gold,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: Spacing.xs,
  },
  sub: {
    color: Colors.textSecondary,
    fontSize: 15,
    marginBottom: Spacing.xl,
  },
  errorText: {
    color: Colors.red,
    fontSize: 14,
    marginBottom: Spacing.md,
    backgroundColor: '#2A1515',
    padding: Spacing.sm,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.red,
  },
  label: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: Spacing.xs,
    marginTop: Spacing.md,
  },
  input: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    color: Colors.textPrimary,
    fontSize: 16,
    height: 52,
    paddingHorizontal: Spacing.md,
  },
  buttonRow: {
    marginTop: Spacing.xl,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: Spacing.lg,
  },
  switchText: {
    color: Colors.textSecondary,
    fontSize: 14,
  },
  switchLink: {
    color: Colors.gold,
    fontSize: 14,
    fontWeight: '600',
  },
  // Email confirmation state
  confirmedContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },
  confirmedIcon: {
    fontSize: 56,
    color: Colors.green,
    marginBottom: Spacing.lg,
  },
  confirmedText: {
    color: Colors.textSecondary,
    fontSize: 15,
    textAlign: 'center',
    marginTop: Spacing.md,
    lineHeight: 22,
  },
  confirmedEmail: {
    color: Colors.gold,
    fontWeight: '700',
  },
  confirmedHint: {
    color: Colors.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    marginTop: Spacing.lg,
    lineHeight: 20,
    paddingHorizontal: Spacing.md,
  },
});
