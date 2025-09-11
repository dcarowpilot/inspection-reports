'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

type Report = {
  id: string;
  report_id: string;
  title: string | null;
  inspector_name: string;
  details: string | null;
  inspection_date: string;
};

type Item = {
  id: string;
  idx: number;
  title: string | null;
  result: 'pass' | 'fail' | 'na';
  notes: string | null;
};

export default function PrintClient({ id }: { id: string }) {
  // ✅ do NOT use useParams here
  const [report, setReport] = useState<Report | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [photos, setPhotos] = useState<Record<string, string[]>>({});
  const [ready, setReady] = useState(false);

  const formatResult = (r: Item['result']) => (r === 'na' ? 'N/A' : r.toUpperCase());
  const resultColorClass = (r: Item['result']) =>
    r === 'pass' ? 'text-green-700' : r === 'fail' ? 'text-red-700' : 'text-black';
  // --- helpers ---
  function preload(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Failed to load image: ' + url));
      img.src = url;
    });
  }

  async function waitForDomImagesToDecode(): Promise<void> {
    const imgs = Array.from(document.querySelectorAll('img')) as HTMLImageElement[];
    await Promise.all(
      imgs.map((img) =>
        // decode() is widely supported; fallback is a micro delay
        'decode' in img ? img.decode().catch(() => {}) : new Promise((r) => setTimeout(r, 50))
      )
    );
  }

  useEffect(() => {
    (async () => {
      // 1) fetch report + items
      const { data: r } = await supabase.from('reports').select('*').eq('id', id).single();
      setReport(r as Report);

      const { data: i } = await supabase
        .from('report_items')
        .select('*')
        .eq('report_id', id)
        .order('idx', { ascending: true });

      const itemsList = (i ?? []) as Item[];
      setItems(itemsList);

      // 2) collect signed URLs
      const map: Record<string, string[]> = {};
      const allUrls: string[] = [];

      for (const it of itemsList) {
        const { data: rows } = await supabase
          .from('report_item_photos')
          .select('storage_path')
          .eq('report_item_id', it.id)
          .order('created_at', { ascending: true });

        map[it.id] = [];
        for (const row of rows ?? []) {
          const { data: signed } = await supabase.storage
            .from('photos')
            .createSignedUrl(row.storage_path, 60 * 60);
          if (signed?.signedUrl) {
            map[it.id].push(signed.signedUrl);
            allUrls.push(signed.signedUrl);
          }
        }
      }

      // 3) preload all images (network + decode in memory)
      await Promise.all(allUrls.map(preload));

      // 4) commit URLs to DOM and wait one paint for <img> elements to mount
      setPhotos(map);
      requestAnimationFrame(async () => {
        await waitForDomImagesToDecode(); // ensure DOM <img> are decoded
        setReady(true);
        // slight delay lets browser layout settle before printing
        setTimeout(() => window.print(), 100);
      });
    })();
  }, [id]);

  if (!report) return <main className="p-6">Preparing…</main>;

  return (
    <main className="p-8 print:p-0">
      <style>{`
        @page { size: Letter; margin: 1in; }
        * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        h1,h2 { page-break-after: avoid; }
        img { max-width: 100%; page-break-inside: avoid; }
        .item { margin-bottom: 18px; }
        .photos { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
        @media screen { body { background: #f8fafc; } .sheet { background: white; padding: 1in; box-shadow: 0 0 0 1px #e5e7eb, 0 10px 30px rgba(0,0,0,.08); margin: auto; max-width: 8.5in; } }
        @media print { .sheet { box-shadow: none; } }
      `}</style>

      <div className="sheet">
        <h1 className="text-2xl font-bold mb-2">Inspection Report</h1>
        <div className="mb-4 text-sm">
          <div><strong>Report ID:</strong> {report.report_id}</div>
          <div><strong>Title:</strong> {report.title ?? ''}</div>
          <div><strong>Name:</strong> {report.inspector_name}</div>
          <div><strong>Details:</strong> {report.details ?? ''}</div>
          <div><strong>Inspection Date:</strong> {report.inspection_date}</div>
        </div>

        {items.map((it) => (
          <div key={it.id} className="item">
            <h2 className="text-lg font-semibold">{it.idx}. {it.title}</h2>
            <div>
              <strong>Result:</strong>
              {" "}
              <span className={resultColorClass(it.result)}>{formatResult(it.result)}</span>
            </div>
            {it.notes && <div className="mt-1 whitespace-pre-wrap"><strong>Notes:</strong> {it.notes}</div>}
            {!!(photos[it.id]?.length) && (
              <div className="photos mt-2">
                {photos[it.id].map((u, i) => <img key={i} src={u} alt="" />)}
              </div>
            )}
          </div>
        ))}

        {!ready && (
          <div className="mt-6 text-sm text-gray-600">
            Preparing images for print…
          </div>
        )}
      </div>
    </main>
  );
}
