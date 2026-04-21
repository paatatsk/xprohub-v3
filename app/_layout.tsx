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

  // Refs keep the timeout closure from reading stale values.
  // Without these, the timeout captures loading=true at mount and ALWAYS
  // fires router.replace even after auth has resolved (~3s flash).
  const loadingRef = useRef(loading);
  const segmentsRef = useRef(segments);
  useEffect(() => { loadingRef.current = loading; }, [loading]);
  useEffect(() => { segmentsRef.current = segments; }, [segments]);

  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      // Use ref — not the stale closure value — to check real current state.
      if (!loadingRef.current) return; // auth already resolved, nothing to do
      timedOut.current = true;
      // Guard: don't replace if already on welcome
      const segs = segmentsRef.current;
      if (segs[0] === '(onboarding)' && segs[1] === 'welcome') return;
      router.replace('/(onboarding)/welcome');
    }, AUTH_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (loading) return;

    const onSplash = segments[0] === 'splash' || segments.length === 0;
    const inAuthGroup = segments[0] === '(auth)';
    const inOnboarding = segments[0] === '(onboarding)';
    const inTabs = segments[0] === '(tabs)';
    // Onboarding screens that authenticated users may legitimately land on
    const onAllowedOnboarding = inOnboarding && (
      segments[1] === 'profile-setup' ||
      segments[1] === 'become-worker'  ||
      segments[1] === 'verify-level-2'
    );

    if (onSplash) return;

    if (!session) {
      // Guard: already on welcome — do nothing, avoids re-mount flash
      if (inOnboarding && segments[1] === 'welcome') return;
      if (!inAuthGroup && !inOnboarding) {
        router.replace('/(onboarding)/welcome');
      }
      return;
    }

    // Authenticated user already at the right destination — do nothing.
    if (inTabs || onAllowedOnboarding) return;

    // Authenticated user is somewhere that isn't their final destination
    // (just signed up, coming back from welcome/login, or app cold-start).
    // Check Supabase to decide: new user → profile-setup, returning → tabs.
    supabase
      .from('profiles')
      .select('full_name')
      .eq('id', session.user.id)
      .single()
      .then(({ data }) => {
        // Guard: read current segments via ref — this callback is async and
        // segments in the outer closure may be stale by the time it runs.
        if (segmentsRef.current[0] === '(tabs)') return;
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