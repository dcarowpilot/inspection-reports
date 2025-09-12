'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import ItemCard, { type Item } from '@/components/ItemCard';
import { Document, Packer, Paragraph, TextRun, ImageRun } from 'docx';
import { saveAs } from 'file-saver';
import { usePlan } from '@/components/PlanProvider';
import UpgradeModal from '@/components/UpgradeModal';

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

export default function DraftEditorClient({ id }: { id: string }) {
  const router = useRouter();

  const [report, setReport] = useState<Report | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [busy, setBusy] = useState(false);
  const { entitlements } = usePlan();
  const [showUpgrade, setShowUpgrade] = useState(false);

  // ---------- Load report + items ----------
  async function loadAll() {
    const { data: r, error } = await supabase
      .from('reports')
      .select('id, status, report_id, title, inspector_name, inspection_date, details, created_by')
      .eq('id', id)
      .single();
    if (error) { alert(error.message); return; }
    setReport(r as Report);

    const { data: its, error: e2 } = await supabase
      .from('report_items')
      .select('id, idx, title, result, notes')
      .eq('report_id', id)
      .order('idx', { ascending: true });
    if (e2) { alert(e2.message); return; }
    setItems((its ?? []) as Item[]);
  }
  useEffect(() => { loadAll(); }, [id]);

  // ---------- Update report fields ----------
  // Local-only update (preserves spaces while typing)
  function setReportFieldLocal<K extends keyof Report>(field: K, value: Report[K]) {
    setReport((r) => (r ? ({ ...r, [field]: value } as Report) : r));
  }
  // Persist to DB; nulls out pure-whitespace values
  async function saveReportField<K extends keyof Report>(field: K, value: Report[K]) {
    if (!report) return;
    let v: any = value;
    if (typeof v === 'string') {
      const trimmed = v.trim();
      v = trimmed === '' ? null : v; // keep spaces, coerce all-whitespace to NULL
    }
    setReport((r) => (r ? ({ ...r, [field]: v } as Report) : r));
    const { error } = await supabase.from('reports').update({ [field]: v }).eq('id', report.id);
    if (error) alert(error.message);
  }

  // ---------- Items helpers ----------
  async function addItem() {
    if (items.length >= entitlements.maxItems) { setShowUpgrade(true); return; }
    const next = (items[items.length - 1]?.idx ?? 0) + 1;
    const { error } = await supabase
      .from('report_items')
      .insert({ report_id: id, idx: next, title: '', result: 'na', notes: '' });
    if (error) { alert(error.message); return; }
    await loadAll();
    requestAnimationFrame(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }));
  }

  async function moveItemUp(itemId: string) {
    const sorted = [...items].sort((a, b) => a.idx - b.idx);
    const pos = sorted.findIndex((i) => i.id === itemId);
    if (pos <= 0) return;
    const cur = sorted[pos];
    const prev = sorted[pos - 1];
    const tmp = -1000000 - Math.abs(cur.idx);
    // Use a temporary idx to avoid unique collisions
    try {
      const r1 = await supabase.from('report_items').update({ idx: tmp }).eq('id', cur.id);
      if (r1.error) throw r1.error;
      const r2 = await supabase.from('report_items').update({ idx: cur.idx }).eq('id', prev.id);
      if (r2.error) throw r2.error;
      const r3 = await supabase.from('report_items').update({ idx: prev.idx }).eq('id', cur.id);
      if (r3.error) throw r3.error;
    } catch (e: any) {
      alert(e.message ?? 'Reorder failed');
    } finally {
      await loadAll();
    }
  }

  async function moveItemDown(itemId: string) {
    const sorted = [...items].sort((a, b) => a.idx - b.idx);
    const pos = sorted.findIndex((i) => i.id === itemId);
    if (pos === -1 || pos >= sorted.length - 1) return;
    const cur = sorted[pos];
    const next = sorted[pos + 1];
    const tmp = -1000000 - Math.abs(cur.idx);
    try {
      const r1 = await supabase.from('report_items').update({ idx: tmp }).eq('id', cur.id);
      if (r1.error) throw r1.error;
      const r2 = await supabase.from('report_items').update({ idx: cur.idx }).eq('id', next.id);
      if (r2.error) throw r2.error;
      const r3 = await supabase.from('report_items').update({ idx: next.idx }).eq('id', cur.id);
      if (r3.error) throw r3.error;
    } catch (e: any) {
      alert(e.message ?? 'Reorder failed');
    } finally {
      await loadAll();
    }
  }

  async function deleteItem(itemId: string) {
    if (!confirm('Delete this item? Photos will also be deleted.')) return;

    // delete photos (storage + rows)
    const { data: photos } = await supabase
      .from('report_item_photos')
      .select('id, storage_path')
      .eq('report_item_id', itemId);
    const paths = (photos ?? []).map((p: any) => p.storage_path).filter(Boolean);
    if (paths.length) await supabase.storage.from('photos').remove(paths);
    if (photos?.length) await supabase.from('report_item_photos').delete().eq('report_item_id', itemId);

    await supabase.from('report_items').delete().eq('id', itemId);
    await loadAll();
  }

  // ---------- Actions ----------
  async function discardDraft() {
    if (!report) return;
    if (!confirm('Discard this draft? This will permanently delete it.')) return;

    // cascade delete: photos -> photo rows -> items -> report
    const { data: allItems } = await supabase.from('report_items').select('id').eq('report_id', report.id);
    const itemIds = (allItems ?? []).map((i: any) => i.id);
    if (itemIds.length) {
      const { data: photos } = await supabase
        .from('report_item_photos').select('storage_path').in('report_item_id', itemIds);
      const paths = (photos ?? []).map((p: any) => p.storage_path).filter(Boolean);
      if (paths.length) await supabase.storage.from('photos').remove(paths);
      if ((photos ?? []).length) await supabase.from('report_item_photos').delete().in('report_item_id', itemIds);
    }
    await supabase.from('report_items').delete().eq('report_id', report.id);
    await supabase.from('reports').delete().eq('id', report.id);

    router.push('/home');
  }

  function saveAndClose() {
    router.push('/drafts');
  }

  async function convertToFinal() {
    if (!report) return;
    const { error } = await supabase.from('reports').update({ status: 'final' }).eq('id', report.id);
    if (error) { alert(error.message); return; }
    router.push(`/final/${report.id}`);
  }

  // ---------- DOCX (with photos) ----------
  async function downloadDocx() {
    if (!report) return;
    if (!entitlements.canDownloadDocx) { setShowUpgrade(true); return; }

    const fmt = (r: 'pass' | 'fail' | 'na') => (r === 'na' ? 'N/A' : r.toUpperCase());

    function mimeToDocxType(mime: string): 'png' | 'jpg' | 'gif' | 'bmp' {
      const ct = mime.toLowerCase();
      if (ct.includes('png')) return 'png';
      if (ct.includes('gif')) return 'gif';
      if (ct.includes('bmp')) return 'bmp';
      return 'jpg';
    }

    async function getBytesFromStorage(path: string): Promise<{ bytes: Uint8Array; mime: string } | null> {
      const dl = await supabase.storage.from('photos').download(path);
      if (dl.data) {
        const blob = dl.data as Blob;
        return { bytes: new Uint8Array(await blob.arrayBuffer()), mime: blob.type || '' };
      }
      const signed = await supabase.storage.from('photos').createSignedUrl(path, 60);
      const url = signed.data?.signedUrl;
      if (!url) return null;
      const resp = await fetch(url);
      return { bytes: new Uint8Array(await resp.arrayBuffer()), mime: resp.headers.get('content-type') || '' };
    }

    try {
      const paras: Paragraph[] = [
        new Paragraph({ children: [new TextRun({ text: 'Inspection Report', bold: true, size: 28 })] }),
        new Paragraph(''),
        new Paragraph(`Report ID: ${report.report_id ?? ''}`),
        new Paragraph(`Title: ${report.title ?? ''}`),
        new Paragraph(`Name: ${report.inspector_name ?? ''}`),
        new Paragraph(`Inspection Date: ${report.inspection_date ?? ''}`),
      ];
      if (report.details) paras.push(new Paragraph(`Details: ${report.details}`));
      paras.push(new Paragraph(''));

      for (const it of items) {
        paras.push(new Paragraph({ children: [new TextRun({ text: `${it.idx}. ${it.title || ''}`, bold: true })] }));
        paras.push(new Paragraph(`Result: ${fmt(it.result)}`));
        if (it.notes) paras.push(new Paragraph(`Notes: ${it.notes}`));

        const { data: rows } = await supabase
          .from('report_item_photos')
          .select('storage_path')
          .eq('report_item_id', it.id)
          .order('created_at', { ascending: true });

        for (const row of rows ?? []) {
          if (!row.storage_path) continue;
          const file = await getBytesFromStorage(row.storage_path);
          if (!file) continue;

          const imgRun = new ImageRun({
            data: file.bytes,
            type: mimeToDocxType(file.mime) as any,
            transformation: { width: 360, height: 240 },
          } as any);

          paras.push(new Paragraph({ children: [imgRun] }));
        }
        paras.push(new Paragraph(''));
      }

      const doc = new Document({ sections: [{ properties: {}, children: paras }] });
      const blob = await Packer.toBlob(doc);
      saveAs(blob, `${report.report_id || 'report'}-draft.docx`);
    } catch (e: any) {
      console.error(e);
      alert(e.message ?? 'Failed to build .docx');
    }
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
          <Link href="/home" className="rounded-md border px-3 py-1.5 hover:bg-gray-50">Home</Link>
          <h1 className="text-2xl font-semibold">Draft</h1>
          <Link href="/account" className="rounded-md border px-3 py-1.5 hover:bg-gray-50">Account</Link>
        </div>

        {/* -------- Header card -------- */}
        <div className="rounded-xl border bg-white p-4">
          <h2 className="text-xl font-semibold mb-3">Report Header</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Report ID */}
            <div>
              <label className="block text-sm mb-1">Report ID *</label>
              <input
                className="w-full rounded-md border px-3 py-2"
                placeholder="Enter a report ID"
                value={report.report_id ?? ''}
                onChange={(e) => setReportFieldLocal('report_id', e.target.value)}
                onBlur={(e) => saveReportField('report_id', e.target.value)}
              />
            </div>

            {/* Report Title */}
            <div>
              <label className="block text-sm mb-1">Report Title</label>
              <input
                className="w-full rounded-md border px-3 py-2"
                placeholder="Optional title"
                value={report.title ?? ''}
                onChange={(e) => setReportFieldLocal('title', e.target.value)}
                onBlur={(e) => saveReportField('title', e.target.value)}
              />
            </div>

            {/* Name (Inspector) */}
            <div>
              <label className="block text-sm mb-1">Name (Inspector)</label>
              <input
                className="w-full rounded-md border px-3 py-2"
                placeholder="Optional inspector name"
                value={report.inspector_name ?? ''}
                onChange={(e) => setReportFieldLocal('inspector_name', e.target.value)}
                onBlur={(e) => saveReportField('inspector_name', e.target.value)}
              />
            </div>

            {/* Inspection Date */}
            <div>
              <label className="block text-sm mb-1">Inspection Date *</label>
              <input
                type="date"
                className="w-full rounded-md border px-3 py-2"
                value={report.inspection_date ?? ''}
                onChange={(e) => saveReportField('inspection_date', e.target.value)}
              />
            </div>

            {/* Report Details (spans both columns) */}
            <div className="md:col-span-2">
              <label className="block text-sm mb-1">Report Details</label>
              <textarea
                rows={2}
                className="w-full rounded-md border px-3 py-2"
                placeholder="Weather, location, attendees, site conditions…"
                value={report.details ?? ''}
                onChange={(e) => setReportFieldLocal('details', e.target.value)}
                onBlur={(e) => saveReportField('details', e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* -------- Items -------- */}
        <div className="rounded-xl border bg-white p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Inspection Items</h2>
          </div>

          <div className="mt-4 space-y-4">
            {items.map((it) => (
              <ItemCard
                key={it.id}
                item={it}
                reportId={report.id}
                onMoveUp={moveItemUp}
                onMoveDown={moveItemDown}
                onDelete={deleteItem}
              />
            ))}
          </div>

          {/* Centered Add Item button */}
          <button
            onClick={addItem}
            className="rounded-md bg-black text-white px-3 py-1.5 block mx-auto mt-2"
          >
            Add Item
          </button>
        </div>

        {/* -------- Footer actions -------- */}
        <div className="flex flex-wrap gap-3">
          <button onClick={discardDraft} className="rounded-md border px-3 py-1.5 text-red-600 border-red-300">
            Discard Draft
          </button>
          <button onClick={saveAndClose} className="rounded-md border px-3 py-1.5">
            Save &amp; Close
          </button>
          <button onClick={downloadDocx} className="rounded-md border px-3 py-1.5 disabled:opacity-60" disabled={!entitlements.canDownloadDocx}>
            {entitlements.canDownloadDocx ? 'Download Draft (.docx)' : 'Download (.docx) — Premium'}
          </button>
          <button onClick={convertToFinal} className="rounded-md bg-black text-white px-3 py-1.5">
            Convert to Final
          </button>
        </div>
      </div>
        <UpgradeModal open={showUpgrade} onClose={() => setShowUpgrade(false)} />
    </main>
  );
}
