"use client";

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import type { PlanKey, Entitlements } from '@/lib/plan';
import { getEntitlements } from '@/lib/plan';

type PlanContextValue = {
  planKey: PlanKey;
  entitlements: Entitlements;
  loading: boolean;
};

const PlanContext = createContext<PlanContextValue>({
  planKey: 'free',
  entitlements: getEntitlements('free'),
  loading: true,
});

export function usePlan() {
  return useContext(PlanContext);
}

export default function PlanProvider({ children }: { children: React.ReactNode }) {
  const [planKey, setPlanKey] = useState<PlanKey>('free');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const override = process.env.NEXT_PUBLIC_PLAN_OVERRIDE as PlanKey | undefined;
      if (override && ['free','premium','super'].includes(override)) {
        console.warn('[PlanProvider] Using NEXT_PUBLIC_PLAN_OVERRIDE =', override);
        if (mounted) { setPlanKey(override); setLoading(false); }
        return;
      }
      try {
        // Try to read the user's plan from a `profiles` table.
        const { data: auth } = await supabase.auth.getUser();
        const user = auth?.user;
        if (!user) {
          if (mounted) setPlanKey('free');
          return;
        }
        const { data, error } = await supabase
          .from('profiles' as any)
          .select('plan')
          .eq('id', user.id)
          .single();
        if (error) {
          // Table/column may not exist yet in early deployments. Default to free.
          console.warn('[PlanProvider] Falling back to free plan:', error.message);
          if (mounted) setPlanKey('free');
        } else {
          const key = ((data as any)?.plan ?? 'free') as PlanKey;
          if (mounted) setPlanKey(key);
        }
      } catch (e) {
        console.warn('[PlanProvider] Plan fetch error, using free.', e);
        if (mounted) setPlanKey('free');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const value = useMemo<PlanContextValue>(
    () => ({ planKey, entitlements: getEntitlements(planKey), loading }),
    [planKey, loading]
  );

  return <PlanContext.Provider value={value}>{children}</PlanContext.Provider>;
}
