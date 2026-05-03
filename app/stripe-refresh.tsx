import { useEffect } from 'react';
import { useRouter } from 'expo-router';

export default function StripeRefresh() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/(tabs)/stripe-connect' as any);
  }, []);
  return null;
}
