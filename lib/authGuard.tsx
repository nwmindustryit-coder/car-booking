'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'

export function useAdminGuard() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [allowed, setAllowed] = useState(false)

  useEffect(() => {
    const check = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return router.push('/login')

      const { data } = await supabase.from('profiles').select('role').eq('id', user.id).single()
      if (data?.role === 'admin') setAllowed(true)
      else router.push('/')
      setLoading(false)
    }
    check()
  }, [router])

  return { loading, allowed }
}
