'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ArrowLeftRight, FileDown, Trash2 } from 'lucide-react'
import AppHeader from '@/components/AppHeader'
import { PlanBanner } from '@/components/PlanBanner'
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

export type FinalRow = {
  id: string
  inspection_date: string | null
  inspector_name: string | null
  report_id: string | null
  title: string | null
  status: 'draft' | 'final'
}

export default function FinalsPage() {
  const router = useRouter()
  const [rows, setRows] = useState<FinalRow[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from('reports')
        .select('id, inspection_date, report_id, title, status')
        .eq('status', 'final')
        .order('inspection_date', { ascending: false })

      if (error) {
        toast.error(error.message)
      } else {
        setRows((data ?? []) as FinalRow[])
      }
      setLoading(false)
    }

    load()
  }, [])

  const downloadPdf = (id: string) => {
    window.open(`/print/${id}`, '_blank')
  }

  const revertToDraft = async (reportId: string) => {
    setBusyId(reportId)
    try {
      const { error } = await supabase
        .from('reports')
        .update({ status: 'draft' })
        .eq('id', reportId)
      if (error) throw error
      toast.success('Report reverted to draft')
      router.push(`/drafts/${reportId}`)
    } catch (error) {
      toast.error((error as Error).message ?? 'Failed to revert')
    } finally {
      setBusyId(null)
    }
  }

  const deleteReport = async (reportId: string) => {
    setBusyId(reportId)
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
      toast.success('Report deleted')
    } catch (error) {
      toast.error((error as Error).message ?? 'Delete failed')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="space-y-6">
      <AppHeader />
      <PlanBanner />

      <Card className="rounded-2xl border shadow-sm">
        <CardHeader className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="text-lg">Final reports</CardTitle>
            <CardDescription>Download, share, or move a report back into drafts.</CardDescription>
          </div>
          <Badge variant="outline" className="text-sm">
            {rows.length} published
          </Badge>
        </CardHeader>
        <CardContent>
          <ReportsTable
            rows={rows}
            loading={loading}
            emptyMessage="No final reports yet. Publish a draft to see it here."
            onRowClick={(row) => router.push(`/final/${row.id}`)}
            getRowHref={(row) => `/final/${row.id}`}
            renderActions={(row) => (
              <div className="flex justify-end gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(event) => {
                    event.stopPropagation()
                    downloadPdf(row.id)
                  }}
                >
                  <FileDown className="mr-1 h-4 w-4" /> PDF
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <ArrowLeftRight className="mr-1 h-4 w-4" /> Revert
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Revert to draft?</AlertDialogTitle>
                      <AlertDialogDescription>
                        You can continue editing the report once it returns to drafts.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={async () => {
                          await revertToDraft(row.id)
                        }}
                        disabled={busyId === row.id}
                      >
                        {busyId === row.id ? 'Reverting...' : 'Revert'}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
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
                      <AlertDialogTitle>Delete report?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action permanently removes the report, items, and photos.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={async () => {
                          await deleteReport(row.id)
                        }}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        disabled={busyId === row.id}
                      >
                        {busyId === row.id ? 'Deleting...' : 'Delete'}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}
          />
        </CardContent>
      </Card>
    </div>
  )
}

