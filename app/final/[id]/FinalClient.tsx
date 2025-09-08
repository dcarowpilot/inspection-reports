'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

type Report = {
  id: string;
  status: 'draft' | 'final';
  report_id: string | null;
  title: string | null;
  inspector_name: string | null;
  inspection_date: string | null;
  details: string | null;
  created_by: string;
};

type ItemRow = {
  id: string;
  idx: number;
  title: string | null;
  result: 'pass' | 'fail' | 'na';
  notes: string | null;
};

export default function FinalClient({ id }: { id: string }) {
  const router = useRouter();

  const [report, setReport] = useState<Report | null>(null);
  const [items, setItems] = useState<ItemRow[]>([]);
  const [photoUrls, setPhotoUrls] = useState<Record<string, string[]>>({});
  const [busy, setBusy] = useState(false);
  const [reverting, setReverting] = useState(false);

  useEffect(() => {
    (async () => {
      setBusy(true);
      try {
        // Load report
        const { data: r, error } = await supabase
          .from('reports')
          .select('id, status, report_id, title, inspector_name, inspection_date, details, created_by')
          .eq('id', id)
          .single();
        if (error) throw error;
        setReport(r as Report);

        // Load items
        const { data: its, error: e2 } = await supabase
          .from('report_items')
          .select('id, idx, title, result, notes')
          .eq('report_id', id)
          .order('idx', { ascending: true });
        if (e2) throw e2;
        const typed = (its ?? []) as ItemRow[];
        setItems(typed);

        // Load photos for items
        if (typed.length) {
          const itemIds = typed.map(i => i.id);
          const { data: photos, error: e3 } = await supabase
            .from('report_item_photos')
            .select('report_item_id, storage_path')
            .in('report_item_id', itemIds);
          if (e3) throw e3;

          const grouped: Record<string, string[]> = {};
          for (const p of photos ?? []) {
            const path = (p as any).storage_path as string | null;
            const itemId = (p as any).report_item_id as string;
            if (!path) continue;
            const signed = await supabase.storage.from('photos').createSignedUrl(path, 120);
            const url = signed.data?.signedUrl;
            if (!url) continue;
            (grouped[itemId] ||= []).push(url);
          }
          setPhotoUrls(grouped);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        alert(msg);
      } finally {
        setBusy(false);
      }
    })();
  }, [id]);

  function fmtResult(r: 'pass' | 'fail' | 'na') {
    return r === 'na' ? 'N/A' : r.toUpperCase();
  }

  async function revertToDraft() {
    if (!report) return;
    if (!confirm('Revert this report to Draft?')) return;
    setReverting(true);
    try {
      const { error } = await supabase.from('reports').update({ status: 'draft' }).eq('id', report.id);
      if (error) throw error;
      router.push(`/drafts/${report.id}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      alert(msg);
    } finally {
      setReverting(false);
    }
  }

  function downloadPdf() {
    window.open(`/print/${id}`, '_blank');
  }

  if (!report) {
    return (
      <main className="min-h-screen p-6">
        <div className="mx-auto max-w-5xl">Loading…</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-5xl space-y-6">

        <div className="flex items-center justify-between">
          <Link href="/final" className="rounded-md border px-3 py-1.5 hover:bg-gray-50">Back to Final Reports</Link>
          <h1 className="text-2xl font-semibold">Final</h1>
          <div />
        </div>

        {/* Report Header */}
        <div className="rounded-xl border bg-white p-4">
          <h2 className="text-xl font-semibold mb-3">Report Header</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-1">Report ID *</label>
              <input className="w-full rounded-md border px-3 py-2 bg-gray-100" value={report.report_id ?? ''} readOnly disabled />
            </div>
            <div>
              <label className="block text-sm mb-1">Report Title</label>
              <input className="w-full rounded-md border px-3 py-2 bg-gray-100" value={report.title ?? ''} readOnly disabled />
            </div>
            <div>
              <label className="block text-sm mb-1">Name (Inspector)</label>
              <input className="w-full rounded-md border px-3 py-2 bg-gray-100" value={report.inspector_name ?? ''} readOnly disabled />
            </div>
            <div>
              <label className="block text-sm mb-1">Inspection Date *</label>
              <input className="w-full rounded-md border px-3 py-2 bg-gray-100" value={report.inspection_date ?? ''} readOnly disabled />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm mb-1">Report Details</label>
              <textarea className="w-full rounded-md border px-3 py-2 bg-gray-100" rows={2} value={report.details ?? ''} readOnly disabled />
            </div>
          </div>
        </div>

        {/* Items */}
        <div className="rounded-xl border bg-white p-4">
          <h2 className="text-xl font-semibold">Inspection Items</h2>
          <div className="mt-4 space-y-4">
            {items.map((it) => (
              <div key={it.id} className="rounded-lg border p-4">
                <div className="flex items-center gap-3">
                  <div className="text-base font-medium">{it.idx}.</div>
                  <input
                    className="flex-1 rounded-md border px-3 py-2 bg-gray-100"
                    value={it.title ?? ''}
                    readOnly
                    disabled
                  />
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <span className="text-sm">Result</span>
                  <span
                    className={`text-xs rounded px-2 py-1 ${
                      it.result === 'pass'
                        ? 'bg-green-100 text-green-700'
                        : it.result === 'fail'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-gray-200 text-gray-800'
                    }`}
                  >
                    {fmtResult(it.result)}
                  </span>
                </div>

                <div className="mt-3">
                  <label className="block text-sm mb-1">Notes</label>
                  <textarea
                    className="w-full rounded-md border px-3 py-2 bg-gray-100"
                    rows={4}
                    value={it.notes ?? ''}
                    readOnly
                    disabled
                  />
                </div>

                <div className="mt-3">
                  <div className="text-sm mb-2">Photos</div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {(photoUrls[it.id] ?? []).map((u, i) => (
                      <img key={i} src={u} alt={`item-${it.idx}-photo-${i + 1}`} className="h-32 w-full object-cover rounded-md border" />
                    ))}
                    {(!photoUrls[it.id] || photoUrls[it.id].length === 0) && (
                      <div className="text-sm text-gray-500">No photos</div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {items.length === 0 && (
              <div className="text-sm text-gray-600">No inspection items.</div>
            )}
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex gap-3">
          <button
            onClick={revertToDraft}
            disabled={reverting}
            className="rounded-md border px-3 py-1.5"
          >
            {reverting ? 'Reverting…' : 'Revert to Draft'}
          </button>
          <button
            onClick={() => downloadPdf()}
            className="rounded-md bg-black text-white px-3 py-1.5"
          >
            Download PDF
          </button>
        </div>
      </div>
    </main>
  );
}
