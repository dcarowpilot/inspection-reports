"use client";

import Link from 'next/link';
import { usePlan } from '@/components/PlanProvider';

export default function AccountPage() {
  const { planKey, entitlements, loading } = usePlan();

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
        </div>
      </div>
    </main>
  );
}

