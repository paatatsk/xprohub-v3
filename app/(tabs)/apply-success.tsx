import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors, Radius, Spacing } from '../../constants/theme';

// Apply Success — confirmation screen after bid submitted
// Forward-only: no back navigation. Both buttons use router.replace.

export default function ApplySuccessScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.inner}>

        {/* ── Centered confirmation ── */}
        <View style={styles.centerContent}>
          <View style={styles.iconRing}>
            <Text style={styles.iconGlyph}>✉️</Text>
          </View>

          <Text style={styles.heading}>APPLICATION SENT</Text>

          <Text style={styles.subhead}>
            You'll be notified when the customer responds.
          </Text>

          <Text style={styles.body}>
            If the customer accepts your application, a chat will open and you
            can coordinate details.
          </Text>
        </View>

        {/* ── CTA buttons ── */}
        <View style={styles.btnStack}>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => router.replace('/(tabs)/market')}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryBtnText}>BROWSE MORE JOBS</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => router.replace('/(tabs)')}
            activeOpacity={0.85}
          >
            <Text style={styles.secondaryBtnText}>BACK TO HOME</Text>
          </TouchableOpacity>
        </View>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  inner: {
    flex: 1,
    padding: Spacing.md,
    justifyContent: 'space-between',
  },

  // Centered content
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingHorizontal: Spacing.md,
  },
  iconRing: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 2,
    borderColor: Colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  iconGlyph: { fontSize: 44 },
  heading: {
    color: Colors.gold,
    fontWeight: 'bold',
    fontSize: 26,
    letterSpacing: 2,
    textAlign: 'center',
  },
  subhead: {
    color: Colors.textPrimary,
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  body: {
    color: Colors.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Buttons
  btnStack: { gap: 12, paddingTop: Spacing.md },
  primaryBtn: {
    backgroundColor: Colors.gold,
    borderRadius: Radius.md,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: Colors.background,
    fontWeight: 'bold',
    fontSize: 14,
    letterSpacing: 2,
  },
  secondaryBtn: {
    borderWidth: 1.5,
    borderColor: Colors.gold,
    borderRadius: Radius.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryBtnText: {
    color: Colors.gold,
    fontWeight: 'bold',
    fontSize: 14,
    letterSpacing: 2,
  },
});
