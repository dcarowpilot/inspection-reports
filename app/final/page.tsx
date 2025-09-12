'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

type FinalRow = {
  id: string;
  inspection_date: string | null;
  inspector_name: string | null;
  report_id: string | null;
  title: string | null;
  status: 'draft' | 'final';
};

export default function FinalsPage() {
  const router = useRouter();
  const [rows, setRows] = useState<FinalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [reverting, setReverting] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from('reports')
      .select('id, inspection_date, report_id, title, status')
      .eq('status', 'final')
      .order('inspection_date', { ascending: false });

    if (error) alert(error.message);
    else setRows((data ?? []) as FinalRow[]);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  function openReport(id: string) {
    router.push(`/final/${id}`);
  }

  function downloadPdf(e: any, id: string) {
    e.stopPropagation();
    window.open(`/print/${id}`, '_blank');
  }

  

  async function revertToDraft(e: any, reportId: string) {
    e.stopPropagation();
    if (!confirm('Revert this report to Draft?')) return;
    setReverting(reportId);
    try {
      const { error } = await supabase.from('reports').update({ status: 'draft' }).eq('id', reportId);
      if (error) throw error;
      setRows(prev => prev.filter(r => r.id !== reportId));
      router.push(`/drafts/${reportId}`);
    } catch (err: any) {
      alert(err.message ?? 'Failed to revert');
    } finally {
      setReverting(null);
    }
  }

  async function deleteReport(e: any, reportId: string) {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete? There is no recovery of deleted items.')) return;

    setDeleting(reportId);
    try {
      // delete photos + items first
      const { data: items } = await supabase.from('report_items').select('id').eq('report_id', reportId);
      const itemIds = (items ?? []).map((i: any) => i.id);

      if (itemIds.length) {
        const { data: photos } = await supabase
          .from('report_item_photos').select('storage_path').in('report_item_id', itemIds);
        const paths = (photos ?? []).map((p: any) => p.storage_path).filter(Boolean);
        if (paths.length) await supabase.storage.from('photos').remove(paths);
        if ((photos ?? []).length) await supabase.from('report_item_photos').delete().in('report_item_id', itemIds);
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
            <h1 className="text-2xl font-semibold ml-1">Final Reports</h1>
            <Link href="/account" className="rounded-md border px-3 py-1.5 hover:bg-gray-50">Account</Link>
          </div>
        </div>

        <div className="rounded-xl border bg-white overflow-hidden w-fit max-w-full mx-auto">
          <table className="w-auto table-auto text-sm border-separate border-spacing-0">
            <thead>
              <tr className="bg-gray-50 text-left">
                <th className="p-3 whitespace-nowrap">Inspection Date</th>
                                <th className="p-3 whitespace-nowrap">Report ID</th>
                <th className="p-3">Report Title</th>
                <th className="p-3 whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="p-4">Loading…</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={5} className="p-4 text-gray-600">No final reports.</td></tr>
              ) : (
                rows.map((r) => {
                  const onKey = (e: any) => {
                    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openReport(r.id); }
                  };
                  return (
                    <tr
                      key={r.id}
                      className="border-t hover:bg-gray-50 cursor-pointer"
                      tabIndex={0}
                      role="button"
                      aria-label={`Open final report ${r.report_id || r.title || r.inspection_date || r.id}`}
                      onClick={() => openReport(r.id)}
                      onKeyDown={onKey}
                    >
                      <td className="p-3 whitespace-nowrap">{r.inspection_date ?? ''}</td>
                      
                      <td className="p-3 whitespace-nowrap">
                        <Link
                          href={`/final/${r.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="underline"
                        >
                          {r.report_id ?? ''}
                        </Link>
                      </td>
                      <td className="p-3">{r.title ?? ''}</td>
                      <td className="p-3 whitespace-nowrap">
                        <div className="flex flex-wrap gap-2">
                          <button
                            className="rounded-md border px-2 py-1 hover:bg-gray-50"
                            onClick={(e) => downloadPdf(e, r.id)}
                            title="Download PDF"
                          >
                            PDF
                          </button>
                          
                          <button
                            className="rounded-md border px-2 py-1 hover:bg-gray-50"
                            onClick={(e) => revertToDraft(e, r.id)}
                            disabled={reverting === r.id}
                            title="Revert to Draft"
                          >
                            {reverting === r.id ? 'Reverting…' : 'Revert'}
                          </button>
                          <button
                            className="rounded-md border px-2 py-1 hover:bg-gray-50"
                            onClick={(e) => deleteReport(e, r.id)}
                            disabled={deleting === r.id}
                            title="Delete report"
                          >
                            {deleting === r.id ? 'Deleting…' : 'Delete'}
                          </button>
                        </div>
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
