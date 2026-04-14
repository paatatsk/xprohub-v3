import { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { Colors } from '../constants/theme';

const MIN_DISPLAY_MS = 2500;

export default function SplashScreenRoute() {
  const router = useRouter();
  const wordmarkOpacity = useRef(new Animated.Value(0)).current;
  const wordmarkTranslateY = useRef(new Animated.Value(24)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const glowScale = useRef(new Animated.Value(0.85)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;

  const [authChecked, setAuthChecked] = useState(false);
  const [destination, setDestination] = useState<'/(tabs)' | '/(onboarding)/welcome' | null>(null);
  const [timerDone, setTimerDone] = useState(false);

  // Hide native splash and run animations on mount
  useEffect(() => {
    SplashScreen.hideAsync();

    // Wordmark: fade up
    Animated.parallel([
      Animated.timing(wordmarkOpacity, {
        toValue: 1,
        duration: 420,
        useNativeDriver: true,
      }),
      Animated.timing(wordmarkTranslateY, {
        toValue: 0,
        duration: 420,
        useNativeDriver: true,
      }),
    ]).start();

    // Tagline: fade in after wordmark settles
    setTimeout(() => {
      Animated.timing(taglineOpacity, {
        toValue: 1,
        duration: 320,
        useNativeDriver: true,
      }).start();
    }, 380);

    // Glow: fade in then pulse
    setTimeout(() => {
      Animated.timing(glowOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start(() => {
        Animated.loop(
          Animated.sequence([
            Animated.timing(glowScale, {
              toValue: 1.15,
              duration: 1200,
              useNativeDriver: true,
            }),
            Animated.timing(glowScale, {
              toValue: 0.85,
              duration: 1200,
              useNativeDriver: true,
            }),
          ])
        ).start();
      });
    }, 200);
  }, []);

  // Auth check — 3-second timeout so a slow/offline Supabase never blocks navigation
  useEffect(() => {
    const fallback = setTimeout(() => {
      setDestination('/(onboarding)/welcome');
      setAuthChecked(true);
    }, 3000);

    supabase.auth.getSession().then(({ data: { session } }) => {
      clearTimeout(fallback);
      setDestination(session ? '/(tabs)' : '/(onboarding)/welcome');
      setAuthChecked(true);
    });

    return () => clearTimeout(fallback);
  }, []);

  // Minimum display timer
  useEffect(() => {
    const t = setTimeout(() => setTimerDone(true), MIN_DISPLAY_MS);
    return () => clearTimeout(t);
  }, []);

  // Navigate when both conditions are met
  useEffect(() => {
    if (authChecked && timerDone && destination) {
      router.replace(destination);
    }
  }, [authChecked, timerDone, destination]);

  return (
    <View style={styles.container}>
      {/* Gold glow behind wordmark */}
      <Animated.View
        style={[
          styles.glow,
          {
            opacity: glowOpacity,
            transform: [{ scale: glowScale }],
          },
        ]}
      />

      {/* Wordmark block */}
      <Animated.View
        style={{
          opacity: wordmarkOpacity,
          transform: [{ translateY: wordmarkTranslateY }],
          alignItems: 'center',
        }}
      >
        <Text style={styles.wordmark}>XPROHUB</Text>
        <Animated.Text style={[styles.tagline, { opacity: taglineOpacity }]}>
          Real Work. Fair Pay. For Everyone.
        </Animated.Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    width: 280,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.gold,
    opacity: 0.08,
    // Soft blur approximated via large border radius + low opacity layer stack
  },
  wordmark: {
    color: Colors.gold,
    fontSize: 42,
    fontWeight: '800',
    letterSpacing: 6,
    textAlign: 'center',
  },
  tagline: {
    color: Colors.textSecondary,
    fontSize: 13,
    letterSpacing: 0.4,
    textAlign: 'center',
    marginTop: 10,
  },
});
