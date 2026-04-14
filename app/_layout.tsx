import { useEffect, useRef } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useAuth } from '../hooks/useAuth';

SplashScreen.preventAutoHideAsync();

const AUTH_TIMEOUT_MS = 3000;

export default function RootLayout() {
  const { session, loading } = useAuth();
  const router = useRouter();
  const segments = useSegments();
  const timedOut = useRef(false);

  // Drop the native Expo splash immediately so the JS screen renders
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  // Escape hatch — if auth hasn't resolved in 3s, go to welcome anyway
  useEffect(() => {
    const timer = setTimeout(() => {
      if (loading) {
        timedOut.current = true;
        router.replace('/(onboarding)/welcome');
      }
    }, AUTH_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, []);

  // Normal auth-aware routing once loading resolves
  useEffect(() => {
    if (loading) return;

    const onSplash = segments[0] === 'splash' || segments.length === 0;
    const inAuthGroup = segments[0] === '(auth)';
    const inOnboarding = segments[0] === '(onboarding)';

    // Splash screen handles its own routing — don't interfere
    if (onSplash) return;

    if (!session && !inAuthGroup && !inOnboarding) {
      router.replace('/(onboarding)/welcome');
    } else if (session && (inAuthGroup || inOnboarding)) {
      router.replace('/(tabs)');
    }
  }, [session, loading, segments]);

  return (
    <>
      <StatusBar style="light" backgroundColor="#0E0E0F" />
      <Stack initialRouteName="splash" screenOptions={{ headerShown: false }}>
        <Stack.Screen name="splash" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(onboarding)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="job/[id]" />
      </Stack>
    </>
  );
}
