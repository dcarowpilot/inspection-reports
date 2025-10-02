'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { FileText, LogOut, NotebookPen } from 'lucide-react'
import AppHeader from '@/components/AppHeader'
import { PlanBanner } from '@/components/PlanBanner'
import { supabase } from '@/lib/supabaseClient'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default function Home() {
  const router = useRouter()
  const [draftCount, setDraftCount] = useState<number | null>(null)
  const [finalCount, setFinalCount] = useState<number | null>(null)
  const [signingOut, setSigningOut] = useState(false)

  useEffect(() => {
    const loadCounts = async () => {
      const { count: dCount } = await supabase
        .from('reports')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'draft')
      setDraftCount(dCount ?? 0)

      const { count: fCount } = await supabase
        .from('reports')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'final')
      setFinalCount(fCount ?? 0)
    }
    loadCounts()
  }, [])

  const signOut = async () => {
    setSigningOut(true)
    try {
      await supabase.auth.signOut()
      toast.success('Signed out')
      router.replace('/')
    } catch (error) {
      toast.error('Unable to sign out. Please try again.')
    } finally {
      setSigningOut(false)
    }
  }

  return (
    <div className="space-y-6">
      <AppHeader
        rightContent={
          <>
            <Button variant="outline" asChild className="h-9 px-3">
              <Link href="/account">Account</Link>
            </Button>
            <Button
              variant="secondary"
              onClick={signOut}
              disabled={signingOut}
              className="h-9 px-3"
            >
              <LogOut className="mr-2 h-4 w-4" />
              {signingOut ? 'Signing out...' : 'Sign out'}
            </Button>
          </>
        }
      />
      <PlanBanner />
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900">Welcome back</h1>
          <p className="text-sm text-muted-foreground">
            Jump into a draft or review your final reports.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="rounded-2xl border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <CardTitle className="text-lg">Create a draft</CardTitle>
            <div className="rounded-full bg-secondary p-2">
              <NotebookPen className="h-5 w-5 text-secondary-foreground" />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Start a new inspection report with photos, notes, and findings.
            </p>
            <Button asChild className="w-full">
              <Link href="/drafts/new">New draft</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <CardTitle className="text-lg">Draft reports</CardTitle>
            <Badge variant="outline" className="text-sm">
              {draftCount ?? '...'}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Continue editing your in-progress reports and add more detail.
            </p>
            <Button asChild variant="secondary" className="w-full">
              <Link href="/drafts">View drafts</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <CardTitle className="text-lg">Final reports</CardTitle>
            <Badge variant="outline" className="text-sm">
              {finalCount ?? '...'}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Download, share, or revert final reports back to draft status.
            </p>
            <div className="flex gap-2">
              <Button asChild variant="ghost" className="w-full">
                <Link href="/final" className="flex items-center justify-center gap-2">
                  <FileText className="h-4 w-4" />
                  View final reports
                </Link>
              </Button>
              <Button asChild variant="ghost" className="w-full">
                <Link href="/drafts">Switch to drafts</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
