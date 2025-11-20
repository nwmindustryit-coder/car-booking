'use client'

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import Navbar from "@/components/Navbar"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { th } from "date-fns/locale"

export default function WorkOutPage() {

    const [user, setUser] = useState<any>(null)
    const [rows, setRows] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    // แบบฟอร์ม
    const [date, setDate] = useState('')
    const [place, setPlace] = useState('')   // <-- แทน location
    const [startTime, setStartTime] = useState('')
    const [endTime, setEndTime] = useState('')
    const [stayOver, setStayOver] = useState(false)
    const [employeeName, setEmployeeName] = useState('')
    const [department, setDepartment] = useState('')


    // สำหรับแก้ไข
    const [editId, setEditId] = useState<string | null>(null)

    const router = useRouter()

    useEffect(() => {
        const load = async () => {
            const { data: userData } = await supabase.auth.getUser()
            if (!userData.user) return router.push('/login')

            setUser(userData.user)

            // ✅ ดึง profile ของ user
            const { data: profile } = await supabase
                .from("profiles")
                .select("department")
                .eq("id", userData.user.id)
                .single()

            setDepartment(profile?.department ?? "")   // <-- state ใหม่ด้านล่าง

            const { data } = await supabase
                .from("workouts")
                .select('*')
                .eq("user_id", userData.user.id)
                .order("date", { ascending: false })

            setRows(data ?? [])
            setEmployeeName(userData.user.user_metadata.full_name ?? "")
            setLoading(false)
        }
        load()
    }, [])

    const calcHours = () => {
        if (!startTime || !endTime) return 0
        const s = new Date(`2000-01-01T${startTime}`)
        const e = new Date(`2000-01-01T${endTime}`)
        if (e < s) e.setDate(e.getDate() + 1)
        const diff = (e - s) / 1000 / 3600
        return Math.round(diff * 100) / 100
    }

    const calcAmount = () => {
        const h = calcHours()
        if (stayOver) return 200
        if (h > 8) return 100
        if (h > 0) return 60
        return 0
    }

    const resetForm = () => {
        setDate('')
        setPlace('')
        setStartTime('')
        setEndTime('')
        setStayOver(false)
        setEditId(null)
    }

    // บันทึก & อัพเดท
    const save = async () => {
        const hours = calcHours()
        const amount = calcAmount()

        const payload = {
            user_id: user.id,
            employee_name: employeeName,
            date,
            location: place,
            start_time: startTime,
            end_time: endTime,
            hours,
            stay_over: stayOver,
            amount
        }

        let error

        if (editId) {
            const res = await supabase
                .from("workouts")
                .update(payload)
                .eq("id", editId)
            error = res.error
        } else {
            const res = await supabase.from("workouts").insert(payload)
            error = res.error
        }

        if (!error) {
            alert(editId ? "อัปเดตข้อมูลสำเร็จ" : "บันทึกสำเร็จ")
            resetForm()

            // โหลดข้อมูลใหม่
            const { data } = await supabase
                .from("workouts")
                .select('*')
                .eq("user_id", user.id)
                .order("date", { ascending: false })

            setRows(data ?? [])
        }
    }

    // ลบข้อมูล
    const remove = async (id: string) => {
        if (!confirm("ต้องการลบข้อมูลนี้หรือไม่?")) return

        await supabase.from("workouts").delete().eq("id", id)

        setRows(rows.filter(r => r.id !== id))
    }

    // โหลดข้อมูลเดิมเข้า form
    const edit = (row: any) => {
        setEditId(row.id)
        setEmployeeName(row.employee_name)
        setDate(row.date)
        setPlace(row.location)
        setStartTime(row.start_time)
        setEndTime(row.end_time)
        setStayOver(row.stay_over)
    }

    if (loading) {
        return (
            <>
                <Navbar />
                <main className="flex flex-col items-center justify-center h-screen text-blue-600">
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
                    <p className="text-gray-500 animate-pulse">
                        กำลังโหลด...
                    </p>
                </main>
            </>
        )
    }

    return (
        <>
            <Navbar />

            <main className="max-w-xl mx-auto p-4 space-y-6">

                <h1 className="text-xl font-semibold">บันทึกเวลาทำงานนอกสถานที่</h1>

                {/* ฟอร์ม */}
                <div className="space-y-3 border p-4 rounded-lg">
                    <div>
                        <label className="font-medium">ชื่อพนักงาน</label>
                        <input
                            type="text"
                            value={employeeName}
                            onChange={(e) => setEmployeeName(e.target.value)}
                            className="border p-2 rounded w-full"
                        />
                    </div>
                    <div className="flex-1">
                        <label className="font-medium">แผนก</label>
                        <input
                            type="text"
                            value={department}
                            disabled
                            className="border p-2 rounded w-full bg-slate-100"
                        />
                    </div>
                    <div>
                        <label>วันที่</label>
                        <input type="date" className="border p-2 w-full"
                            value={date} onChange={e => setDate(e.target.value)} />
                    </div>

                    <div>
                        <label>สถานที่</label>
                        <input className="border p-2 w-full"
                            value={place} onChange={e => setPlace(e.target.value)} />
                    </div>

                    <div className="flex gap-3">
                        <div className="flex-1">
                            <label>เวลาเริ่ม</label>
                            <input type="time" className="border p-2 w-full"
                                value={startTime} onChange={e => setStartTime(e.target.value)} />
                        </div>

                        <div className="flex-1">
                            <label>เวลากลับ</label>
                            <input type="time" className="border p-2 w-full"
                                value={endTime} onChange={e => setEndTime(e.target.value)} />
                        </div>
                    </div>

                    <div>
                        <label className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                checked={stayOver}
                                onChange={() => setStayOver(!stayOver)}
                            />
                            ค้างคืน
                        </label>
                    </div>

                    <div className="text-sm text-slate-600">
                        ชั่วโมง: {calcHours()} ชม.
                        <br />
                        ยอด: {calcAmount()} บาท
                    </div>

                    <Button className="w-full" onClick={save}>
                        {editId ? "อัปเดตข้อมูล" : "บันทึกข้อมูล"}
                    </Button>
                </div>

                {/* ปุ่มไปหน้าออกรายงาน */}
                <Button
                    className="w-full bg-emerald-600"
                    onClick={() => router.push('/work-out/report')}
                >
                    ออกรายงาน
                </Button>

                {/* ตารางรายการ */}
                <div className="border rounded-lg p-3">
                    <h2 className="font-semibold mb-2">รายการที่บันทึก</h2>

                    {rows.length === 0 && <p className="text-slate-500 text-sm">ยังไม่มีข้อมูล</p>}

                    {rows.map((r, idx) => (
                        <div
                            key={r.id}
                            className="border p-3 rounded mb-2 bg-slate-50"
                        >
                            <p className="text-sm">
                                <strong>{idx + 1}.</strong> วันที่: {format(new Date(r.date), 'dd/MM/yyyy', { locale: th })}
                            </p>
                            <p className="text-sm">ชื่อพนักงาน: {r.employee_name}</p>
                            <p className="text-sm">สถานที่: {r.location}</p>
                            <p className="text-sm">เวลา: {r.start_time} - {r.end_time}</p>
                            <p className="text-sm">ชั่วโมง: {r.hours}</p>
                            <p className="text-sm">ค้างคืน: {r.stay_over ? "ใช่" : "ไม่ใช่"}</p>
                            <p className="text-sm">ยอด: {r.amount} บาท</p>

                            <div className="flex gap-2 mt-2">
                                <Button variant="outline" onClick={() => edit(r)}>แก้ไข</Button>
                                <Button variant="destructive" onClick={() => remove(r.id)}>ลบ</Button>
                            </div>
                        </div>
                    ))}

                </div>

            </main>
        </>
    )
}
