'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function HomePage() {
  const router = useRouter();
  const [draftCount, setDraftCount] = useState<number | null>(null);
  const [finalCount, setFinalCount] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);

  async function loadCounts() {
    const d = await supabase.from('reports').select('id', { count: 'exact', head: true }).eq('status', 'draft');
    const f = await supabase.from('reports').select('id', { count: 'exact', head: true }).eq('status', 'final');
    setDraftCount(d.count ?? 0);
    setFinalCount(f.count ?? 0);
  }
  useEffect(() => { loadCounts(); }, []);

  async function createDraft() {
    setCreating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Please sign in.');

      // IMPORTANT: no 'company' here — we use 'details'
      const { data: inserted, error } = await supabase
        .from('reports')
        .insert({
          status: 'draft',
          created_by: user.id,
          report_id: null,
          title: null,
          inspector_name: null,
          inspection_date: new Date().toISOString().slice(0, 10),
          details: null,
        })
        .select('id')
        .single();

      if (error) throw error;

      // create first blank item
      await supabase.from('report_items').insert({
        report_id: inserted.id,
        idx: 1,
        title: '',
        result: 'na',
        notes: '',
      });

      router.push(`/drafts/${inserted.id}`);
    } catch (e: any) {
      alert(e.message ?? 'Failed to create draft');
    } finally {
      setCreating(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-6xl space-y-8">
        <h1 className="text-2xl font-semibold">Home</h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Create New Draft (left) */}
          <button
            onClick={createDraft}
            disabled={creating}
            className="rounded-xl border bg-white p-6 text-left hover:shadow-md transition disabled:opacity-60"
          >
            <div className="text-lg font-semibold mb-1">Create New Draft</div>
            <div className="text-sm text-gray-600">Start a new report</div>
          </button>

          {/* View Draft Reports (middle) */}
          <Link
            href="/drafts"
            className="rounded-xl border bg-white p-6 hover:shadow-md transition"
          >
            <div className="text-lg font-semibold mb-1">
              View {draftCount ?? '…'} Draft Reports
            </div>
            <div className="text-sm text-gray-600">Edit existing drafts</div>
          </Link>

          {/* View Final Reports (right) */}
          <Link
            href="/final"
            className="rounded-xl border bg-white p-6 hover:shadow-md transition"
          >
            <div className="text-lg font-semibold mb-1">
              View {finalCount ?? '…'} Final Reports
            </div>
            <div className="text-sm text-gray-600">Download / share / revert</div>
          </Link>
        </div>
      </div>
    </main>
  );
}
