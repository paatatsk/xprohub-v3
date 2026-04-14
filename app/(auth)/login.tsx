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

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  async function handleLogin() {
    setError('');
    if (!email.trim() || !password) {
      setError('Please enter your email and password.');
      return;
    }
    setLoading(true);
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    setLoading(false);
    if (authError) {
      setError(authError.message);
    }
    // On success: _layout.tsx detects the new session and redirects to /(tabs)
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

          <Text style={styles.title}>WELCOME BACK</Text>
          <Text style={styles.sub}>Sign in to your XProHub account</Text>

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
            placeholder="••••••••"
            placeholderTextColor={Colors.textSecondary}
            secureTextEntry
          />

          <TouchableOpacity onPress={() => router.push('/(auth)/forgot-password')} style={styles.forgotRow}>
            <Text style={styles.forgotText}>Forgot password?</Text>
          </TouchableOpacity>

          <View style={styles.buttonRow}>
            <Button label="SIGN IN" onPress={handleLogin} loading={loading} />
          </View>

          <View style={styles.switchRow}>
            <Text style={styles.switchText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => router.replace('/(auth)/signup')}>
              <Text style={styles.switchLink}>GET STARTED</Text>
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
  forgotRow: {
    alignItems: 'flex-end',
    marginTop: Spacing.sm,
  },
  forgotText: {
    color: Colors.gold,
    fontSize: 13,
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
});
