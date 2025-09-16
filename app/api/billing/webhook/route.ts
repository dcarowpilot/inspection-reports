import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { getStripe, mapPriceToPlan } from '@/lib/stripe';
import { getAdminClient } from '@/lib/supabaseAdmin';

export async function POST(request: Request) {
  const stripe = getStripe();
  const sig = headers().get('stripe-signature');
  const whSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!whSecret) return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });

  let event: any;
  try {
    const text = await request.text();
    event = stripe.webhooks.constructEvent(text, sig as string, whSecret);
  } catch (err: any) {
    console.error('Webhook signature verification failed.', err.message);
    return new NextResponse('Bad signature', { status: 400 });
  }

  try {
    const admin = getAdminClient();

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as any;
        const customerId = session.customer as string | undefined;
        const subscriptionId = session.subscription as string | undefined;
        const priceId = session?.line_items?.data?.[0]?.price?.id || session?.metadata?.price_id;
        const plan = mapPriceToPlan(priceId);
        const userId = session?.client_reference_id || session?.metadata?.supabaseUserId || null;
        // No user id via metadata; rely on upcoming subscription.updated to set plan
        if (customerId && userId) {
          await admin.from('profiles').update({ stripe_customer_id: customerId }).eq('id', userId);
        }
        if (subscriptionId && userId) {
          await admin
            .from('profiles')
            .update({ stripe_subscription_id: subscriptionId })
            .eq('id', userId);
        }
        break;
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub = event.data.object as any;
        const customerId = sub.customer as string;
        const status = sub.status as string;
        const current_period_end = new Date((sub.current_period_end as number) * 1000).toISOString();
        const priceId = sub.items?.data?.[0]?.price?.id as string | undefined;
        const plan = mapPriceToPlan(priceId);

        // lookup profile by customer id
        const { data } = await admin
          .from('profiles')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single();
        const id = (data as any)?.id as string | undefined;
        if (id) {
          await admin
            .from('profiles')
            .update({
              plan: plan || 'free',
              stripe_subscription_id: sub.id,
              subscription_status: status,
              current_period_end,
            })
            .eq('id', id);
        }
        break;
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object as any;
        const customerId = sub.customer as string;
        const { data } = await getAdminClient()
          .from('profiles')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single();
        const id = (data as any)?.id as string | undefined;
        if (id) {
          await getAdminClient()
            .from('profiles')
            .update({ plan: 'free', subscription_status: 'canceled' })
            .eq('id', id);
        }
        break;
      }
      default:
        // noop
        break;
    }
    return NextResponse.json({ received: true });
  } catch (e: any) {
    console.error('Webhook handler error', e);
    return NextResponse.json({ error: 'Webhook error' }, { status: 500 });
  }
}

export const runtime = 'nodejs';

