import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { getStripe, getBaseUrl } from '@/lib/stripe';
import { getAdminClient } from '@/lib/supabaseAdmin';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const plan: 'premium' | 'super' = body?.plan;
    if (!plan || !['premium', 'super'].includes(plan)) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
    }

    const priceId = plan === 'premium' ? process.env.STRIPE_PRICE_PREMIUM : process.env.STRIPE_PRICE_SUPER;
    if (!priceId) return NextResponse.json({ error: 'Price not configured' }, { status: 500 });

    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({ cookies: async () => cookieStore });
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const admin = getAdminClient();
    const { data: profile, error: profileError } = await admin
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .maybeSingle();
    if (profileError && profileError.code !== 'PGRST116') throw profileError;
    if (!profile) {
      await admin.from('profiles').insert({ id: user.id, plan: 'free' });
    }

    const stripe = getStripe();
    let customerId = profile?.stripe_customer_id as string | undefined;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email || undefined,
        metadata: { supabaseUserId: user.id },
      });
      customerId = customer.id;
      await admin.from('profiles').update({ stripe_customer_id: customerId }).eq('id', user.id);
    }

    const baseUrl = getBaseUrl(request);
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      client_reference_id: user.id,
      metadata: { supabaseUserId: user.id, price_id: priceId, plan },
      subscription_data: {
        metadata: { supabaseUserId: user.id, price_id: priceId, plan },
      },
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${baseUrl}/account?upgrade=success`,
      cancel_url: `${baseUrl}/account?upgrade=cancelled`,
      allow_promotion_codes: true,
      expand: ['line_items'],
    });

    return NextResponse.json({ url: session.url });
  } catch (e: any) {
    console.error('checkout error', e);
    return NextResponse.json({ error: e.message || 'Server error' }, { status: 500 });
  }
}

