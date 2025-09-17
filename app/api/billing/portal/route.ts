import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { getStripe, getBaseUrl } from '@/lib/stripe';
import { getAdminClient } from '@/lib/supabaseAdmin';

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore } as any);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const admin = getAdminClient();
    const { data: profile, error } = await admin
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single();
    if (error || !profile?.stripe_customer_id)
      return NextResponse.json({ error: 'No Stripe customer' }, { status: 400 });

    const stripe = getStripe();
    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${getBaseUrl(request)}/account`,
    });
    return NextResponse.json({ url: session.url });
  } catch (e: any) {
    console.error('portal error', e);
    return NextResponse.json({ error: e.message || 'Server error' }, { status: 500 });
  }
}

