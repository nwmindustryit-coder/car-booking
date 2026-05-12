'use client'
import { useAdminGuard } from '@/lib/authGuard'
// Navbar ถูกเรียกใช้ในหน้าลูก (children) แยกแต่ละหน้าแล้ว ไม่ต้องใส่ซ้ำตรงนี้ครับ

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { loading, allowed } = useAdminGuard()

  if (loading) return (
    <main className="flex flex-col items-center justify-center h-screen text-blue-600 bg-slate-50 dark:bg-slate-900 transition-colors duration-300">
      <svg
        className="animate-spin h-8 w-8 mb-3 text-blue-500"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
        />
      </svg>
      <p className="text-gray-500 dark:text-slate-400 animate-pulse">
        กำลังตรวจสอบสิทธิ์ผู้ใช้...
      </p>
    </main>
  )
  
  if (!allowed) return null

  return <>{children}</>
}