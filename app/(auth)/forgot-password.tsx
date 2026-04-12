import { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/Button';
import { Colors, Spacing, Radius } from '../../constants/theme';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail]   = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent]     = useState(false);
  const [error, setError]   = useState('');

  async function handleReset() {
    setError('');
    if (!email.trim()) { setError('Please enter your email.'); return; }
    setLoading(true);
    const { error: e } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase());
    setLoading(false);
    if (e) { setError(e.message); } else { setSent(true); }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        {sent ? (
          <>
            <Text style={styles.title}>EMAIL SENT</Text>
            <Text style={styles.sub}>Check your inbox for a reset link.</Text>
            <View style={styles.buttonRow}>
              <Button label="BACK TO SIGN IN" onPress={() => router.replace('/(auth)/login')} />
            </View>
          </>
        ) : (
          <>
            <Text style={styles.title}>RESET PASSWORD</Text>
            <Text style={styles.sub}>Enter your email and we'll send a reset link.</Text>
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
            <View style={styles.buttonRow}>
              <Button label="SEND RESET LINK" onPress={handleReset} loading={loading} />
            </View>
            <TouchableOpacity onPress={() => router.back()} style={styles.backRow}>
              <Text style={styles.backText}>← Back to Sign In</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:      { flex: 1, backgroundColor: Colors.background },
  container: { flex: 1, justifyContent: 'center', paddingHorizontal: Spacing.lg },
  title:     { color: Colors.gold, fontSize: 28, fontWeight: '800', letterSpacing: 1, marginBottom: Spacing.xs },
  sub:       { color: Colors.textSecondary, fontSize: 15, marginBottom: Spacing.xl },
  errorText: {
    color: Colors.red, fontSize: 14, marginBottom: Spacing.md,
    backgroundColor: '#2A1515', padding: Spacing.sm,
    borderRadius: Radius.sm, borderWidth: 1, borderColor: Colors.red,
  },
  label:     { color: Colors.textPrimary, fontSize: 14, fontWeight: '600', marginBottom: Spacing.xs },
  input: {
    backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border,
    borderRadius: Radius.md, color: Colors.textPrimary, fontSize: 16,
    height: 52, paddingHorizontal: Spacing.md,
  },
  buttonRow: { marginTop: Spacing.xl },
  backRow:   { alignItems: 'center', marginTop: Spacing.lg },
  backText:  { color: Colors.gold, fontSize: 14 },
});
