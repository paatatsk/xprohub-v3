import { useEffect, useState } from 'react';
import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';

// NOTE: AsyncStorage is unencrypted — acceptable for Expo Go testing.
// Replace with expo-secure-store before App Store submission.
const CREDS_KEY = 'xprohub_biometric_creds';

interface StoredCredentials {
  email: string;
  password: string;
}

export function useBiometrics() {
  const [isAvailable, setIsAvailable] = useState(false);
  const [hasCredentials, setHasCredentials] = useState(false);

  useEffect(() => {
    async function check() {
      const hardware = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      setIsAvailable(hardware && enrolled);

      const stored = await AsyncStorage.getItem(CREDS_KEY);
      setHasCredentials(stored !== null);
    }
    check();
  }, []);

  async function authenticate(): Promise<boolean> {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Sign in to XProHub',
      fallbackLabel: 'Use password instead',
      disableDeviceFallback: false,
    });
    return result.success;
  }

  async function saveCredentials(email: string, password: string): Promise<void> {
    await AsyncStorage.setItem(CREDS_KEY, JSON.stringify({ email, password }));
    setHasCredentials(true);
  }

  async function getCredentials(): Promise<StoredCredentials | null> {
    const stored = await AsyncStorage.getItem(CREDS_KEY);
    if (!stored) return null;
    return JSON.parse(stored) as StoredCredentials;
  }

  async function clearCredentials(): Promise<void> {
    await AsyncStorage.removeItem(CREDS_KEY);
    setHasCredentials(false);
  }

  return { isAvailable, hasCredentials, authenticate, saveCredentials, getCredentials, clearCredentials };
}
