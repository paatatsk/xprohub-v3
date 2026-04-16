import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView, Platform,
  ScrollView,
  StyleSheet,
  Text, TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Radius, Spacing } from '../../constants/theme';
import { supabase } from '../../lib/supabase';

export default function ProfileSetupScreen() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function pickImage() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError('Photo library permission is required to set a profile photo.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      setAvatarUri(result.assets[0].uri);
      setError('');
    }
  }

  async function handleContinue() {
    if (!fullName.trim()) {
      setError('Please enter your full name.');
      return;
    }
    setError('');
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError('Session expired. Please sign in again.');
      setLoading(false);
      return;
    }

    let avatarUrl: string | null = null;

    if (avatarUri) {
      const ext = avatarUri.split('.').pop() ?? 'jpg';
      const fileName = `${user.id}/avatar.${ext}`;
      const response = await fetch(avatarUri);
      const blob = await response.blob();

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, blob, { upsert: true, contentType: `image/${ext}` });

      if (!uploadError) {
        const { data: urlData } = supabase.storage
          .from('avatars')
          .getPublicUrl(fileName);
        avatarUrl = urlData.publicUrl;
      }
    }

    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        full_name: fullName.trim(),
        ...(avatarUrl ? { avatar_url: avatarUrl } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    setLoading(false);

    if (profileError) {
      setError(profileError.message);
      return;
    }

    router.replace('/(tabs)');
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.kav}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.eyebrow}>WELCOME TO XPROHUB</Text>
          <Text style={styles.title}>SET UP YOUR{'\n'}PROFILE</Text>
          <Text style={styles.sub}>
            This is how the community will know you.
          </Text>

          <TouchableOpacity style={styles.avatarContainer} onPress={pickImage} activeOpacity={0.8}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarIcon}>+</Text>
                <Text style={styles.avatarLabel}>ADD PHOTO</Text>
                <Text style={styles.avatarHint}>optional</Text>
              </View>
            )}
            {avatarUri && (
              <View style={styles.avatarEditBadge}>
                <Text style={styles.avatarEditText}>EDIT</Text>
              </View>
            )}
          </TouchableOpacity>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <Text style={styles.label}>Full Name</Text>
          <TextInput
            style={styles.input}
            value={fullName}
            onChangeText={setFullName}
            placeholder="Your full name"
            placeholderTextColor={Colors.textSecondary}
            autoCapitalize="words"
            autoCorrect={false}
            returnKeyType="done"
            onSubmitEditing={handleContinue}
          />

          <Text style={styles.hint}>
            You can add more details — skills, location, bio — once you're inside.
          </Text>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleContinue}
            activeOpacity={0.85}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={Colors.background} />
            ) : (
              <Text style={styles.buttonText}>LET'S GO →</Text>
            )}
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  kav: { flex: 1 },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xl,
  },
  eyebrow: {
    color: Colors.gold,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 3,
    marginBottom: Spacing.xs,
  },
  title: {
    color: Colors.textPrimary,
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: 0.5,
    lineHeight: 40,
    marginBottom: Spacing.sm,
  },
  sub: {
    color: Colors.textSecondary,
    fontSize: 15,
    marginBottom: Spacing.xl,
    lineHeight: 22,
  },
  avatarContainer: {
    alignSelf: 'center',
    marginBottom: Spacing.xl,
  },
  avatarPlaceholder: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 2,
    borderColor: Colors.gold,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.card,
  },
  avatarImage: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 2,
    borderColor: Colors.gold,
  },
  avatarIcon: {
    color: Colors.gold,
    fontSize: 28,
    fontWeight: '300',
    lineHeight: 32,
  },
  avatarLabel: {
    color: Colors.gold,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginTop: 2,
  },
  avatarHint: {
    color: Colors.textSecondary,
    fontSize: 10,
    marginTop: 2,
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: Colors.gold,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  avatarEditText: {
    color: Colors.background,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 14,
    marginBottom: Spacing.md,
    backgroundColor: '#2A1515',
    padding: Spacing.sm,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: '#FF6B6B',
  },
  label: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: Spacing.xs,
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
  hint: {
    color: Colors.textSecondary,
    fontSize: 13,
    marginTop: Spacing.md,
    lineHeight: 19,
  },
  button: {
    backgroundColor: Colors.gold,
    borderRadius: Radius.md,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.xl,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: Colors.background,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
});