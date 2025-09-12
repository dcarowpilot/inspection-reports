'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

type DraftRow = {
  id: string;
  inspection_date: string | null;
  inspector_name: string | null;
  report_id: string | null;
  title: string | null;
  status: 'draft' | 'final';
};

export default function DraftsPage() {
  const router = useRouter();
  const [rows, setRows] = useState<DraftRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from('reports')
      .select('id, inspection_date, report_id, title, status')
      .eq('status', 'draft')
      .order('inspection_date', { ascending: false });

    if (error) alert(error.message);
    else setRows((data ?? []) as DraftRow[]);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  // Row open
  function openDraft(id: string) {
    router.push(`/drafts/${id}`);
  }

  // Create a brand-new draft and open it
  async function newDraft() {
    setCreating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Please sign in first.');

      // Create report
      const { data: inserted, error } = await supabase
        .from('reports')
        .insert({
          status: 'draft',
          created_by: user.id,
          report_id: null,
          title: null,
          inspector_name: null,
          inspection_date: new Date().toISOString().slice(0, 10),
          details: null, // stored but not displayed on the list
        })
        .select('id')
        .single();

      if (error) throw error;

      // Start with one blank item
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

  // Delete a draft (and its items/photos)
  async function deleteDraft(e: any, reportId: string) {
    e.stopPropagation();
    if (!confirm('Delete this draft? There is no recovery of deleted items.')) return;

    setDeleting(reportId);
    try {
      const { data: items } = await supabase
        .from('report_items')
        .select('id')
        .eq('report_id', reportId);
      const itemIds = (items ?? []).map((i: any) => i.id);

      if (itemIds.length) {
        const { data: photos } = await supabase
          .from('report_item_photos')
          .select('storage_path')
          .in('report_item_id', itemIds);

        const paths = (photos ?? []).map((p: any) => p.storage_path).filter(Boolean);
        if (paths.length) await supabase.storage.from('photos').remove(paths);
        if ((photos ?? []).length) {
          await supabase.from('report_item_photos').delete().in('report_item_id', itemIds);
        }
      }

      await supabase.from('report_items').delete().eq('report_id', reportId);
      const { error } = await supabase.from('reports').delete().eq('id', reportId);
      if (error) throw error;

      setRows(prev => prev.filter(r => r.id !== reportId));
    } catch (err: any) {
      alert(err.message ?? 'Delete failed');
    } finally {
      setDeleting(null);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/home" className="rounded-md border px-3 py-1.5 hover:bg-gray-50">Home</Link>
            <h1 className="text-2xl font-semibold ml-1">Draft Reports</h1>
            <Link href="/account" className="rounded-md border px-3 py-1.5 hover:bg-gray-50">Account</Link>
          </div>
          <button
            onClick={newDraft}
            disabled={creating}
            className="rounded-md bg-black text-white px-3 py-1.5 disabled:opacity-60"
          >
            {creating ? 'Creating…' : 'New Draft'}
          </button>
        </div>

        <div className="rounded-xl border bg-white overflow-hidden w-fit max-w-full mx-auto">
          <table className="w-auto table-auto text-sm border-separate border-spacing-0">
            <thead>
              <tr className="bg-gray-50 text-left">
                <th className="p-3 whitespace-nowrap">Inspection Date</th>
                
                <th className="p-3 whitespace-nowrap">Report ID</th>
                <th className="p-3">Report Title</th>
                <th className="p-3 w-[180px]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="p-4">Loading…</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={5} className="p-4 text-gray-600">No drafts yet.</td></tr>
              ) : (
                rows.map((r) => {
                  const onKey = (e: any) => {
                    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDraft(r.id); }
                  };
                  return (
                    <tr
                      key={r.id}
                      className="border-t hover:bg-gray-50 cursor-pointer"
                      tabIndex={0}
                      role="button"
                      aria-label={`Open draft ${r.report_id || r.title || r.inspection_date || r.id}`}
                      onClick={() => openDraft(r.id)}
                      onKeyDown={onKey}
                    >
                      <td className="p-3 whitespace-nowrap">{r.inspection_date ?? ''}</td>
                      
                      <td className="p-3 whitespace-nowrap">
                        <Link
                          href={`/drafts/${r.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="underline"
                        >
                          {r.report_id ?? ''}
                        </Link>
                      </td>
                      <td className="p-3">{r.title ?? ''}</td>
                      <td className="p-3">
                        <button
                          className="rounded-md border px-2 py-1 hover:bg-gray-50"
                          onClick={(e) => deleteDraft(e, r.id)}
                          disabled={deleting === r.id}
                          title="Delete draft"
                        >
                          {deleting === r.id ? 'Deleting…' : 'Delete'}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
