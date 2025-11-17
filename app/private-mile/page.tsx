'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import Navbar from '@/components/Navbar'
import { useRouter } from 'next/navigation'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { th } from 'date-fns/locale'
import { Pencil, Trash2, FileText, ArrowLeft } from 'lucide-react'

const RATE_PER_KM = 3.5

// ✅ แก้ให้เป็น email admin จริงของคุณ
const ADMIN_EMAILS = ['theeraphat@nawamit.com']

type MileageRow = {
    id: string
    user_id: string
    date: string // ISO date string
    location: string
    start_mile: number
    end_mile: number
    remark: string | null
    distance?: number | null
    amount?: number | null
    employee_name?: string | null
}

type User = {
    id: string
    email?: string
}

export default function PrivateMileagePage() {
    const [user, setUser] = useState<User | null>(null)
    const [loadingUser, setLoadingUser] = useState(true)

    const [rows, setRows] = useState<MileageRow[]>([])
    const [loadingRows, setLoadingRows] = useState(true)

    const [date, setDate] = useState<Date | null>(new Date())
    const [location, setLocation] = useState('')
    const [startMile, setStartMile] = useState('')
    const [endMile, setEndMile] = useState('')
    const [remark, setRemark] = useState('')
    const [saving, setSaving] = useState(false)
    const [employeeName, setEmployeeName] = useState('')


    const [editingId, setEditingId] = useState<string | null>(null)

    const router = useRouter()

    const isAdmin = useMemo(
        () => !!user?.email && ADMIN_EMAILS.includes(user.email),
        [user]
    )

    // ✅ โหลด user
    useEffect(() => {
        const loadUser = async () => {
            const { data, error } = await supabase.auth.getUser()
            if (error || !data.user) {
                router.push('/login')
                return
            }
            setUser({ id: data.user.id, email: data.user.email ?? undefined })
            setLoadingUser(false)
        }
        loadUser()
    }, [router])

    // ✅ โหลดข้อมูล mileage
    useEffect(() => {
        if (!user) return

        const loadRows = async () => {
            setLoadingRows(true)
            let query = supabase
                .from('mileages')
                .select('*')
                .order('date', { ascending: true })
                .order('created_at', { ascending: true })

            if (!isAdmin) {
                query = query.eq('user_id', user.id)
            }

            const { data, error } = await query
            if (error) {
                console.error('Error loading mileages:', error)
            } else {
                setRows(data || [])
            }
            setLoadingRows(false)
        }

        loadRows()
    }, [user, isAdmin])

    const resetForm = () => {
        setDate(new Date())
        setLocation('')
        setStartMile('')
        setEndMile('')
        setRemark('')
        setEmployeeName('')
        setEditingId(null)
    }

    const handleEdit = (row: MileageRow) => {
        setEditingId(row.id)
        setDate(new Date(row.date))
        setLocation(row.location)
        setStartMile(row.start_mile.toString())
        setEndMile(row.end_mile.toString())
        setRemark(row.remark || '')
        setEmployeeName(row.employee_name || '')
    }


    const handleDelete = async (row: MileageRow) => {
        if (!confirm(`คุณต้องการลบรายการวันที่ ${format(new Date(row.date), 'dd/MM/yyyy')} ใช่ไหม?`)) {
            return
        }

        const { error } = await supabase.from('mileages').delete().eq('id', row.id)
        if (error) {
            console.error('Error delete mileage:', error)
            alert('ลบรายการไม่สำเร็จ')
            return
        }

        setRows(prev => prev.filter(r => r.id !== row.id))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!user) return
        if (!date) return alert('กรุณาเลือกวันที่')
        if (!location.trim()) return alert('กรุณากรอกสถานที่')
        if (!startMile || !endMile) return alert('กรุณากรอกเลขไมล์ให้ครบ')

        const start = Number(startMile)
        const end = Number(endMile)
        if (Number.isNaN(start) || Number.isNaN(end)) {
            return alert('เลขไมล์ต้องเป็นตัวเลข')
        }
        if (end < start) {
            return alert('เลขไมล์สิ้นสุดต้องมากกว่าหรือเท่ากับเลขไมล์เริ่มต้น')
        }

        const distance = end - start
        const amount = distance * RATE_PER_KM

        setSaving(true)

        const payload = {
            user_id: user.id,
            date: date.toISOString().slice(0, 10),
            location,
            start_mile: start,
            end_mile: end,
            remark: remark.trim() || null,
            employee_name: employeeName.trim(),
        }



        if (!editingId) {
            // ➕ insert
            const { data, error } = await supabase
                .from('mileages')
                .insert(payload)
                .select()
                .single()
            console.log("PAYLOAD:", payload)


            if (error) {
                console.error("Supabase INSERT ERROR:", JSON.stringify(error, null, 2))

                alert('บันทึกไม่สำเร็จ')
            } else {
                setRows(prev => [...prev, data as MileageRow])
                resetForm()
            }
        } else {
            // ✏ update
            const { data, error } = await supabase
                .from('mileages')
                .update(payload)
                .eq('id', editingId)
                .select()
                .single()

            if (error) {
                console.error('Error update mileage:', error)
                alert('แก้ไขไม่สำเร็จ')
            } else {
                setRows(prev =>
                    prev.map(r => (r.id === editingId ? (data as MileageRow) : r))
                )
                resetForm()
            }
        }

        setSaving(false)
    }

    const totalAmount = useMemo(
        () =>
            rows.reduce((sum, r) => {
                const amt =
                    typeof r.amount === 'number'
                        ? r.amount
                        : (r.end_mile - r.start_mile) * RATE_PER_KM
                return sum + (Number.isFinite(amt) ? amt : 0)
            }, 0),
        [rows]
    )

    if (loadingUser) {
        return (
            <main className="flex flex-col items-center justify-center h-screen text-blue-600">
                <div className="animate-spin h-8 w-8 mb-3 border-4 border-blue-500 border-t-transparent rounded-full" />
                <p className="text-gray-500 animate-pulse">กำลังตรวจสอบสิทธิ์ผู้ใช้...</p>
            </main>
        )
    }

    return (
        <>
            <Navbar />
            <main className="p-6 max-w-5xl mx-auto space-y-6">
                {/* หัวข้อ + ปุ่มไปหน้ารายงาน */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-semibold text-slate-800">
                            บันทึกเลขไมล์รถยนต์ส่วนตัว
                        </h1>
                        <p className="text-sm text-slate-500">
                            ระบบคำนวณค่า Mileage อัตรา {RATE_PER_KM.toLocaleString()} บาท / 1 กม.
                        </p>
                        {isAdmin && (
                            <p className="text-xs mt-1 text-amber-600">
                                คุณเป็นผู้ดูแลระบบ (admin) – เห็นข้อมูลของทุกคน
                            </p>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            onClick={() => router.push('/')}
                            className="flex items-center gap-2"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            กลับหน้าหลัก
                        </Button>
                        <Button
                            onClick={() => router.push('/private-mile/report')}
                            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700"
                        >
                            <FileText className="w-4 h-4" />
                            ออกรายงาน
                        </Button>
                    </div>
                </div>

                {/* ฟอร์มบันทึกเลขไมล์ */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">ฟอร์มบันทึกเลขไมล์</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="block text-sm font-medium text-slate-700">
                                        ชื่อพนักงาน
                                    </label>
                                    <Input
                                        value={employeeName}
                                        onChange={e => setEmployeeName(e.target.value)}
                                        placeholder="เช่น นายธีรภัทร ทัศนาราม"
                                        required
                                    />
                                    <label className="block text-sm font-medium text-slate-700">
                                        วันที่
                                    </label>
                                    <DatePicker
                                        selected={date}
                                        onChange={(date: Date | null) => setDate(date)}
                                        dateFormat="dd/MM/yyyy"
                                        className="border rounded-md p-2 w-full text-sm"
                                        locale={th}
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="block text-sm font-medium text-slate-700">
                                        สถานที่
                                    </label>
                                    <Input
                                        value={location}
                                        onChange={e => setLocation(e.target.value)}
                                        placeholder="เช่น เยี่ยมลูกค้า – ปราจีนบุรี"
                                    />
                                </div>
                            </div>

                            <div className="grid md:grid-cols-3 gap-4">
                                <div className="space-y-1">
                                    <label className="block text-sm font-medium text-slate-700">
                                        เลขไมล์เริ่มต้น
                                    </label>
                                    <Input
                                        type="number"
                                        value={startMile}
                                        onChange={e => setStartMile(e.target.value)}
                                        min={0}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="block text-sm font-medium text-slate-700">
                                        เลขไมล์สิ้นสุด
                                    </label>
                                    <Input
                                        type="number"
                                        value={endMile}
                                        onChange={e => setEndMile(e.target.value)}
                                        min={0}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="block text-sm font-medium text-slate-700">
                                        ระยะทาง (กม.) โดยประมาณ
                                    </label>
                                    <div className="h-10 flex items-center px-3 rounded-md border bg-slate-50 text-sm">
                                        {startMile && endMile && !Number.isNaN(Number(endMile) - Number(startMile))
                                            ? `${Number(endMile) - Number(startMile)} กม.`
                                            : '-'}
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="block text-sm font-medium text-slate-700">
                                    หมายเหตุ / เหตุผลการเดินทาง
                                </label>
                                <Textarea
                                    value={remark}
                                    onChange={e => setRemark(e.target.value)}
                                    rows={3}
                                    placeholder="เช่น ไปติดตั้งเครื่องจักรที่บริษัทลูกค้า ..."
                                />
                            </div>

                            <div className="flex justify-end gap-2 pt-2">
                                {editingId && (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={resetForm}
                                        className="border-amber-300 text-amber-700 hover:bg-amber-50"
                                    >
                                        ยกเลิกการแก้ไข
                                    </Button>
                                )}
                                <Button
                                    type="submit"
                                    disabled={saving}
                                    className="bg-blue-600 hover:bg-blue-700"
                                >
                                    {saving
                                        ? 'กำลังบันทึก...'
                                        : editingId
                                            ? 'บันทึกการแก้ไข'
                                            : 'บันทึกข้อมูล'}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>

                {/* ตารางรายการ */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="text-lg">รายการเลขไมล์</CardTitle>
                        <div className="flex items-center gap-2 text-sm">
                            <Badge variant="secondary" className="bg-emerald-50 text-emerald-700">
                                ยอดรวม: {totalAmount.toLocaleString()} บาท
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {loadingRows ? (
                            <p className="text-sm text-slate-500">กำลังโหลดข้อมูล...</p>
                        ) : rows.length === 0 ? (
                            <p className="text-sm text-slate-500">
                                ยังไม่มีการบันทึกเลขไมล์
                            </p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full text-sm border border-slate-200 rounded-lg overflow-hidden">
                                    <thead className="bg-slate-50">
                                        <tr className="text-slate-600">
                                            <th className="px-2 py-2 text-center w-10">#</th>
                                            <th className="px-2 py-2 text-left">วันที่</th>
                                            <th className="px-2 py-2 text-left">สถานที่</th>
                                            <th className="px-2 py-2 text-right">เริ่มต้น</th>
                                            <th className="px-2 py-2 text-right">สิ้นสุด</th>
                                            <th className="px-2 py-2 text-right">จำนวน (กม.)</th>
                                            <th className="px-2 py-2 text-left">เหตุผล</th>
                                            <th className="px-2 py-2 text-right">ยอด (บาท)</th>
                                            <th className="px-2 py-2 text-center w-24">จัดการ</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {rows.map((r, idx) => {
                                            const d = new Date(r.date)
                                            const distance =
                                                typeof r.distance === 'number'
                                                    ? r.distance
                                                    : r.end_mile - r.start_mile
                                            const amount =
                                                typeof r.amount === 'number'
                                                    ? r.amount
                                                    : distance * RATE_PER_KM

                                            return (
                                                <tr
                                                    key={r.id}
                                                    className="border-t border-slate-100 hover:bg-slate-50/60"
                                                >
                                                    <td className="px-2 py-2 text-center text-slate-500">
                                                        {idx + 1}
                                                    </td>
                                                    <td className="px-2 py-2">
                                                        {format(d, 'dd/MM/yyyy', { locale: th })}
                                                    </td>
                                                    <td className="px-2 py-2">{r.location}</td>
                                                    <td className="px-2 py-2 text-right tabular-nums">
                                                        {r.start_mile.toLocaleString()}
                                                    </td>
                                                    <td className="px-2 py-2 text-right tabular-nums">
                                                        {r.end_mile.toLocaleString()}
                                                    </td>
                                                    <td className="px-2 py-2 text-right tabular-nums">
                                                        {distance} กม.
                                                    </td>
                                                    <td className="px-2 py-2">
                                                        {r.remark || <span className="text-slate-400">-</span>}
                                                    </td>
                                                    <td className="px-2 py-2 text-right font-medium tabular-nums">
                                                        {amount.toLocaleString()}
                                                    </td>
                                                    <td className="px-2 py-2 text-center">
                                                        <div className="inline-flex items-center gap-1">
                                                            <Button
                                                                size="icon"
                                                                variant="ghost"
                                                                className="h-7 w-7 text-blue-600 hover:bg-blue-50"
                                                                onClick={() => handleEdit(r)}
                                                            >
                                                                <Pencil className="w-4 h-4" />
                                                            </Button>
                                                            <Button
                                                                size="icon"
                                                                variant="ghost"
                                                                className="h-7 w-7 text-red-600 hover:bg-red-50"
                                                                onClick={() => handleDelete(r)}
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </Button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )
                                        })}

                                        {/* แถวยอดรวม */}
                                        <tr className="border-t border-slate-200 bg-slate-50/60">
                                            <td className="px-2 py-2" />
                                            <td className="px-2 py-2 text-right font-medium" colSpan={6}>
                                                ยอดรวมทั้งหมด
                                            </td>
                                            <td className="px-2 py-2 text-right font-semibold tabular-nums">
                                                {totalAmount.toLocaleString()} บาท
                                            </td>
                                            <td className="px-2 py-2" />
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </main>
        </>
    )
}

