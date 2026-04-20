'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

export function useAuthRedirect(protectedPath = true) {
  const router = useRouter()

  useEffect(() => {
    const checkAuth = async () => {
      const { data, error } = await supabase.auth.getUser()
      if (protectedPath && (!data.user || error)) {
        router.replace('/login')
      }
    }
    checkAuth()
  }, [protectedPath, router])
}
