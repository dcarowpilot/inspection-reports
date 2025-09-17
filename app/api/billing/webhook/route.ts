import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { getStripe, mapPriceToPlan } from '@/lib/stripe';
import { getAdminClient } from '@/lib/supabaseAdmin';

function extractUserId(source: any): string | null {
  return (
    source?.client_reference_id ||
    source?.metadata?.supabaseUserId ||
    source?.metadata?.supabase_user_id ||
    source?.metadata?.user_id ||
    null
  );
}

function extractPriceId(source: any): string | null {
  return (
    source?.line_items?.data?.[0]?.price?.id ||
    source?.items?.data?.[0]?.price?.id ||
    source?.metadata?.price_id ||
    source?.metadata?.priceId ||
    source?.latest_invoice?.lines?.data?.[0]?.price?.id ||
    source?.subscription_details?.metadata?.price_id ||
    null
  );
}

async function ensureUpsert(admin: ReturnType<typeof getAdminClient>, payload: Record<string, any>) {
  const { error } = await admin.from('profiles').upsert(payload, { onConflict: 'id' });
  if (error) {
    console.error('[webhook] upsert failed', payload, error);
    throw error;
  }
}

export async function POST(request: Request) {
  const stripe = getStripe();
  const headerList = await headers();
  const sig = headerList.get('stripe-signature');
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
        const priceId = extractPriceId(session);
        const plan = mapPriceToPlan(priceId);
        const userId = extractUserId(session);
        if (customerId && userId) {
          await ensureUpsert(admin, { id: userId, stripe_customer_id: customerId });
        }
        if (subscriptionId && userId) {
          await ensureUpsert(admin, {
            id: userId,
            stripe_subscription_id: subscriptionId,
            plan: plan || 'free',
          });
        }
        break;
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub = event.data.object as any;
        const customerId = sub.customer as string;
        const status = sub.status as string;
        const currentPeriodEnd = typeof sub.current_period_end === 'number'
          ? new Date(sub.current_period_end * 1000).toISOString()
          : null;
        const priceId = extractPriceId(sub);
        const plan = mapPriceToPlan(priceId);
        const fallbackUserId = extractUserId(sub);

        const { data, error } = await admin
          .from('profiles')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .maybeSingle();
        if (error) throw error;
        const id = (data as any)?.id as string | undefined;
        const targetId = id || fallbackUserId || null;

        if (targetId) {
          await ensureUpsert(admin, {
            id: targetId,
            plan: plan || 'free',
            stripe_customer_id: customerId,
            stripe_subscription_id: sub.id,
            subscription_status: status,
            current_period_end: currentPeriodEnd,
          });
        } else {
          console.warn('[webhook] subscription event without resolvable user', {
            customerId,
            fallbackUserId,
            priceId,
          });
        }
        break;
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object as any;
        const customerId = sub.customer as string;
        const fallbackUserId = extractUserId(sub);
        const { data, error } = await admin
          .from('profiles')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .maybeSingle();
        if (error) throw error;
        const id = (data as any)?.id as string | undefined;
        const targetId = id || fallbackUserId || null;
        if (targetId) {
          await ensureUpsert(admin, {
            id: targetId,
            plan: 'free',
            stripe_customer_id: customerId,
            stripe_subscription_id: null,
            subscription_status: 'canceled',
            current_period_end: null,
          });
        } else {
          console.warn('[webhook] subscription.deleted without matching user', {
            customerId,
            fallbackUserId,
          });
        }
        break;
      }
      default:
        break;
    }
    return NextResponse.json({ received: true });
  } catch (e: any) {
    console.error('Webhook handler error', e);
    return NextResponse.json({ error: 'Webhook error' }, { status: 500 });
  }
}

export const runtime = 'nodejs';

