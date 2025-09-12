"use client";

import Link from 'next/link';
import { PLANS } from '@/lib/plan';

export default function UpgradeModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative z-10 w-[min(92vw,760px)] rounded-xl border bg-white p-5 shadow-lg">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-xl font-semibold">Upgrade to unlock more</h2>
          <button onClick={onClose} className="rounded-md border px-2 py-1">Close</button>
        </div>
        <p className="mt-2 text-sm text-gray-600">Free includes basic limits. Premium and Super Premium increase report, item, and photo limits and remove ads.</p>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
          {(['free','premium','super'] as const).map((k) => (
            <div key={k} className="rounded-lg border p-3">
              <div className="font-semibold">{PLANS[k].name}</div>
              <div className="text-gray-700 mt-1">${PLANS[k].price.toFixed(2)}</div>
              <ul className="mt-2 space-y-1">
                <li>Reports: {PLANS[k].maxReports}</li>
                <li>Items/report: {PLANS[k].maxItems}</li>
                <li>Photos/item: {PLANS[k].maxPhotosPerItem}</li>
                <li>Download .docx: {PLANS[k].canDownloadDocx ? 'Yes' : 'No'}</li>
                <li>Templates: {PLANS[k].canCreateTemplates ? 'Yes' : 'No'}</li>
                <li>Ads: {PLANS[k].showAds ? 'Shown' : 'Hidden'}</li>
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-4 flex items-center justify-end gap-2">
          <Link href="/account" onClick={onClose} className="rounded-md bg-black text-white px-3 py-1.5">Go to Account</Link>
        </div>
      </div>
    </div>
  );
}

