'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function NewDraftAutoCreate() {
  const router = useRouter();
  const createdRef = useRef(false); // <- prevents double insert in React Strict Mode

  useEffect(() => {
    if (createdRef.current) return;    // already created in this mount
    createdRef.current = true;

    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace('/'); return; }

      const today = new Date().toISOString().slice(0, 10);

      // 1) Create the report
      const { data: report, error } = await supabase
        .from('reports')
        .insert({
          status: 'draft',
          report_id: null,     // keep blank until user fills it
          title: '',
          inspector_name: '',
          details: '',
          inspection_date: today,
          created_by: user.id,
        })
        .select()
        .single();

      if (error || !report) {
        alert(error?.message ?? 'Could not create draft');
        router.replace('/home');
        return;
      }

      // 2) Create the first blank item (default to 'na')
      const { error: itemErr } = await supabase.from('report_items').insert({
        report_id: report.id,
        idx: 1,
        title: '',
        result: 'na',
        notes: '',
      });

      if (itemErr) {
        // best-effort cleanup if the item insert fails
        await supabase.from('reports').delete().eq('id', report.id);
        alert(itemErr.message);
        router.replace('/home');
        return;
      }

      // 3) Go to the editor
      router.replace(`/drafts/${report.id}`);
    })();
  }, [router]);

  return (
    <main className="min-h-screen grid place-items-center p-6">
      <div className="rounded-xl border bg-white p-6 text-sm text-gray-600">
        Creating your draft…
      </div>
    </main>
  );
}
