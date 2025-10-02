'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Trash2 } from 'lucide-react'
import AppHeader from '@/components/AppHeader'
import { HeaderActions } from '@/components/HeaderActions'
import { PlanBanner } from '@/components/PlanBanner'
import UpgradeModal from '@/components/UpgradeModal'
import { usePlan } from '@/components/PlanProvider'
import { supabase } from '@/lib/supabaseClient'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { ReportsTable } from '@/components/ReportsTable'

export type DraftRow = {
  id: string
  inspection_date: string | null
  inspector_name: string | null
  report_id: string | null
  title: string | null
  status: 'draft' | 'final'
}

export default function DraftsPage() {
  const router = useRouter()
  const { entitlements } = usePlan()
  const [rows, setRows] = useState<DraftRow[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [showUpgrade, setShowUpgrade] = useState(false)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from('reports')
        .select('id, inspection_date, report_id, title, status')
        .eq('status', 'draft')
        .order('inspection_date', { ascending: false })

      if (error) {
        toast.error(error.message)
      } else {
        setRows((data ?? []) as DraftRow[])
      }
      setLoading(false)
    }

    load()
  }, [])

  const openDraft = (id: string) => {
    router.push(`/drafts/${id}`)
  }

  const newDraft = async () => {
    setCreating(true)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error('Please sign in first.')

      const { count } = await supabase
        .from('reports')
        .select('id', { count: 'exact', head: true })
        .or(`created_by.eq.${user.id},created_by.is.null`)
      if ((count ?? 0) >= entitlements.maxReports) {
        setShowUpgrade(true)
        return
      }

      const { data: inserted, error } = await supabase
        .from('reports')
        .insert({
          status: 'draft',
          created_by: user.id,
          report_id: null,
          title: null,
          inspector_name: null,
          inspection_date: new Date().toISOString().slice(0, 10),
          details: null,
        })
        .select('id')
        .single()
      if (error) throw error

      await supabase.from('report_items').insert({
        report_id: inserted.id,
        idx: 1,
        title: '',
        result: 'na',
        notes: '',
      })

      toast.success('Draft created')
      router.push(`/drafts/${inserted.id}`)
    } catch (error) {
      toast.error((error as Error).message ?? 'Failed to create draft')
    } finally {
      setCreating(false)
    }
  }

  const deleteDraft = async (reportId: string) => {
    setDeletingId(reportId)
    try {
      const { data: items } = await supabase
        .from('report_items')
        .select('id')
        .eq('report_id', reportId)
      const itemIds = (items ?? []).map((item: any) => item.id)

      if (itemIds.length) {
        const { data: photos } = await supabase
          .from('report_item_photos')
          .select('storage_path')
          .in('report_item_id', itemIds)
        const paths = (photos ?? []).map((p: any) => p.storage_path).filter(Boolean)
        if (paths.length) await supabase.storage.from('photos').remove(paths)
        if ((photos ?? []).length) {
          await supabase.from('report_item_photos').delete().in('report_item_id', itemIds)
        }
      }

      await supabase.from('report_items').delete().eq('report_id', reportId)
      const { error } = await supabase.from('reports').delete().eq('id', reportId)
      if (error) throw error

      setRows((prev) => prev.filter((row) => row.id !== reportId))
      toast.success('Draft deleted')
    } catch (error) {
      toast.error((error as Error).message ?? 'Delete failed')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-6">
      <AppHeader rightContent={<HeaderActions />} />
      <PlanBanner />

      <Card className="rounded-2xl border shadow-sm">
        <CardHeader className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="text-lg">Draft reports</CardTitle>
            <CardDescription>Continue editing or create a new inspection report.</CardDescription>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="text-sm">
              {rows.length} active
            </Badge>
            <Button onClick={newDraft} disabled={creating}>
              {creating ? 'Creating...' : 'New draft'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <ReportsTable
            rows={rows}
            loading={loading}
            emptyMessage="You don't have any drafts yet. Start a new report to begin documenting."
            onRowClick={(row) => openDraft(row.id)}
            getRowHref={(row) => `/drafts/${row.id}`}
            renderActions={(row) => (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <Trash2 className="mr-1 h-4 w-4" /> Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete draft?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This permanently removes the draft, its items, and any photos.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={async () => {
                        await deleteDraft(row.id)
                      }}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      disabled={deletingId === row.id}
                    >
                      {deletingId === row.id ? 'Deleting...' : 'Delete'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          />
        </CardContent>
      </Card>

      <UpgradeModal open={showUpgrade} onClose={() => setShowUpgrade(false)} />
    </div>
  )
}

