'use client'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Menu, X } from 'lucide-react'

export default function Navbar() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [role, setRole] = useState<string | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUser(user)
      const { data } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()
      if (data) setRole(data.role)
    }
    getUser()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <nav className="bg-white text-[#2F3195] px-4 py-3 shadow-md">
      <div className="max-w-6xl mx-auto flex justify-between items-center">
        {/* ✅ โลโก้ */}
        <Link href="/" className="flex items-center gap-2">
          <img
            src="/logo.png" // ✅ รูปใน public/
            alt="Car Booking Logo"
            className="w-8 h-8 object-contain"
          />
          <span className="font-bold text-lg">ระบบจองรถ</span>
        </Link>


        {/* ✅ ปุ่มแฮมเบอร์เกอร์ (มือถือเท่านั้น) */}
        <button
          className="sm:hidden focus:outline-none"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>

        {/* ✅ เมนู (desktop) */}
        <div className="hidden sm:flex items-center space-x-4">
          {role === 'admin' && (
            <Link href="/admin" className="hover:underline">
              จัดการระบบ
            </Link>
          )}
          <button
            onClick={handleLogout}
            className="bg-white text-blue-600 px-3 py-1 rounded-md hover:bg-blue-100 transition"
          >
            ออกจากระบบ
          </button>
        </div>
      </div>

      {/* ✅ เมนูมือถือ (toggle) */}
      {menuOpen && (
        <div className="sm:hidden mt-3 border-t border-blue-400 pt-2 space-y-2">
          {role === 'admin' && (
            <Link
              href="/admin"
              onClick={() => setMenuOpen(false)}
              className="block px-2 py-2 hover:bg-blue-500 rounded-md"
            >
              จัดการระบบ
            </Link>
          )}
          <button
            onClick={() => {
              setMenuOpen(false)
              handleLogout()
            }}
            className="block w-full text-left bg-white text-blue-600 px-3 py-2 rounded-md hover:bg-blue-100 transition"
          >
            ออกจากระบบ
          </button>
        </div>
      )}
    </nav>
  )
}
