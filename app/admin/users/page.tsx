'use client'
import { useEffect, useState } from 'react'
import Navbar from '@/components/Navbar'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Trash2, Pencil } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'

export default function AdminUsers() {
    const [users, setUsers] = useState<any[]>([])
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [role, setRole] = useState('user')
    const [selectedUser, setSelectedUser] = useState<any | null>(null)
    const [editEmail, setEditEmail] = useState('')
    const [editRole, setEditRole] = useState('user')
    const [loading, setLoading] = useState(false)
    const [editPassword, setEditPassword] = useState('')
    const [department, setDepartment] = useState('')
    const [editDepartment, setEditDepartment] = useState('')


    // ✅ โหลดผู้ใช้ทั้งหมด
    const loadUsers = async () => {
        // ใช้ API ฝั่ง server ที่เรียกผ่าน service_role จะดึง auth.users ได้
        const res = await fetch('/api/admin/list-users')
        const data = await res.json()
        if (res.ok) setUsers(data)
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
            alert('✅ สร้างผู้ใช้สำเร็จ')
            setEmail(''); setPassword(''); setRole('user')
            loadUsers()
        }
    }

    // ✅ ลบผู้ใช้
    const deleteUser = async (id: string, email: string) => {
        if (!confirm(`ต้องการลบผู้ใช้ ${email} ใช่หรือไม่?`)) return
        const { error } = await supabase.from('profiles').delete().eq('id', id)
        if (error) alert(error.message)
        else {
            alert('ลบผู้ใช้เรียบร้อย')
            loadUsers()
        }
    }

    // ✅ เปิด dialog แก้ไข
    const openEditDialog = (user: any) => {
        setSelectedUser(user)
        setEditEmail(user.email)
        setEditRole(user.role)
        setEditDepartment(user.department || '')
    }

    // ✅ บันทึกการแก้ไข (รวมเปลี่ยนรหัสผ่าน)
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
            alert('อัปเดตข้อมูลผู้ใช้สำเร็จ')
            setSelectedUser(null)
            loadUsers()
        }
    }


    return (
        <>
            <Navbar />
            <main className="p-6 max-w-4xl mx-auto space-y-4">
                <h1 className="text-2xl font-bold text-blue-700 mb-4">จัดการผู้ใช้</h1>

                {/* ฟอร์มเพิ่มผู้ใช้ */}
                <Card>
                    <CardHeader><CardTitle>เพิ่มผู้ใช้ใหม่</CardTitle></CardHeader>
                    <CardContent>
                        <form onSubmit={addUser} className="space-y-3">
                            <Input placeholder="อีเมล" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                            <Input placeholder="รหัสผ่าน" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
                            <Input placeholder="แผนก" value={department} onChange={(e) => setDepartment(e.target.value)} />
                            <select
                                className="border p-2 w-full rounded-md"
                                value={role}
                                onChange={(e) => setRole(e.target.value)}
                            >
                                <option value="user">ผู้ใช้ทั่วไป</option>
                                <option value="admin">ผู้ดูแลระบบ</option>
                            </select>
                            <Button type="submit" disabled={loading} className="w-full">
                                {loading ? 'กำลังเพิ่ม...' : 'เพิ่มผู้ใช้'}
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                {/* ตารางรายชื่อผู้ใช้ */}
                <Card>
                    <CardHeader><CardTitle>รายชื่อผู้ใช้ทั้งหมด</CardTitle></CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto rounded-lg shadow-sm">
                            <table className="w-full text-sm">
                                <thead className="bg-blue-100 text-blue-800">
                                    <tr>
                                        <th className="p-3 text-left">อีเมล</th>
                                        <th className="p-3 text-left">แผนก</th>
                                        <th className="p-3 text-center">สิทธิ์</th>
                                        <th className="p-3 text-center">จัดการ</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.map((u) => (
                                        <tr key={u.id} className="border-b hover:bg-blue-50">
                                            <td className="p-3">{u.email}</td>
                                            <td className="p-3">{u.department || '-'}</td>
                                            <td className="p-3 text-center">
                                                {u.role === 'admin'
                                                    ? <span className="text-red-600 font-medium">ผู้ดูแลระบบ</span>
                                                    : <span className="text-gray-600">ผู้ใช้ทั่วไป</span>}
                                            </td>
                                            <td className="p-3 text-center space-x-2">
                                                <Button size="sm" variant="outline" onClick={() => openEditDialog(u)}>
                                                    <Pencil className="w-4 h-4 mr-1" /> แก้ไข
                                                </Button>
                                                <Button size="sm" variant="destructive" onClick={() => deleteUser(u.id, u.email)}>
                                                    <Trash2 className="w-4 h-4 mr-1" /> ลบ
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>

                            </table>
                        </div>
                    </CardContent>
                </Card>

                {/* Dialog แก้ไข */}
                <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle>แก้ไขผู้ใช้</DialogTitle>
                        </DialogHeader>
                        {selectedUser && (
                            <div className="space-y-3">
                                <Input
                                    placeholder="อีเมล"
                                    value={editEmail}
                                    onChange={(e) => setEditEmail(e.target.value)}
                                />
                                <Input
                                    placeholder="แผนก"
                                    value={editDepartment}
                                    onChange={(e) => setEditDepartment(e.target.value)}
                                />
                                <select
                                    className="border p-2 w-full rounded-md"
                                    value={editRole}
                                    onChange={(e) => setEditRole(e.target.value)}
                                >
                                    <option value="user">ผู้ใช้ทั่วไป</option>
                                    <option value="admin">ผู้ดูแลระบบ</option>
                                </select>

                                {/* ✅ ช่องแก้ไขรหัสผ่าน */}
                                <Input
                                    type="password"
                                    placeholder="รหัสผ่านใหม่ (เว้นว่างหากไม่เปลี่ยน)"
                                    value={editPassword}
                                    onChange={(e) => setEditPassword(e.target.value)}
                                />

                                <Button className="w-full" onClick={handleEditSave}>
                                    💾 บันทึกการแก้ไข
                                </Button>
                            </div>
                        )}
                    </DialogContent>
                </Dialog>
            </main>
        </>
    )
}
