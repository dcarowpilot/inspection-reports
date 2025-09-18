'use client'

import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PLANS } from '@/lib/plan'

export default function UpgradeModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6 backdrop-blur-sm">
      <div className="w-[min(92vw,760px)] space-y-4 rounded-2xl border bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Upgrade to unlock more</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Premium tiers increase report, item, and photo limits and remove ads.
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {(Object.keys(PLANS) as Array<'free' | 'premium' | 'super'>).map((tier) => {
            const plan = PLANS[tier]
            return (
              <Card key={tier} className="h-full rounded-2xl border shadow-sm">
                <CardHeader className="space-y-1">
                  <CardTitle className="flex items-center justify-between text-base">
                    {plan.name}
                    {tier !== 'free' ? (
                      <Badge variant="outline" className="uppercase tracking-wide">
                        {tier}
                      </Badge>
                    ) : null}
                  </CardTitle>
                  <div className="text-lg font-semibold text-gray-900">
                    {'$' + plan.price.toFixed(2)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-1 text-sm text-muted-foreground">
                  <p>Reports: {plan.maxReports}</p>
                  <p>Items/report: {plan.maxItems}</p>
                  <p>Photos/item: {plan.maxPhotosPerItem}</p>
                  <p>Download .docx: {plan.canDownloadDocx ? 'Included' : 'Not included'}</p>
                  <p>Templates: {plan.canCreateTemplates ? 'Included' : 'Not included'}</p>
                  <p>Ads: {plan.showAds ? 'Shown' : 'Hidden'}</p>
                </CardContent>
              </Card>
            )
          })}
        </div>
        <div className="flex items-center justify-end">
          <Button asChild onClick={onClose}>
            <Link href="/account">Go to account</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
