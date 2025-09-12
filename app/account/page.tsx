"use client";

import Link from 'next/link';
import { usePlan } from '@/components/PlanProvider';
import { supabase } from '@/lib/supabaseClient';

export default function AccountPage() {
  const { planKey, entitlements, loading } = usePlan();
  const enableFakeUpgrade = process.env.NEXT_PUBLIC_ENABLE_FAKE_UPGRADE === '1';

  async function setPlan(next: 'free' | 'premium' | 'super') {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not signed in');
      const { error } = await supabase
        .from('profiles' as any)
        .update({ plan: next })
        .eq('id', user.id);
      if (error) throw error;
      // Simple: refresh to let PlanProvider pick up the change
      window.location.reload();
    } catch (e: any) {
      alert(e.message ?? 'Failed to change plan');
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-center justify-between">
          <Link href="/home" className="rounded-md border px-3 py-1.5 hover:bg-gray-50">Home</Link>
          <h1 className="text-2xl font-semibold">Account</h1>
          <div />
        </div>

        <div className="rounded-xl border bg-white p-4">
          <h2 className="text-xl font-semibold mb-3">Your Plan</h2>
          {loading ? (
            <div>Loading…</div>
          ) : (
            <div className="space-y-2">
              <div><span className="font-medium">Plan:</span> {entitlements.name} ({planKey})</div>
              <div><span className="font-medium">Ads:</span> {entitlements.showAds ? 'Shown' : 'Hidden'}</div>
              <div><span className="font-medium">Limits:</span> {entitlements.maxReports} reports, {entitlements.maxItems} items/report, {entitlements.maxPhotosPerItem} photos/item</div>
            </div>
          )}

          <div className="mt-4 text-sm text-gray-600">
            Upgrades coming soon. You’ll be able to manage billing here.
          </div>

          {enableFakeUpgrade && (
            <div className="mt-4 border-t pt-4">
              <div className="mb-2 text-sm text-gray-700">Temporary testing controls (no billing):</div>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => setPlan('free')} className="rounded-md border px-3 py-1.5">Set Free</button>
                <button onClick={() => setPlan('premium')} className="rounded-md border px-3 py-1.5">Set Premium</button>
                <button onClick={() => setPlan('super')} className="rounded-md border px-3 py-1.5">Set Super Premium</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
