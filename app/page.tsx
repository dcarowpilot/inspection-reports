'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabaseClient';

export default function Page() {
  const router = useRouter();
  const [mode, setMode] = useState<'signin'|'signup'|'forgot'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) router.replace('/home');
    })();
  }, [router]);

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null); setMsg(null); setLoading(true);
    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        // Ensure a profile row exists for this user
        try { await supabase.rpc('ensure_profile'); } catch { /* ignore */ }
        router.replace('/home');
      } else if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMsg('Check your email to confirm your account, then sign in.');
        setMode('signin');
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: typeof window !== 'undefined' ? `${window.location.origin}` : undefined,
        });
        if (error) throw error;
        setMsg('Password reset link sent. Check your email.');
        setMode('signin');
      }
    } catch (e: any) {
      setErr(e.message ?? 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

async function signInWithGoogle() {
  await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      // EITHER absolute:
      redirectTo: `${window.location.origin}/auth/callback`


      // OR simply a relative path (also fine):
      // redirectTo: '/auth/callback',
    },
  });
}

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-md rounded-2xl border bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold mb-4">
          Inspection Reports — {mode === 'signin' ? 'Sign in' : mode === 'signup' ? 'Create account' : 'Forgot password'}
        </h1>

        {msg && <div className="mb-3 rounded-md bg-green-50 p-3 text-green-700 text-sm">{msg}</div>}
        {err && <div className="mb-3 rounded-md bg-red-50 p-3 text-red-700 text-sm">{err}</div>}

        <form onSubmit={handleEmailSubmit} className="space-y-3">
          <input
            type="email" required placeholder="Email"
            value={email} onChange={e => setEmail(e.target.value)}
            className="w-full rounded-md border px-3 py-2"
          />
          {mode !== 'forgot' && (
            <input
              type="password" required placeholder="Password"
              value={password} onChange={e => setPassword(e.target.value)}
              className="w-full rounded-md border px-3 py-2"
            />
          )}
          <button
            type="submit" disabled={loading}
            className="w-full rounded-md bg-black text-white py-2 disabled:opacity-50"
          >
            {loading ? 'Please wait…' :
              mode === 'signin' ? 'Sign in' :
              mode === 'signup' ? 'Create account' : 'Send reset link'}
          </button>
        </form>

        <div className="my-4 text-center text-sm text-gray-500">or</div>

        <button onClick={signInWithGoogle} className="w-full rounded-md border py-2">
          Continue with Google
        </button>

        <div className="mt-4 text-sm text-gray-600 flex items-center justify-between">
          {mode !== 'signin' && (
            <button onClick={() => setMode('signin')} className="underline">Have an account? Sign in</button>
          )}
          {mode !== 'signup' && (
            <button onClick={() => setMode('signup')} className="underline">Create account</button>
          )}
          {mode !== 'forgot' && (
            <button onClick={() => setMode('forgot')} className="underline">Forgot password</button>
          )}
        </div>
      </div>
    </main>
  );
}
