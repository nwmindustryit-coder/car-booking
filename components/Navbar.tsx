'use client'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Menu, X, LogOut, KeyRound, LayoutDashboard, Settings, Map, Clock, CalendarDays } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"

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
  const [scrolled, setScrolled] = useState(false)

  // Effect สำหรับเช็ค Scroll เพื่อเปลี่ยนสไตล์ Navbar
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // ป้องกันการ Scroll หน้าเว็บตอนเปิดเมนูมือถือ
  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [menuOpen]);

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

    const { error: reauthError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: oldPassword
    })

    if (reauthError) {
      return setPasswordError("รหัสผ่านเดิมไม่ถูกต้อง")
    }

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

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <>
      <nav className={`fixed top-0 w-full z-[100] transition-all duration-300 ${scrolled ? 'bg-white/80 dark:bg-slate-900/80 backdrop-blur-md shadow-sm border-b border-slate-200 dark:border-slate-700 py-3' : 'bg-white dark:bg-slate-900 py-4 border-b border-slate-100 dark:border-slate-800'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex justify-between items-center relative z-20">
          
          {/* ✅ โลโก้ */}
          <Link href="/" className="flex items-center gap-3 group z-50">
            <img src="/logo.png" alt="Logo" className="w-10 h-10 object-contain brightness-0 dark:invert transition-all" />
            <span className="font-extrabold text-xl text-slate-800 dark:text-white tracking-tight transition-colors">Nawa<span className="text-blue-600 dark:text-blue-400 font-medium">mit</span></span>
          </Link>

          {/* ✅ ปุ่มแฮมเบอร์เกอร์ (มือถือ) */}
          <button
            className="sm:hidden relative z-50 p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            <div className="relative w-6 h-6 flex items-center justify-center">
              <span className={`absolute w-full h-0.5 bg-current transform transition-all duration-300 ease-in-out ${menuOpen ? 'rotate-45 translate-y-0' : '-translate-y-2'}`} />
              <span className={`absolute w-full h-0.5 bg-current transform transition-all duration-300 ease-in-out ${menuOpen ? 'opacity-0 scale-x-0' : 'opacity-100 scale-x-100'}`} />
              <span className={`absolute w-full h-0.5 bg-current transform transition-all duration-300 ease-in-out ${menuOpen ? '-rotate-45 translate-y-0' : 'translate-y-2'}`} />
            </div>
          </button>

          {/* ✅ เมนู (Desktop) */}
          <div className="hidden sm:flex items-center space-x-1 lg:space-x-2">
            
            <Link href="/calendar" className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-2">
              <CalendarDays className="w-4 h-4"/> ปฏิทินคิวรถ
            </Link>

            <Link href="/private-mile" className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-2">
              <Map className="w-4 h-4"/> ลงไมล์รถส่วนตัว
            </Link>
            
            <Link href="/work-out" className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-2">
              <Clock className="w-4 h-4"/> บันทึกเวลาทำงาน
            </Link>

            {role === 'admin' && (
              <Link href="/admin" className="px-4 py-2 text-sm font-medium text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 hover:bg-amber-100 dark:hover:bg-amber-900/50 rounded-lg transition-colors flex items-center gap-2">
                <Settings className="w-4 h-4"/> จัดการระบบ
              </Link>
            )}

            <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-2 transition-colors"></div>

            <Button variant="ghost" size="sm" onClick={() => setShowChangePassword(true)} className="text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white dark:hover:bg-slate-800 gap-2 transition-colors">
              <KeyRound className="w-4 h-4"/>
            </Button>

            <Button variant="default" size="sm" onClick={handleLogout} className="bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 dark:hover:bg-slate-600 text-white rounded-lg px-4 gap-2 shadow-sm transition-colors">
              <LogOut className="w-4 h-4"/> ออกจากระบบ
            </Button>
          </div>
        </div>

        {/* ✅ เมนูมือถือ (Mobile Overlay) แบบเทพๆ */}
        <div className={`
          sm:hidden fixed inset-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl
          transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]
          ${menuOpen ? 'opacity-100 pointer-events-auto visible' : 'opacity-0 pointer-events-none invisible'}
        `}>
          <div className="h-full flex flex-col pt-24 pb-8 px-6 overflow-y-auto">
            
            {/* User Profile Card */}
            <div className={`
              flex items-center gap-4 p-4 mb-8 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800
              transform transition-all duration-500 delay-100
              ${menuOpen ? 'translate-y-0 opacity-100' : '-translate-y-8 opacity-0'}
            `}>
              <div className="w-14 h-14 bg-blue-100 dark:bg-blue-900/50 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-2xl shadow-inner">
                 {user?.email?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="overflow-hidden flex-1">
                <p className="text-base font-bold text-slate-800 dark:text-slate-100 truncate">{user?.email || 'Loading...'}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <p className="text-sm text-slate-500 dark:text-slate-400 capitalize">{role || 'User'}</p>
                </div>
              </div>
            </div>

            {/* Navigation Links */}
            <div className="flex flex-col gap-3 flex-1">
              <Link href="/calendar" onClick={() => setMenuOpen(false)} className={`
                flex items-center gap-4 px-5 py-4 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm rounded-2xl
                text-slate-700 dark:text-slate-200 font-medium active:scale-95 transition-all duration-300 delay-150
                ${menuOpen ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}
              `}>
                <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg text-blue-500 dark:text-blue-400"><CalendarDays className="w-5 h-5"/></div>
                <span className="text-[15px]">ปฏิทินคิวรถส่วนกลาง</span>
              </Link>

              <Link href="/private-mile" onClick={() => setMenuOpen(false)} className={`
                flex items-center gap-4 px-5 py-4 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm rounded-2xl
                text-slate-700 dark:text-slate-200 font-medium active:scale-95 transition-all duration-300 delay-200
                ${menuOpen ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}
              `}>
                <div className="p-2 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg text-emerald-500 dark:text-emerald-400"><Map className="w-5 h-5"/></div>
                <span className="text-[15px]">ลงไมล์รถส่วนตัว</span>
              </Link>
              
              <Link href="/work-out" onClick={() => setMenuOpen(false)} className={`
                flex items-center gap-4 px-5 py-4 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm rounded-2xl
                text-slate-700 dark:text-slate-200 font-medium active:scale-95 transition-all duration-300 delay-250
                ${menuOpen ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}
              `}>
                <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg text-indigo-500 dark:text-indigo-400"><Clock className="w-5 h-5"/></div>
                <span className="text-[15px]">บันทึกเวลาทำงานนอกสถานที่</span>
              </Link>

              {role === 'admin' && (
                <Link href="/admin" onClick={() => setMenuOpen(false)} className={`
                  flex items-center gap-4 px-5 py-4 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200 dark:border-amber-800 shadow-sm rounded-2xl
                  text-amber-800 dark:text-amber-300 font-bold active:scale-95 transition-all duration-300 delay-300
                  ${menuOpen ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}
                `}>
                  <div className="p-2 bg-amber-100 dark:bg-amber-800/50 rounded-lg text-amber-600 dark:text-amber-400"><Settings className="w-5 h-5"/></div>
                  <span className="text-[15px]">จัดการระบบ (Admin)</span>
                </Link>
              )}
            </div>

            {/* Bottom Actions */}
            <div className={`
              mt-auto pt-6 flex flex-col gap-3
              transform transition-all duration-500 delay-300
              ${menuOpen ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}
            `}>
              <button onClick={() => { setMenuOpen(false); setShowChangePassword(true); }} className="flex items-center justify-center gap-2 w-full py-4 text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-2xl font-medium active:scale-95 transition-transform">
                <KeyRound className="w-5 h-5 text-slate-400 dark:text-slate-500"/> เปลี่ยนรหัสผ่าน
              </button>

              <button onClick={() => { setMenuOpen(false); handleLogout(); }} className="flex items-center justify-center gap-2 w-full py-4 text-white bg-slate-900 dark:bg-red-900/80 rounded-2xl font-bold shadow-lg shadow-slate-200 dark:shadow-none active:scale-95 transition-transform">
                <LogOut className="w-5 h-5"/> ออกจากระบบ
              </button>
            </div>

          </div>
        </div>
      </nav>

      {/* ดันเนื้อหาลงมาไม่ให้ถูก Navbar บัง (เพราะตั้งเป็น fixed) */}
      <div className="h-[72px]"></div>

      {/* ✅ Dialog เปลี่ยนรหัสผ่าน */}
      <Dialog open={showChangePassword} onOpenChange={setShowChangePassword}>
        <DialogContent className="w-[95vw] sm:max-w-md rounded-3xl p-0 overflow-hidden dark:bg-slate-800 dark:border-slate-700">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-700 dark:to-indigo-800 p-6 text-white transition-colors">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold flex items-center gap-2 text-white">
                <KeyRound className="w-6 h-6"/> เปลี่ยนรหัสผ่านใหม่
              </DialogTitle>
              <DialogDescription className="text-blue-100 mt-2 text-sm">
                เพื่อความปลอดภัยของบัญชี กรุณายืนยันรหัสผ่านปัจจุบันก่อนทำการตั้งรหัสผ่านใหม่
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="p-6 space-y-5 bg-white dark:bg-slate-800 transition-colors">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">รหัสผ่านปัจจุบัน</label>
              <Input
                type="password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                placeholder="กรอกรหัสผ่านเดิมของคุณ"
                className="bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-600 focus:bg-white dark:focus:bg-slate-700 dark:text-white rounded-xl h-12"
              />
            </div>

            <div className="h-px bg-slate-100 dark:bg-slate-700 my-2 transition-colors"></div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">รหัสผ่านใหม่</label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="ความยาว 8 ตัวอักษรขึ้นไป"
                className="bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-600 focus:bg-white dark:focus:bg-slate-700 dark:text-white rounded-xl h-12"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">ยืนยันรหัสผ่านใหม่</label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="พิมพ์รหัสผ่านใหม่อีกครั้งให้ตรงกัน"
                className="bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-600 focus:bg-white dark:focus:bg-slate-700 dark:text-white rounded-xl h-12"
              />
            </div>

            {passwordError && (
              <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-100 dark:border-red-800/50 text-red-600 dark:text-red-400 text-sm font-medium rounded-xl flex items-start gap-2 animate-in fade-in transition-colors">
                <span>⚠️</span> {passwordError}
              </div>
            )}

            <div className="pt-4 flex flex-col-reverse sm:flex-row gap-3">
              <Button 
                variant="outline" 
                className="w-full sm:flex-1 text-slate-600 dark:text-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:hover:bg-slate-700 h-12 rounded-xl transition-colors font-medium" 
                onClick={() => setShowChangePassword(false)}
              >
                ยกเลิก
              </Button>
              <Button 
                className="w-full sm:flex-1 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white shadow-md shadow-blue-200 dark:shadow-none h-12 rounded-xl transition-colors font-bold" 
                onClick={handleChangePassword}
              >
                บันทึกการเปลี่ยนแปลง
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}