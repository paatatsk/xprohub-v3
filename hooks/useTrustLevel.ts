import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

type TrustLevel = 'explorer' | 'starter' | 'pro';

export function useTrustLevel(): {
  trustLevel: TrustLevel | null;
  loading: boolean;
  refresh: () => Promise<void>;
} {
  const [trustLevel, setTrustLevel] = useState<TrustLevel | null>(null);
  const [loading, setLoading]       = useState(true);

  const fetch = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setTrustLevel(null);
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from('profiles')
      .select('trust_level')
      .eq('id', user.id)
      .single();
    setTrustLevel((data?.trust_level as TrustLevel) ?? null);
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  return { trustLevel, loading, refresh: fetch };
}
