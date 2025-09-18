'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { FilePlus, ListChecks, ScrollText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const NAV_LINKS = [
  { href: '/drafts', label: 'Drafts', icon: ListChecks },
  { href: '/final', label: 'Final Reports', icon: ScrollText },
]

export default function AppHeader() {
  const pathname = usePathname()

  return (
    <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
      <Link href="/home" className="text-lg font-semibold tracking-tight text-gray-900 transition hover:text-primary">
        Inspection Report Maker
      </Link>
      <nav className="flex flex-wrap items-center gap-2">
        {NAV_LINKS.map(({ href, label, icon: Icon }) => {
          const isActive = pathname?.startsWith(href)
          return (
            <Button
              key={href}
              variant={isActive ? 'default' : 'ghost'}
              asChild
              className={cn('h-9 px-3', !isActive && 'text-muted-foreground')}
            >
              <Link href={href} className="flex items-center gap-1">
                <Icon className="h-4 w-4" />
                <span>{label}</span>
              </Link>
            </Button>
          )
        })}
        <Button asChild className="h-9 px-3">
          <Link href="/drafts/new" className="flex items-center gap-1">
            <FilePlus className="h-4 w-4" />
            <span>New Report</span>
          </Link>
        </Button>
        <Button variant="outline" asChild className="h-9 px-3">
          <Link href="/account">Account</Link>
        </Button>
      </nav>
    </header>
  )
}
