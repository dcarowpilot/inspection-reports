import Stripe from 'stripe';

export function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY is not set');
  // Use 2022-11-15 or newer
  return new Stripe(key, { apiVersion: '2024-06-20' } as any);
}

export function getBaseUrl(req: Request) {
  try {
    const url = new URL(req.url);
    return `${url.protocol}//${url.host}`;
  } catch {
    return process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  }
}

export function mapPriceToPlan(priceId: string | null | undefined): 'premium' | 'super' | null {
  if (!priceId) return null;
  if (priceId === process.env.STRIPE_PRICE_PREMIUM) return 'premium';
  if (priceId === process.env.STRIPE_PRICE_SUPER) return 'super';
  return null;
}

