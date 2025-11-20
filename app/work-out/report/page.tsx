'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import Navbar from '@/components/Navbar'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Printer } from 'lucide-react'
import { format } from 'date-fns'
import { th } from 'date-fns/locale'

export default function WorkOutReportPage() {

    const [user, setUser] = useState<any>(null)
    const [rows, setRows] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    const [filterType, setFilterType] = useState<'range' | 'month' | 'year' | 'select'>('range')
    const [startDate, setStartDate] = useState('')
    const [endDate, setEndDate] = useState('')
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
    const [selectedIds, setSelectedIds] = useState<string[]>([])
    const [department, setDepartment] = useState('')


    const router = useRouter()

    useEffect(() => {
        const load = async () => {
            const { data: userData } = await supabase.auth.getUser()
            if (!userData.user) return router.push('/login')

            setUser(userData.user)

            const { data: profile } = await supabase
                .from("profiles")
                .select("department")
                .eq("id", userData.user.id)
                .single()

            setDepartment(profile?.department ?? "")


            const { data } = await supabase
                .from("workouts")
                .select('*')
                .eq("user_id", userData.user.id)
                .order("date", { ascending: true })

            setRows(data ?? [])
            setLoading(false)
        }
        load()
    }, [])

    // คำนวณฟิลเตอร์
    const filteredRows = useMemo(() => {
        if (filterType === 'range' && startDate && endDate) {
            return rows.filter(r => r.date >= startDate && r.date <= endDate)
        }
        if (filterType === 'month') {
            return rows.filter(r => {
                const d = new Date(r.date)
                return d.getMonth() + 1 === selectedMonth && d.getFullYear() === selectedYear
            })
        }
        if (filterType === 'year') {
            return rows.filter(r => {
                const d = new Date(r.date)
                return d.getFullYear() === selectedYear
            })
        }
        if (filterType === 'select') {
            return rows
        }
        return rows
    }, [rows, filterType, startDate, endDate, selectedMonth, selectedYear])

    const handlePrint = () => window.print()

    if (loading) {
        return (
            <>
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
                        กำลังโหลดรายงาน...
                    </p>
                </main>
            </>
        )
    }

    // แถวที่จะพิมพ์จริง
    const printRows = filterType === 'select'
        ? filteredRows.filter(r => selectedIds.includes(r.id))
        : filteredRows

    // คำนวณยอดรวม
    const totalAmount = printRows.reduce((sum, r) => sum + (r.amount ?? 0), 0)

    return (
        <>
            <main className="p-4 md:p-6 max-w-5xl mx-auto print:max-w-none print:p-0">

                {/* ปุ่มบนสุด */}
                <div className="flex justify-between items-center mb-4 print:hidden">

                    <Button
                        variant="outline"
                        className="flex items-center gap-2"
                        onClick={() => router.push('/work-out')}
                    >
                        <ArrowLeft className="w-4 h-4" />
                        กลับหน้าบันทึกเวลา
                    </Button>

                    <Button
                        onClick={handlePrint}
                        className="flex items-center gap-2 bg-emerald-600"
                    >
                        <Printer className="w-4 h-4" />
                        พิมพ์รายงาน
                    </Button>
                </div>

                {/* กล่องฟิลเตอร์ */}
                <div className="print:hidden border p-4 rounded-lg bg-white shadow-sm mb-4">
                    <p className="font-semibold mb-3">ตัวเลือกการออกรายงาน</p>

                    {/* เลือกช่วงวันที่ */}
                    <label className="flex items-center gap-2">
                        <input type="radio"
                            checked={filterType === 'range'}
                            onChange={() => setFilterType('range')}
                        />
                        ช่วงวันที่
                    </label>

                    {filterType === 'range' && (
                        <div className="flex gap-2 ml-6 mb-2">
                            <input type="date" className="border p-2 rounded"
                                value={startDate} onChange={e => setStartDate(e.target.value)} />
                            <span>ถึง</span>
                            <input type="date" className="border p-2 rounded"
                                value={endDate} onChange={e => setEndDate(e.target.value)} />
                        </div>
                    )}

                    {/* เดือน */}
                    <label className="flex items-center gap-2">
                        <input type="radio"
                            checked={filterType === 'month'}
                            onChange={() => setFilterType('month')}
                        />
                        เลือกเดือน
                    </label>

                    {filterType === 'month' && (
                        <div className="flex gap-2 ml-6 mb-2">
                            <select className="border p-2 rounded"
                                value={selectedMonth}
                                onChange={e => setSelectedMonth(Number(e.target.value))}
                            >
                                {[...Array(12)].map((_, i) => (
                                    <option key={i} value={i + 1}>{i + 1}</option>
                                ))}
                            </select>

                            <select className="border p-2 rounded"
                                value={selectedYear}
                                onChange={e => setSelectedYear(Number(e.target.value))}
                            >
                                {[2023, 2024, 2025, 2026].map(y => (
                                    <option key={y} value={y}>{y}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* ปี */}
                    <label className="flex items-center gap-2">
                        <input type="radio"
                            checked={filterType === 'year'}
                            onChange={() => setFilterType('year')}
                        />
                        เลือกปี
                    </label>

                    {filterType === 'year' && (
                        <div className="ml-6 mb-2">
                            <select className="border p-2 rounded"
                                value={selectedYear}
                                onChange={e => setSelectedYear(Number(e.target.value))}
                            >
                                {[2023, 2024, 2025, 2026].map(y => (
                                    <option key={y} value={y}>{y}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* เลือกรายการเอง */}
                    {/* <label className="flex items-center gap-2">
                        <input type="radio"
                            checked={filterType === 'select'}
                            onChange={() => setFilterType('select')}
                        />
                        เลือกรายการเอง
                    </label>

                    {filterType === 'select' && (
                        <p className="text-xs ml-6 text-slate-500">
                            ✓ เลือกรายการในตารางด้านล่าง
                        </p>
                    )} */}
                </div>


                {/* เอกสารรายงาน */}
                <div className="bg-white border shadow-sm rounded p-6 print:shadow-none print:border-none">

                    {/* Header */}
                    <div className="flex justify-between border-b pb-4 mb-4">
                        <div className="flex items-center gap-3">
                            <img src="/images/logo1.jpeg" className="w-14 h-14 rounded-full border" />
                            <div>
                                <h2 className="font-semibold">NWM.INDUSTRY Co.,Ltd</h2>
                                <p className="text-xs text-slate-600">บริษัท นวมิตร อุตสาหกรรม จำกัด</p>
                            </div>
                        </div>

                        <div className="text-xs text-right">
                            <p className="font-semibold">รายละเอียดปฏิบัติงานนอกสถานที่</p>
                            <p>8 ชม. = 60 บาท</p>
                            <p>เกิน 8 ชม. = 100 บาท</p>
                            <p>ค้างคืน = 200 บาท</p>
                        </div>
                    </div>

                    <h2 className="text-center font-semibold mb-4">
                        ใบบันทึกเวลาการทำงานนอกสถานที่
                    </h2>

                    {/* ชื่อพนักงาน + แผนก */}
                    <div className="w-full flex justify-between mt-2 mb-3 print:mt-0">

                        {/* ซ้าย: ชื่อพนักงาน */}
                        <div className="text-sm font-semibold flex">
                            <span>ชื่อพนักงาน:&nbsp;</span>
                            <span>{rows[0]?.employee_name || '-'}</span>
                        </div>

                        {/* ขวา: แผนก */}
                        <div className="text-sm font-semibold flex">
                            <span>แผนก:&nbsp;</span>
                            <span>{department || '-'}</span>
                        </div>

                    </div>



                    {/* ตาราง */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs border border-slate-300 border-collapse">
                            <thead>
                                <tr className="bg-slate-50">
                                    {filterType === 'select' && (
                                        <th className="border px-1 py-1 w-6"></th>
                                    )}
                                    <th className="border px-1 py-1 w-8">#</th>
                                    <th className="border px-1 py-1 w-20">วันที่</th>
                                    <th className="border px-1 py-1">สถานที่</th>
                                    <th className="border px-1 py-1 w-20">เริ่ม</th>
                                    <th className="border px-1 py-1 w-20">กลับ</th>
                                    <th className="border px-1 py-1 w-20">ชั่วโมง</th>
                                    <th className="border px-1 py-1 w-20">ค้างคืน</th>
                                    <th className="border px-1 py-1 w-20">ยอด</th>
                                </tr>
                            </thead>

                            <tbody>
                                {(() => {
                                    const MAX_ROWS = 25
                                    const filled = [...printRows]
                                    while (filled.length < MAX_ROWS) filled.push(null)

                                    return filled.map((r: any, idx: number) => {

                                        if (!r) {
                                            return (
                                                <tr key={idx} className="h-6">
                                                    {filterType === 'select' && (
                                                        <td className="border"></td>
                                                    )}
                                                    <td className="border text-center text-slate-400">{idx + 1}</td>
                                                    <td className="border"></td>
                                                    <td className="border"></td>
                                                    <td className="border"></td>
                                                    <td className="border"></td>
                                                    <td className="border"></td>
                                                    <td className="border"></td>
                                                    <td className="border"></td>
                                                </tr>
                                            )
                                        }

                                        const isChecked = selectedIds.includes(r.id)

                                        return (
                                            <tr key={r.id}>
                                                {filterType === 'select' && (
                                                    <td className="border text-center">
                                                        <input
                                                            type="checkbox"
                                                            checked={isChecked}
                                                            onChange={() => {
                                                                setSelectedIds(prev =>
                                                                    isChecked
                                                                        ? prev.filter(id => id !== r.id)
                                                                        : [...prev, r.id]
                                                                )
                                                            }}
                                                        />
                                                    </td>
                                                )}

                                                <td className="border text-center">{idx + 1}</td>
                                                <td className="border text-center">
                                                    {format(new Date(r.date), 'dd/MM/yyyy', { locale: th })}
                                                </td>
                                                <td className="border px-1">{r.location}</td>
                                                <td className="border text-center">{r.start_time}</td>
                                                <td className="border text-center">{r.end_time}</td>
                                                <td className="border text-center">{r.hours}</td>
                                                <td className="border text-center">{r.stay_over ? 'ค้างคืน' : ''}</td>
                                                <td className="border text-right px-1">{r.amount}</td>
                                            </tr>
                                        )
                                    })
                                })()}

                                {/* แถวยอดรวม */}
                                <tr className="bg-slate-50 font-semibold">
                                    {filterType === 'select' && <td className="border"></td>}
                                    <td className="border"></td>
                                    <td className="border text-right" colSpan={6}>ยอดรวม</td>
                                    <td className="border text-right px-1">
                                        {totalAmount.toLocaleString()}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    {/* ลายเซ็น */}
                    <div className="flex justify-end mt-6">
                        <table className="border text-xs">
                            <thead>
                                <tr className="bg-slate-50">
                                    <th className="border px-3 py-1 w-40 text-center">ลงชื่อพนักงาน</th>
                                    <th className="border px-3 py-1 w-40 text-center">ลงชื่อหัวหน้างาน</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr className="h-16">
                                    <td className="border"></td>
                                    <td className="border"></td>
                                </tr>
                                <tr>
                                    <td className="border px-2 py-1">วันที่: ………………………</td>
                                    <td className="border px-2 py-1">วันที่: ………………………</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                </div>

            </main>
        </>
    )
}
