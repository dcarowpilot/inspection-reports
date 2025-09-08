'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function AuthCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const run = async () => {
      const code = searchParams.get('code');
      const err =
        searchParams.get('error_description') ?? searchParams.get('error');

      if (err) {
        alert(err);
        router.replace('/');
        return;
      }

      if (code) {
        // 👇 Your SDK expects a string, not an object
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          alert(error.message);
          router.replace('/');
          return;
        }
      }

      router.replace('/home');
    };

    run();
  }, [router, searchParams]);

  return <div className="p-6">Signing you in…</div>;
}
