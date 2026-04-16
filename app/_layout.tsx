import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';

SplashScreen.preventAutoHideAsync();

const AUTH_TIMEOUT_MS = 3000;

export default function RootLayout() {
  const { session, loading } = useAuth();
  const router = useRouter();
  const segments = useSegments();
  const timedOut = useRef(false);

  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (loading) {
        timedOut.current = true;
        router.replace('/(onboarding)/welcome');
      }
    }, AUTH_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (loading) return;

    const onSplash = segments[0] === 'splash' || segments.length === 0;
    const inAuthGroup = segments[0] === '(auth)';
    const inOnboarding = segments[0] === '(onboarding)';
    const inTabs = segments[0] === '(tabs)';
    const alreadyOnProfileSetup = inOnboarding && segments[1] === 'profile-setup';

    if (onSplash) return;

    if (!session) {
      if (!inAuthGroup && !inOnboarding) {
        router.replace('/(onboarding)/welcome');
      }
      return;
    }

    // Authenticated user already at the right destination — do nothing.
    if (inTabs || alreadyOnProfileSetup) return;

    // Authenticated user is somewhere that isn't their final destination
    // (just signed up, coming back from welcome/login, or app cold-start).
    // Check Supabase to decide: new user → profile-setup, returning → tabs.
    supabase
      .from('profiles')
      .select('full_name')
      .eq('id', session.user.id)
      .single()
      .then(({ data }) => {
        if (data?.full_name) {
          router.replace('/(tabs)');
        } else {
          router.replace('/(onboarding)/profile-setup');
        }
      });
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