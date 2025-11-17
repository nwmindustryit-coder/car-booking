'use client'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Menu, X } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

export default function Navbar() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [role, setRole] = useState<string | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [showChangePassword, setShowChangePassword] = useState(false)
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')

  const handleChangePassword = async () => {
    setPasswordError('')

    if (!oldPassword || !newPassword || !confirmPassword) {
      return setPasswordError("กรุณากรอกข้อมูลให้ครบทุกช่อง")
    }

    if (newPassword.length < 8) {
      return setPasswordError("รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 8 ตัวอักษร")
    }

    if (newPassword !== confirmPassword) {
      return setPasswordError("รหัสผ่านใหม่และการยืนยันไม่ตรงกัน")
    }

    // 1) ตรวจสอบรหัสผ่านเก่าโดยการ login ใหม่
    const { data: reauth, error: reauthError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: oldPassword
    })

    if (reauthError) {
      return setPasswordError("รหัสผ่านเดิมไม่ถูกต้อง")
    }

    // 2) เปลี่ยนรหัสผ่านด้วย Supabase update
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword
    })

    if (updateError) {
      return setPasswordError(updateError.message)
    }

    alert("เปลี่ยนรหัสผ่านเรียบร้อยแล้ว 🎉")
    setShowChangePassword(false)
    setOldPassword('')
    setNewPassword('')
    setConfirmPassword('')
  }




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
          <Button onClick={() => setShowChangePassword(true)}>
            🔒 เปลี่ยนรหัสผ่าน
          </Button>
          {role === 'admin' && (
            <Link href="/admin" className="hover:underline">
              จัดการระบบ
            </Link>
          )}
          <Link href="/private-mile" className="hover:underline">
            ลงไมล์รถส่วนตัว
          </Link>
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
          <Button onClick={() => setShowChangePassword(true)}>
            🔒 เปลี่ยนรหัสผ่าน
          </Button>
          {role === 'admin' && (
            <Link
              href="/admin"
              onClick={() => setMenuOpen(false)}
              className="block px-2 py-2 hover:bg-blue-500 rounded-md"
            >
              จัดการระบบ
            </Link>
          )}
          <Link href="/private-mile" className="hover:underline">
            ลงไมล์รถส่วนตัว
          </Link>

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
      <Dialog open={showChangePassword} onOpenChange={setShowChangePassword}>
        <DialogContent className="w-[95vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-blue-700">
              🔒 เปลี่ยนรหัสผ่าน
            </DialogTitle>
            <p className="text-sm text-gray-500">
              เพื่อความปลอดภัย กรุณากรอกรหัสผ่านปัจจุบันก่อนเปลี่ยนรหัสผ่านใหม่
            </p>
          </DialogHeader>

          {/* Form */}
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-sm font-medium">รหัสผ่านปัจจุบัน</label>
              <Input
                type="password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                placeholder="กรอกรหัสผ่านเดิม"
              />
            </div>

            <div>
              <label className="text-sm font-medium">รหัสผ่านใหม่</label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="8 ตัวอักษรขึ้นไป"
              />
            </div>

            <div>
              <label className="text-sm font-medium">ยืนยันรหัสผ่านใหม่</label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="พิมพ์รหัสผ่านใหม่อีกครั้ง"
              />
            </div>

            {passwordError && (
              <div className="text-red-600 text-sm font-medium">{passwordError}</div>
            )}

            <Button
              className="w-full bg-blue-600 text-white hover:bg-blue-700"
              onClick={handleChangePassword}
            >
              💾 บันทึกรหัสผ่านใหม่
            </Button>
          </div>
        </DialogContent>
      </Dialog>

    </nav>

  )
}
