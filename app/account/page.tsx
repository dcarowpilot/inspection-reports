'use client'

import Link from 'next/link'
import { useCallback, useMemo, useState } from 'react'
import { toast } from 'sonner'
import AppHeader from '@/components/AppHeader'
import { PlanBanner } from '@/components/PlanBanner'
import { usePlan } from '@/components/PlanProvider'
import { supabase } from '@/lib/supabaseClient'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function AccountPage() {
  const { planKey, entitlements } = usePlan()
  const enableFakeUpgrade = process.env.NEXT_PUBLIC_ENABLE_FAKE_UPGRADE === '1'
  const [isCheckout, setIsCheckout] = useState(false)
  const [isPortal, setIsPortal] = useState(false)
  const [fakeLoading, setFakeLoading] = useState(false)

  const featureList = useMemo(
    () => [
      { label: 'Reports', value: `${entitlements.maxReports} per account` },
      { label: 'Items per report', value: `${entitlements.maxItems}` },
      { label: 'Photos per item', value: `${entitlements.maxPhotosPerItem}` },
      { label: 'Download .docx', value: entitlements.canDownloadDocx ? 'Included' : 'Not included' },
      { label: 'Templates', value: entitlements.canCreateTemplates ? 'Available' : 'Not available' },
      { label: 'Ads', value: entitlements.showAds ? 'Shown' : 'Hidden' },
    ],
    [entitlements]
  )

  const startCheckout = useCallback(async (plan: 'premium' | 'super') => {
    setIsCheckout(true)
    try {
      const response = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Checkout failed')
      }
      window.location.href = data.url
    } catch (error) {
      toast.error((error as Error).message)
    } finally {
      setIsCheckout(false)
    }
  }, [])

  const openPortal = useCallback(async () => {
    setIsPortal(true)
    try {
      const response = await fetch('/api/billing/portal', { method: 'POST' })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Unable to open billing portal')
      }
      window.location.href = data.url
    } catch (error) {
      toast.error((error as Error).message)
    } finally {
      setIsPortal(false)
    }
  }, [])

  const setPlan = useCallback(async (next: 'free' | 'premium' | 'super') => {
    setFakeLoading(true)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error('Not signed in')
      const { error } = await supabase
        .from('profiles' as any)
        .update({ plan: next })
        .eq('id', user.id)
      if (error) throw error
      toast.success(`Plan updated to ${next}`)
      window.location.reload()
    } catch (error) {
      toast.error((error as Error).message ?? 'Failed to change plan')
    } finally {
      setFakeLoading(false)
    }
  }, [])

  return (
    <div className="space-y-6">
      <AppHeader />
      <PlanBanner />

      <Card className="rounded-2xl border shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            Current plan
            <Badge variant="outline" className="capitalize">
              {entitlements.name}
            </Badge>
          </CardTitle>
          <CardDescription>
            Manage your subscription, limits, and billing preferences.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-2">
          <div className="space-y-3 text-sm">
            {featureList.map((item) => (
              <div key={item.label} className="flex items-center justify-between">
                <span className="text-muted-foreground">{item.label}</span>
                <span className="font-medium text-gray-900">{item.value}</span>
              </div>
            ))}
          </div>
          <div className="space-y-4">
            <div className="rounded-2xl border bg-muted/40 p-4 text-sm text-muted-foreground">
              <p>
                Need more capacity? Upgrade to unlock larger report quotas, remove branding,
                and hide ads for clients.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => startCheckout('premium')} disabled={isCheckout}>
                Upgrade to Premium
              </Button>
              <Button
                variant="secondary"
                onClick={() => startCheckout('super')}
                disabled={isCheckout}
              >
                Super Premium
              </Button>
              <Button variant="outline" onClick={openPortal} disabled={isPortal}>
                Manage billing
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {enableFakeUpgrade ? (
        <Card className="rounded-2xl border shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Testing controls</CardTitle>
            <CardDescription>Simulate plan changes without hitting Stripe.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {(['free', 'premium', 'super'] as Array<'free' | 'premium' | 'super'>).map((plan) => (
              <Button
                key={plan}
                variant="outline"
                size="sm"
                onClick={() => setPlan(plan)}
                disabled={fakeLoading}
              >
                Set {plan}
              </Button>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <Card className="rounded-2xl border shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Need help?</CardTitle>
          <CardDescription>Reach out if you have billing or subscription questions.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <span>Email us at</span>
          <Link href="mailto:inspectionreportmaker@gmail.com" className="font-medium text-primary">
            inspectionreportmaker@gmail.com
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}

