'use client'
import { useEffect, useState } from 'react'
import Navbar from '@/components/Navbar'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Trash2, Pencil, Users, UserPlus, Mail, Lock, Briefcase, Shield, Activity, ShieldCheck, User, Sun, Moon } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'

export default function AdminUsers() {
    const [users, setUsers] = useState<any[]>([])
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [role, setRole] = useState('user')
    const [department, setDepartment] = useState('')
    
    const [selectedUser, setSelectedUser] = useState<any | null>(null)
    const [editEmail, setEditEmail] = useState('')
    const [editRole, setEditRole] = useState('user')
    const [editPassword, setEditPassword] = useState('')
    const [editDepartment, setEditDepartment] = useState('')
    
    const [loading, setLoading] = useState(false)
    const [isLoadingData, setIsLoadingData] = useState(true)

    // 🌙 State สำหรับ Dark Mode
    const [isDarkMode, setIsDarkMode] = useState(false)

    // 🚀 โหลดสถานะ Dark Mode ตอนเข้าเว็บ
    useEffect(() => {
      const savedTheme = localStorage.getItem("dashboardTheme")
      if (savedTheme === "dark") {
        setIsDarkMode(true)
        document.documentElement.classList.add("dark")
      } else {
        document.documentElement.classList.remove("dark")
      }
    }, [])

    const toggleTheme = () => {
      if (isDarkMode) {
        setIsDarkMode(false)
        document.documentElement.classList.remove("dark")
        localStorage.setItem("dashboardTheme", "light")
      } else {
        setIsDarkMode(true)
        document.documentElement.classList.add("dark")
        localStorage.setItem("dashboardTheme", "dark")
      }
    }

    // ✅ โหลดผู้ใช้ทั้งหมด
    const loadUsers = async () => {
        setIsLoadingData(true)
        const res = await fetch('/api/admin/list-users')
        const data = await res.json()
        if (res.ok) setUsers(data)
        setIsLoadingData(false)
    }

    useEffect(() => { loadUsers() }, [])

    // ✅ เพิ่มผู้ใช้ใหม่
    const addUser = async (e: any) => {
        e.preventDefault()
        setLoading(true)
        const res = await fetch('/api/admin/create-user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, role, department }),
        })
        const data = await res.json()
        setLoading(false)
        if (!res.ok) alert(data.error)
        else {
            setEmail(''); setPassword(''); setRole('user'); setDepartment('');
            loadUsers()
        }
    }

    // ✅ ลบผู้ใช้
    const deleteUser = async (id: string, userEmail: string) => {
        if (!confirm(`ต้องการลบผู้ใช้ ${userEmail} ใช่หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้`)) return
        const { error } = await supabase.from('profiles').delete().eq('id', id)
        if (error) alert(error.message)
        else loadUsers()
    }

    // ✅ เปิด dialog แก้ไข
    const openEditDialog = (user: any) => {
        setSelectedUser(user)
        setEditEmail(user.email)
        setEditRole(user.role)
        setEditDepartment(user.department || '')
        setEditPassword('') // รีเซ็ตช่องรหัสผ่านทุกครั้งที่เปิด
    }

    // ✅ บันทึกการแก้ไข
    const handleEditSave = async () => {
        if (!selectedUser) return
        const res = await fetch('/api/admin/update-user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id: selectedUser.id,
                email: editEmail,
                role: editRole,
                department: editDepartment,
                password: editPassword || undefined,
            }),
        })

        const data = await res.json()
        if (!res.ok) alert(data.error)
        else {
            alert('อัปเดตข้อมูลผู้ใช้สำเร็จ ✅')
            setSelectedUser(null)
            loadUsers()
        }
    }

    // ฟังก์ชันช่วยสร้างสี Avatar สุ่มจากตัวอักษร (ปรับสีเผื่อโหมดมืดด้วย)
    const getAvatarColor = (char: string) => {
        const colors = [
          'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300', 
          'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300', 
          'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300', 
          'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300', 
          'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300'
        ];
        const charCode = char.charCodeAt(0) || 0;
        return colors[charCode % colors.length];
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-12 transition-colors duration-300">
            <Navbar />
            <main className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6 mt-4">
                
                {/* ✅ Header Section */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-700 pb-4 transition-colors">
                    <div className="flex items-center gap-3">
                        <div className="bg-blue-600 dark:bg-blue-500 p-3 rounded-xl shadow-sm">
                            <Users className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-white">จัดการข้อมูลผู้ใช้งาน</h1>
                            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">เพิ่ม แก้ไข ลบ และกำหนดสิทธิ์การเข้าถึงระบบ</p>
                        </div>
                    </div>
                    {/* 🌙 ปุ่ม Toggle Dark Mode */}
                    <Button
                        onClick={toggleTheme}
                        variant="outline"
                        className="w-full sm:w-auto bg-white dark:bg-slate-800 dark:text-white dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                    >
                        {isDarkMode ? (
                        <Sun className="w-4 h-4 mr-2 text-amber-400" />
                        ) : (
                        <Moon className="w-4 h-4 mr-2 text-indigo-500" />
                        )}
                        {isDarkMode ? "Light Mode" : "Dark Mode"}
                    </Button>
                </div>

                {/* ✅ ฟอร์มเพิ่มผู้ใช้ใหม่ */}
                <Card className="border-none shadow-md bg-white dark:bg-slate-800 dark:border dark:border-slate-700 rounded-2xl overflow-hidden transition-colors">
                    <div className="bg-blue-50/50 dark:bg-slate-800/80 border-b border-blue-100 dark:border-slate-700 px-6 py-4 flex items-center gap-2">
                        <UserPlus className="w-5 h-5 text-blue-700 dark:text-blue-400" />
                        <CardTitle className="text-blue-800 dark:text-blue-400 text-lg">เพิ่มบัญชีผู้ใช้งานใหม่</CardTitle>
                    </div>
                    <CardContent className="p-6">
                        <form onSubmit={addUser} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
                            <div className="space-y-2 lg:col-span-1">
                                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                                    <Mail className="w-4 h-4 text-slate-400 dark:text-slate-500" /> อีเมล
                                </label>
                                <Input required placeholder="name@company.com" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-11 focus-visible:ring-blue-600 dark:focus-visible:ring-blue-500 bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 dark:text-white dark:placeholder-slate-400" />
                            </div>
                            <div className="space-y-2 lg:col-span-1">
                                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                                    <Lock className="w-4 h-4 text-slate-400 dark:text-slate-500" /> รหัสผ่าน
                                </label>
                                <Input required placeholder="ตั้งรหัสผ่าน" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="h-11 focus-visible:ring-blue-600 dark:focus-visible:ring-blue-500 bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 dark:text-white dark:placeholder-slate-400" />
                            </div>
                            <div className="space-y-2 lg:col-span-1">
                                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                                    <Briefcase className="w-4 h-4 text-slate-400 dark:text-slate-500" /> แผนก (ถ้ามี)
                                </label>
                                <Input placeholder="เช่น IT, HR, Sales" value={department} onChange={(e) => setDepartment(e.target.value)} className="h-11 focus-visible:ring-blue-600 dark:focus-visible:ring-blue-500 bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 dark:text-white dark:placeholder-slate-400" />
                            </div>
                            <div className="space-y-2 lg:col-span-1">
                                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                                    <Shield className="w-4 h-4 text-slate-400 dark:text-slate-500" /> สิทธิ์การใช้งาน
                                </label>
                                <div className="relative">
                                    <select
                                        className="h-11 w-full rounded-md border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-700 dark:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 dark:focus-visible:ring-blue-500 appearance-none"
                                        value={role}
                                        onChange={(e) => setRole(e.target.value)}
                                    >
                                        <option value="user">ผู้ใช้ทั่วไป (User)</option>
                                        <option value="admin">ผู้ดูแลระบบ (Admin)</option>
                                    </select>
                                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 dark:text-slate-500">
                                        ▼
                                    </div>
                                </div>
                            </div>
                            <div className="lg:col-span-1">
                                <Button type="submit" disabled={loading || !email || !password} className="h-11 w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white shadow-sm transition-all active:scale-95">
                                    {loading ? <Activity className="w-4 h-4 animate-spin" /> : <><UserPlus className="w-4 h-4 mr-2" /> เพิ่มผู้ใช้</>}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>

                {/* ✅ ตารางรายชื่อผู้ใช้ */}
                <div>
                    <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2 mt-8">
                        <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" /> รายชื่อผู้ใช้งานทั้งหมด ({users.length} บัญชี)
                    </h2>

                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden transition-colors">
                        {isLoadingData ? (
                            <div className="p-12 text-center text-slate-500 dark:text-slate-400 flex flex-col items-center justify-center">
                                <Activity className="h-8 w-8 animate-spin text-blue-600 dark:text-blue-400 mb-3" />
                                <p className="font-medium">กำลังโหลดข้อมูลผู้ใช้งาน...</p>
                            </div>
                        ) : users.length === 0 ? (
                            <div className="p-12 text-center flex flex-col items-center justify-center border-dashed border-2 border-slate-100 dark:border-slate-700 m-4 rounded-xl">
                                <User className="h-12 w-12 text-slate-300 dark:text-slate-600 mb-3" />
                                <p className="text-slate-500 dark:text-slate-400 font-medium">ยังไม่มีข้อมูลผู้ใช้งานในระบบ</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400">
                                        <tr>
                                            <th className="p-4 text-left font-semibold w-[40%]">ข้อมูลผู้ใช้งาน (Email)</th>
                                            <th className="p-4 text-left font-semibold w-[20%]">แผนก</th>
                                            <th className="p-4 text-center font-semibold w-[20%]">สิทธิ์การเข้าถึง</th>
                                            <th className="p-4 text-right font-semibold w-[20%]">จัดการ</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                                        {users.map((u) => {
                                            const firstLetter = u.email ? u.email.charAt(0).toUpperCase() : '?';
                                            return (
                                                <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors group">
                                                    <td className="p-4">
                                                        <div className="flex items-center gap-3">
                                                            {/* Avatar จำลอง */}
                                                            <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${getAvatarColor(firstLetter)}`}>
                                                                {firstLetter}
                                                            </div>
                                                            <div className="font-medium text-slate-800 dark:text-slate-200 truncate">
                                                                {u.email}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="p-4">
                                                        {u.department ? (
                                                            <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                                                                <Briefcase className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                                                                {u.department}
                                                            </div>
                                                        ) : (
                                                            <span className="text-slate-400 dark:text-slate-500 italic text-xs">ไม่ได้ระบุ</span>
                                                        )}
                                                    </td>
                                                    <td className="p-4 text-center">
                                                        {u.role === 'admin' ? (
                                                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-100 dark:border-red-800/50 text-xs font-semibold">
                                                                <ShieldCheck className="w-3.5 h-3.5" /> Admin
                                                            </div>
                                                        ) : (
                                                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border border-blue-100 dark:border-blue-800/50 text-xs font-medium">
                                                                <User className="w-3.5 h-3.5" /> User
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="p-4 text-right">
                                                        <div className="flex items-center justify-end gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                                            <Button size="sm" variant="outline" className="h-8 px-2.5 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-700" onClick={() => openEditDialog(u)}>
                                                                <Pencil className="w-3.5 h-3.5 sm:mr-1" /> <span className="hidden sm:inline">แก้ไข</span>
                                                            </Button>
                                                            <Button size="sm" variant="ghost" className="h-8 px-2.5 text-slate-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30" onClick={() => deleteUser(u.id, u.email)}>
                                                                <Trash2 className="w-4 h-4" />
                                                            </Button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>

                {/* ✅ Dialog แก้ไขผู้ใช้ */}
                <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
                    <DialogContent className="max-w-md rounded-2xl dark:bg-slate-800 dark:border-slate-700">
                        <DialogHeader className="border-b dark:border-slate-700 pb-4 mb-4">
                            <DialogTitle className="flex items-center gap-2 text-xl text-slate-800 dark:text-white">
                                <Pencil className="w-5 h-5 text-blue-600 dark:text-blue-400" /> แก้ไขข้อมูลผู้ใช้
                            </DialogTitle>
                        </DialogHeader>
                        {selectedUser && (
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">อีเมล</label>
                                    <Input placeholder="อีเมล" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} className="h-11 bg-slate-50 dark:bg-slate-900/50 dark:border-slate-700 dark:text-slate-400" disabled />
                                    <p className="text-xs text-slate-500 dark:text-slate-400">* ไม่สามารถเปลี่ยนอีเมลได้ หากต้องการเปลี่ยนกรุณาลบและสร้างใหม่</p>
                                </div>
                                
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">แผนก</label>
                                    <Input placeholder="ระบุแผนก" value={editDepartment} onChange={(e) => setEditDepartment(e.target.value)} className="h-11 focus-visible:ring-blue-600 dark:focus-visible:ring-blue-500 bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 dark:text-white dark:placeholder-slate-400" />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">สิทธิ์การใช้งาน</label>
                                    <div className="relative">
                                        <select
                                            className="h-11 w-full rounded-md border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-700 dark:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 dark:focus-visible:ring-blue-500 appearance-none"
                                            value={editRole}
                                            onChange={(e) => setEditRole(e.target.value)}
                                        >
                                            <option value="user">ผู้ใช้ทั่วไป (User)</option>
                                            <option value="admin">ผู้ดูแลระบบ (Admin)</option>
                                        </select>
                                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 dark:text-slate-500">▼</div>
                                    </div>
                                </div>

                                <div className="pt-2 border-t dark:border-slate-700 mt-4">
                                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2 mb-2">
                                        <Lock className="w-4 h-4 text-orange-500 dark:text-orange-400" /> รีเซ็ตรหัสผ่าน (ตัวเลือก)
                                    </label>
                                    <Input
                                        type="password"
                                        placeholder="รหัสผ่านใหม่ (เว้นว่างไว้หากไม่ต้องการเปลี่ยน)"
                                        value={editPassword}
                                        onChange={(e) => setEditPassword(e.target.value)}
                                        className="h-11 focus-visible:ring-orange-500 dark:focus-visible:ring-orange-400 bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 dark:text-white dark:placeholder-slate-400"
                                    />
                                </div>

                                <div className="pt-4 flex gap-3">
                                    <Button variant="outline" className="w-1/2 h-11 bg-white dark:bg-slate-800 dark:text-white dark:border-slate-600 dark:hover:bg-slate-700" onClick={() => setSelectedUser(null)}>
                                        ยกเลิก
                                    </Button>
                                    <Button className="w-1/2 h-11 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white" onClick={handleEditSave}>
                                        💾 บันทึกข้อมูล
                                    </Button>
                                </div>
                            </div>
                        )}
                    </DialogContent>
                </Dialog>
            </main>
        </div>
    )
}