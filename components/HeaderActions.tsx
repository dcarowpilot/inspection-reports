'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'
import { LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabaseClient'

export function HeaderActions() {
  const router = useRouter()
  const [signingOut, setSigningOut] = useState(false)

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
    <>
      <Button variant="outline" asChild className="h-9 px-3">
        <Link href="/account">Account</Link>
      </Button>
      <Button variant="secondary" onClick={signOut} disabled={signingOut} className="h-9 px-3">
        <LogOut className="mr-2 h-4 w-4" />
        {signingOut ? 'Signing out...' : 'Sign out'}
      </Button>
    </>
  )
}