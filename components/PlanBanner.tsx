'use client'

import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { usePlan } from '@/components/PlanProvider'

export function PlanBanner() {
  const { planKey, entitlements, loading } = usePlan()

  if (loading) {
    return null
  }

  const message =
    planKey === 'free'
      ? `Free plan - Limited to ${entitlements.maxReports} reports - Ads enabled.`
      : planKey === 'premium'
      ? 'Premium plan - Ads hidden - Expanded limits.'
      : 'Super Premium plan - Maximum limits unlocked.'

  return (
    <div className="rounded-2xl border bg-white shadow-sm">
      <div className="flex flex-wrap items-center gap-3 px-4 py-3">
        <Badge variant="outline" className="text-sm capitalize">
          {entitlements.name}
        </Badge>
        <div className="text-sm text-muted-foreground">{message}</div>
        <div className="ml-auto flex items-center gap-2">
          {planKey === 'free' ? (
            <Button asChild size="sm">
              <Link href="/account">Upgrade</Link>
            </Button>
          ) : (
            <Button asChild size="sm" variant="outline">
              <Link href="/account">Manage billing</Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

