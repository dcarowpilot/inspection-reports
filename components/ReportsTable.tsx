'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

type BaseRow = {
  id: string
  report_id?: string | null
  title?: string | null
  inspection_date?: string | null
}

type ReportsTableProps<T extends BaseRow> = {
  rows: T[]
  loading?: boolean
  emptyMessage?: string
  onRowClick?: (row: T) => void
  getRowHref?: (row: T) => string | null
  renderActions?: (row: T) => ReactNode
}

export function ReportsTable<T extends BaseRow>({
  rows,
  loading,
  emptyMessage = 'No reports yet.',
  onRowClick,
  getRowHref,
  renderActions,
}: ReportsTableProps<T>) {
  return (
    <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[1%] whitespace-nowrap text-muted-foreground">#</TableHead>
            <TableHead className="w-[1%] whitespace-nowrap">Report ID</TableHead>
            <TableHead>Title</TableHead>
            <TableHead className="w-[1%] whitespace-nowrap">Date</TableHead>
            <TableHead className="w-[1%] whitespace-nowrap text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading
            ? Array.from({ length: 4 }).map((_, index) => (
                <TableRow key={`skeleton-${index}`}>
                  <TableCell><Skeleton className="h-4 w-6" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="ml-auto h-4 w-12" /></TableCell>
                </TableRow>
              ))
            : rows.length === 0
            ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                    {emptyMessage}
                  </TableCell>
                </TableRow>
              )
            : rows.map((row, index) => {
                const href = getRowHref?.(row)
                const formattedDate = row.inspection_date
                  ? new Date(row.inspection_date).toLocaleDateString()
                  : '—'
                const handleClick = () => {
                  if (onRowClick) {
                    onRowClick(row)
                  }
                }
                const clickable = Boolean(onRowClick)

                return (
                  <TableRow
                    key={row.id}
                    onClick={clickable ? handleClick : undefined}
                    className={cn(clickable && 'cursor-pointer hover:bg-muted/50')}
                  >
                    <TableCell className="font-medium text-muted-foreground">
                      {index + 1}
                    </TableCell>
                    <TableCell>
                      {href ? (
                        <Link href={href} className="font-mono text-xs text-muted-foreground underline">
                          {row.report_id ?? row.id}
                        </Link>
                      ) : (
                        <div className="font-mono text-xs text-muted-foreground">
                          {row.report_id ?? row.id}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="max-w-[20rem] truncate text-sm text-gray-900">
                        {row.title || 'Untitled report'}
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                      {formattedDate}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-right text-sm">
                      {renderActions ? renderActions(row) : null}
                    </TableCell>
                  </TableRow>
                )
              })}
        </TableBody>
      </Table>
    </div>
  )
}

