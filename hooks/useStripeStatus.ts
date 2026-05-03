import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export enum StripeStatus {
  NOT_STARTED    = 'not_started',
  IN_PROGRESS    = 'in_progress',
  CHARGES_ACTIVE = 'charges_active',
  FULLY_VERIFIED = 'fully_verified',
}

function deriveState(
  accountId: string | null,
  charges:   boolean,
  payouts:   boolean,
): StripeStatus {
  if (!accountId)          return StripeStatus.NOT_STARTED;
  if (charges && payouts)  return StripeStatus.FULLY_VERIFIED;
  if (charges && !payouts) return StripeStatus.CHARGES_ACTIVE;
  return StripeStatus.IN_PROGRESS;
}

export function useStripeStatus() {
  const [stripeAccountId,       setStripeAccountId]       = useState<string | null>(null);
  const [chargesEnabled,        setChargesEnabled]        = useState(false);
  const [payoutsEnabled,        setPayoutsEnabled]        = useState(false);
  const [onboardingCompletedAt, setOnboardingCompletedAt] = useState<string | null>(null);
  const [derivedState,          setDerivedState]          = useState<StripeStatus | null>(null);
  const [loading,               setLoading]               = useState(true);
  const [error,                 setError]                 = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setError(null);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError('Session expired. Please sign in again.');
      setLoading(false);
      return;
    }
    const { data, error: dbError } = await supabase
      .from('profiles')
      .select('stripe_account_id, stripe_charges_enabled, stripe_payouts_enabled, stripe_onboarding_completed_at')
      .eq('id', user.id)
      .single();
    if (dbError || !data) {
      setError('Unable to load account status. Please try again.');
      setLoading(false);
      return;
    }
    setStripeAccountId(data.stripe_account_id ?? null);
    setChargesEnabled(data.stripe_charges_enabled ?? false);
    setPayoutsEnabled(data.stripe_payouts_enabled ?? false);
    setOnboardingCompletedAt(data.stripe_onboarding_completed_at ?? null);
    setDerivedState(deriveState(
      data.stripe_account_id,
      data.stripe_charges_enabled ?? false,
      data.stripe_payouts_enabled ?? false,
    ));
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  return {
    stripeAccountId, chargesEnabled, payoutsEnabled, onboardingCompletedAt,
    derivedState, loading, error,
    refresh: fetch,
  };
}
