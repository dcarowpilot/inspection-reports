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
  const resultBtn = (value: Item['result']) =>
    `rounded-md border px-3 py-1 ${localResult === value ? 'bg-black text-white' : ''}`;

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
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap sm:flex-nowrap">
          <button type="button" onClick={() => onMoveUp(item.id)} className="rounded-md border px-2 py-1">↑</button>
          <button type="button" onClick={() => onMoveDown(item.id)} className="rounded-md border px-2 py-1">↓</button>
          <button
            type="button"
            onClick={() => onDelete(item.id)}
            className="rounded-md border px-2 py-1 text-red-600 border-red-300"
          >
            Delete
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
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={busy || photos.length >= 4}
              className="rounded-md border px-3 py-1.5 hover:bg-gray-50 disabled:opacity-60"
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
                  className="absolute top-1 right-1 hidden group-hover:block rounded bg-black/70 text-white text-xs px-2 py-1"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
