import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export function useIsWorker(): { isWorker: boolean; loading: boolean } {
  const [isWorker, setIsWorker] = useState(false);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        setIsWorker(false);
        setLoading(false);
        return;
      }

      supabase
        .from('worker_skills')
        .select('id')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle()
        .then(({ data }) => {
          setIsWorker(data !== null);
          setLoading(false);
        });
    });
  }, []);

  return { isWorker, loading };
}
