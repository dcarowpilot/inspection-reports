"use client";

import { useEffect, useMemo } from 'react';
import { usePlan } from '@/components/PlanProvider';

declare global {
  interface Window {
    adsbygoogle?: any[];
  }
}

function AdScriptLoader() {
  useEffect(() => {
    const client = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID;
    if (!client) return;
    // Avoid multiple injections
    const id = 'adsbygoogle-js';
    if (document.getElementById(id)) return;
    const s = document.createElement('script');
    s.id = id;
    s.async = true;
    s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}`;
    s.crossOrigin = 'anonymous';
    document.head.appendChild(s);
  }, []);
  return null;
}

function AdSlot({ slot }: { slot?: string }) {
  useEffect(() => {
    try {
      // Push after the ins mounts
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      /* ignore */
    }
  }, []);

  const client = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID;
  const adSlot = slot || process.env.NEXT_PUBLIC_ADSENSE_SLOT_SIDEBAR;
  const adTest = process.env.NODE_ENV !== 'production' ? 'on' : undefined;
  const forcePlaceholders = process.env.NEXT_PUBLIC_ADS_PLACEHOLDERS === '1';
  const showPlaceholder = forcePlaceholders || !client || !adSlot;
  if (showPlaceholder) {
    return (
      <div className="flex items-center justify-center w-[160px] h-[600px] border border-dashed border-gray-300 bg-gray-50 text-gray-500 text-xs select-none">
        Ad Placeholder 160×600
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <ins
      className="adsbygoogle block w-[160px] h-[600px] bg-white"
      style={{ display: 'block' }}
      data-ad-client={client}
      data-ad-slot={adSlot}
      data-ad-format="auto"
      data-full-width-responsive="true"
      data-adtest={adTest as any}
    />
  );
}

export default function AdSenseRails() {
  const { entitlements } = usePlan();
  const enabled = useMemo(() => Boolean(entitlements.showAds), [entitlements.showAds]);
  const client = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID;
  const forcePlaceholders = process.env.NEXT_PUBLIC_ADS_PLACEHOLDERS === '1';

  if (!enabled) return null;

  return (
    <>
      {!forcePlaceholders && client ? <AdScriptLoader /> : null}
      {/* Left rail */}
      <div className="hidden lg:block fixed top-28 left-4 z-10">
        <AdSlot />
      </div>
      {/* Right rail */}
      <div className="hidden lg:block fixed top-28 right-4 z-10">
        <AdSlot />
      </div>
    </>
  );
}
