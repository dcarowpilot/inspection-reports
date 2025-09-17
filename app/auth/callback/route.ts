// app/auth/callback/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/home';

  if (code) {
    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({ cookies: async () => cookieStore });
    await supabase.auth.exchangeCodeForSession(code);
    // Create a profile row for new users (no-op if it exists)
    try { await supabase.rpc('ensure_profile'); } catch (e) { /* ignore */ }
  }

  return NextResponse.redirect(new URL(next, origin));
}

