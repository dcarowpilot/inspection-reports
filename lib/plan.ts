export type PlanKey = 'free' | 'premium' | 'super';

export type Entitlements = {
  name: string;
  price: number;
  maxReports: number;
  maxItems: number;
  maxPhotosPerItem: number;
  canDownloadDocx: boolean;
  canCreateTemplates: boolean;
  showAds: boolean;
  brandedFooter: boolean;
};

export const PLANS: Record<PlanKey, Entitlements> = {
  free: {
    name: 'Free',
    price: 0,
    maxReports: 3,
    maxItems: 5,
    maxPhotosPerItem: 2,
    canDownloadDocx: false,
    canCreateTemplates: false,
    showAds: true,
    brandedFooter: true,
  },
  premium: {
    name: 'Premium',
    price: 4.99,
    maxReports: 10,
    maxItems: 25,
    maxPhotosPerItem: 4,
    canDownloadDocx: true,
    canCreateTemplates: true,
    showAds: false,
    brandedFooter: false,
  },
  super: {
    name: 'Super Premium',
    price: 19.99,
    maxReports: 50,
    maxItems: 40,
    maxPhotosPerItem: 6,
    canDownloadDocx: true,
    canCreateTemplates: true,
    showAds: false,
    brandedFooter: false,
  },
};

export function getEntitlements(plan: PlanKey | undefined | null): Entitlements {
  return PLANS[(plan as PlanKey) || 'free'];
}

