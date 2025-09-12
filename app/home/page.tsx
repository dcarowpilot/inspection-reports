'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function Home() {
  const router = useRouter();
  const [draftCount, setDraftCount] = useState<number | null>(null);
  const [finalCount, setFinalCount] = useState<number | null>(null);

  useEffect(() => {
    const loadCounts = async () => {
      const { count: dCount } = await supabase
        .from('reports')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'draft');
      setDraftCount(dCount ?? 0);

      const { count: fCount } = await supabase
        .from('reports')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'final');
      setFinalCount(fCount ?? 0);
    };
    loadCounts();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    router.replace('/'); // or '/login' if you have one
  };

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <div className="mb-6 flex items-center gap-3">
        <h1 className="text-3xl font-semibold text-slate-900">Home</h1>
        <Link
          href="/account"
          className="ml-auto rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Account
        </Link>
        <button
          onClick={signOut}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Sign out
        </button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Link
          href="/drafts/new"
          className="block rounded-2xl border border-slate-200 p-6 hover:shadow-sm"
        >
          <h2 className="text-xl font-semibold text-slate-900">Create New Draft</h2>
          <p className="mt-2 text-slate-600">Start a new report</p>
        </Link>

        <Link
          href="/drafts"
          className="block rounded-2xl border border-slate-200 p-6 hover:shadow-sm"
        >
          <h2 className="text-xl font-semibold text-slate-900">
            View {draftCount ?? '…'} Draft Reports
          </h2>
          <p className="mt-2 text-slate-600">Edit existing drafts</p>
        </Link>

        <Link
          href="/final"
          className="block rounded-2xl border border-slate-200 p-6 hover:shadow-sm"
        >
          <h2 className="text-xl font-semibold text-slate-900">
            View {finalCount ?? '…'} Final Reports
          </h2>
          <p className="mt-2 text-slate-600">Download / share</p>
        </Link>
      </div>
    </div>
  );
}
