'use client'
import { useAdminGuard } from '@/lib/authGuard'
import Navbar from '@/components/Navbar'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { loading, allowed } = useAdminGuard()

  if (loading) return <p className="text-center mt-20 text-gray-500">กำลังตรวจสอบสิทธิ์...</p>
  if (!allowed) return null

  return (
    <>

      <div className="p-6">{children}</div>
    </>
  )
}
