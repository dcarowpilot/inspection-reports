'use client';

import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabaseClient'; // <- change to '../lib/supabaseClient' if needed
import { compressImage } from '@/lib/image';     // <- change to '../lib/image' if needed

// ---------------- Types ----------------

export type Item = {
  id: string;
  idx: number;
  title: string;
  result: 'pass' | 'fail' | 'na';
  notes: string | null;
};

type Props = {
  item: Item;
  reportId: string;
  onMoveUp: (itemId: string) => void;
  onMoveDown: (itemId: string) => void;
  onDelete: (itemId: string) => void;
};

type PhotoRow = { id: string; storage_path: string | null };
type Photo = { id: string; url: string; storage_path: string };

// ---------------- Component ----------------

export default function ItemCard({ item, reportId, onMoveUp, onMoveDown, onDelete }: Props) {
  // Title
  const [localTitle, setLocalTitle] = useState(item.title ?? '');
  useEffect(() => setLocalTitle(item.title ?? ''), [item.title]);
  async function saveTitle(next: string) {
    const { error } = await supabase.from('report_items').update({ title: next }).eq('id', item.id);
    if (error) alert(error.message);
  }

  // Result (optimistic)
  const [localResult, setLocalResult] = useState<Item['result']>(item.result);
  useEffect(() => setLocalResult(item.result), [item.result]);
  async function handleSetResult(next: Item['result']) {
    const prev = localResult;
    setLocalResult(next);
    const { error } = await supabase.from('report_items').update({ result: next }).eq('id', item.id);
    if (error) {
      setLocalResult(prev);
      alert(error.message);
    }
  }
  const resultBtn = (value: Item['result']) => {
    const base = 'rounded-md border px-3 py-1';
    const selected = localResult === value;
    if (value === 'pass') {
      return `${base} ${selected ? 'bg-green-600 border-green-600 text-white' : 'text-green-700 border-green-600 hover:bg-green-50'}`;
    }
    if (value === 'fail') {
      return `${base} ${selected ? 'bg-red-600 border-red-600 text-white' : 'text-red-700 border-red-600 hover:bg-red-50'}`;
    }
    // N/A keeps existing black styling
    return `${base} ${selected ? 'bg-black border-black text-white' : 'text-black border-black hover:bg-gray-100'}`;
  };

  // Notes
  const [notes, setNotes] = useState(item.notes ?? '');
  useEffect(() => setNotes(item.notes ?? ''), [item.notes]);
  async function saveNotes(next: string) {
    const { error } = await supabase.from('report_items').update({ notes: next }).eq('id', item.id);
    if (error) alert(error.message);
  }

  // Photos
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [busy, setBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function loadPhotos() {
    const { data, error } = await supabase
      .from('report_item_photos')
      .select('id, storage_path')
      .eq('report_item_id', item.id)
      .order('created_at', { ascending: true });

    if (error) {
      console.error(error);
      setPhotos([]);
      return;
    }

    const rows = (data ?? []) as PhotoRow[];
    const out: Photo[] = [];
    for (const row of rows) {
      if (!row.storage_path) continue;
      const signed = await supabase.storage.from('photos').createSignedUrl(row.storage_path, 60 * 60);
      if (signed.data?.signedUrl) {
        out.push({ id: row.id, url: signed.data.signedUrl, storage_path: row.storage_path });
      }
    }
    setPhotos(out);
  }
  useEffect(() => { loadPhotos(); }, [item.id]);

  async function handleAddPhotos(files: FileList | null) {
    if (!files || files.length === 0) return;
    const remaining = 4 - photos.length;
    if (remaining <= 0) { alert('Max 4 photos'); return; }

    setBusy(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not signed in');

      const picks = Array.from(files).slice(0, remaining);
      for (const file of picks) {
        let blob: Blob = file;
        try { blob = await compressImage(file); } catch { /* best-effort */ }

        const safeName = `${Date.now()}-${file.name.replace(/\s+/g, '_')}`;
        const key = `${user.id}/${reportId}/${item.id}/${safeName}`;

        const up = await supabase.storage.from('photos').upload(key, blob, { contentType: file.type });
        if (up.error) throw up.error;

        const ins = await supabase
          .from('report_item_photos')
          .insert({ report_item_id: item.id, storage_path: key })
          .select('id')
          .single();
        if (ins.error) throw ins.error;
      }
      await loadPhotos();
    } catch (e: any) {
      console.error(e);
      alert(e.message ?? 'Upload failed');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
      setBusy(false);
    }
  }

  async function deletePhoto(photo: Photo) {
    setBusy(true);
    try {
      await supabase.storage.from('photos').remove([photo.storage_path]);
      await supabase.from('report_item_photos').delete().eq('id', photo.id);
      await loadPhotos();
    } catch (e: any) {
      alert(e.message ?? 'Failed to remove photo');
    } finally {
      setBusy(false);
    }
  }

  // --------------- UI ---------------

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      {/* Row 1: number + title, then move/delete */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-6 text-right font-semibold">{item.idx}.</div>
          <input
            className="flex-1 min-w-0 rounded-md border px-3 py-2"
            placeholder="Item title"
            value={localTitle}
            onChange={(e) => setLocalTitle(e.target.value)}
            onBlur={(e) => saveTitle(e.target.value.trim())}
            onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap sm:flex-nowrap [&>button]:h-8 [&>button]:w-8 [&>button]:inline-flex [&>button]:items-center [&>button]:justify-center [&>button]:p-0">
          <button type="button" onClick={() => onMoveUp(item.id)} className="rounded-md border px-2 py-1">↑</button>
          <button type="button" onClick={() => onMoveDown(item.id)} className="rounded-md border px-2 py-1">↓</button>
          <button
            type="button"
            onClick={() => onDelete(item.id)}
            aria-label="Delete item"
            title="Delete item"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border text-red-600 border-red-300 hover:bg-red-50 p-0"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
              <path d="M9 3a1 1 0 0 0-1 1v1H5.5a1 1 0 1 0 0 2H6v11a3 3 0 0 0 3 3h6a3 3 0 0 0 3-3V7h.5a1 1 0 1 0 0-2H16V4a1 1 0 0 0-1-1H9Zm6 3H9V4h6v2Zm-6 4a1 1 0 1 1 2 0v8a1 1 0 1 1-2 0V10Zm4 0a1 1 0 1 1 2 0v8a1 1 0 1 1-2 0V10Z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Row 2: Result buttons */}
      <div className="mt-3 flex items-center gap-2">
        <span className="text-sm">Result</span>
        <button type="button" className={resultBtn('pass')} onClick={() => handleSetResult('pass')}>PASS</button>
        <button type="button" className={resultBtn('fail')} onClick={() => handleSetResult('fail')}>FAIL</button>
        <button type="button" className={resultBtn('na')}   onClick={() => handleSetResult('na')}>N/A</button>
      </div>

      {/* Notes */}
      <div className="mt-3">
        <label className="block text-sm mb-1">Notes</label>
        <textarea
          className="w-full rounded-md border px-3 py-2"
          rows={4}
          placeholder="Add notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={(e) => saveNotes(e.target.value)}
        />
      </div>

      {/* Photos */}
      <div className="mt-3">
        <div className="flex items-center justify-between">
          <div className="font-medium">Photos ({photos.length}/4)</div>

          <div className="flex items-center gap-2">
            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => handleAddPhotos(e.target.files)}
            />

            <button
              type="button" aria-label="Add photo" title="Add photo"
              style={{ width: '36px', height: '32px', backgroundRepeat: 'no-repeat', backgroundPosition: 'center', backgroundImage: 'url("data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.5"> <rect x="3" y="5" width="14" height="12" rx="2"/> <circle cx="9" cy="10" r="1.5"/> <path d="M4 15l4-4 3 3 2-2 4 4"/> <circle cx="19" cy="7" r="3" fill="currentColor"/> <path d="M19 5.75v2.5M17.75 7h2.5" stroke="white" strokeWidth="1.5" strokeLinecap="round"/> </svg>" )', color: 'transparent' }}
              onClick={() => fileInputRef.current?.click()}
              disabled={busy || photos.length >= 4}
              aria-label="Add photo"
              title="Add photo"
              className="inline-flex items-center justify-center gap-1 rounded-md border px-2.5 py-1.5 hover:bg-gray-50 disabled:opacity-60 text-transparent"
              style={{ width: '36px', height: '32px', backgroundRepeat: 'no-repeat', backgroundPosition: 'center', backgroundImage: 'url("data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'black\' stroke-width=\'1.5\'><rect x=\'4\' y=\'5\' width=\'14\' height=\'11\' rx=\'2\'/><rect x=\'4\' y=\'16\' width=\'14\' height=\'3\' rx=\'1\'/><path d=\'M5.5 14l3-3 2.5 2.5 2-2 3 3\'/><circle cx=\'11\' cy=\'9\' r=\'1.2\'/><circle cx=\'20\' cy=\'7\' r=\'3\' fill=\'black\'/><path d=\'M20 5.75v2.5M18.75 7h2.5\' stroke=\'white\' stroke-width=\'1.5\' stroke-linecap=\'round\'/></svg>" )' }}
            >
              {busy ? 'Uploading…' : 'Add Photo'}
            </button>
          </div>
        </div>

        {photos.length > 0 && (
          <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2">
            {photos.map((p) => (
              <div key={p.id} className="relative group">
                <img src={p.url} alt="" className="h-32 w-full object-cover rounded-md border" />
                <button
                  type="button"
                  onClick={() => deletePhoto(p)}
                  aria-label="Remove photo"
                  title="Remove photo"
                  className="absolute top-1 right-1 hidden group-hover:block rounded bg-red-600/80 hover:bg-red-700 text-white p-1"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                    <path d="M9 3a1 1 0 0 0-1 1v1H5.5a1 1 0 1 0 0 2H6v11a3 3 0 0 0 3 3h6a3 3 0 0 0 3-3V7h.5a1 1 0 1 0 0-2H16V4a1 1 0 0 0-1-1H9Zm6 3H9V4h6v2Zm-6 4a1 1 0 1 1 2 0v8a1 1 0 1 1-2 0V10Zm4 0a1 1 0 1 1 2 0v8a1 1 0 1 1-2 0V10Z" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
