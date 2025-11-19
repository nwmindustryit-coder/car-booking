'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import { Button } from '@/components/ui/button'
import Navbar from '@/components/Navbar'
import { useRouter } from 'next/navigation'
import { Printer, ArrowLeft } from 'lucide-react'
import { format } from 'date-fns'
import { th } from 'date-fns/locale'

const RATE_PER_KM = 5
const ADMIN_EMAILS = ['theeraphat@nawamit.com']

type MileageRow = {
    id: string
    user_id: string
    date: string
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

export default function PrivateMileageReportPage() {
    const [user, setUser] = useState<User | null>(null)
    const [rows, setRows] = useState<MileageRow[]>([])
    const [loading, setLoading] = useState(true)
    const [filterType, setFilterType] = useState<'range' | 'month' | 'year' | 'select'>('range');

    const [startDate, setStartDate] = useState<Date | null>(null);
    const [endDate, setEndDate] = useState<Date | null>(null);

    const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

    const [selectedIds, setSelectedIds] = useState<string[]>([]);


    const router = useRouter()

    const filteredRows = useMemo(() => {

        if (filterType === 'range' && startDate && endDate) {
            return rows.filter(r => {
                const d = new Date(r.date);
                return d >= startDate && d <= endDate;
            });
        }

        if (filterType === 'month') {
            return rows.filter(r => {
                const d = new Date(r.date);
                return d.getMonth() + 1 === selectedMonth &&
                    d.getFullYear() === selectedYear;
            });
        }

        if (filterType === 'year') {
            return rows.filter(r => {
                const d = new Date(r.date);
                return d.getFullYear() === selectedYear;
            });
        }

        // 🔥 select mode → แสดงทุกแถว ให้ user เลือกเอง
        if (filterType === 'select') {
            return rows;
        }

        return rows;

    }, [rows, filterType, startDate, endDate, selectedMonth, selectedYear]);



    const isAdmin = useMemo(
        () => !!user?.email && ADMIN_EMAILS.includes(user.email),
        [user]
    )

    useEffect(() => {
        const load = async () => {
            const { data: userData, error: userErr } = await supabase.auth.getUser()
            if (userErr || !userData.user) {
                router.push('/login')
                return
            }
            const u: User = { id: userData.user.id, email: userData.user.email ?? undefined }
            setUser(u)

            let query = supabase
                .from('mileages')
                .select('*')
                .order('date', { ascending: true })
                .order('created_at', { ascending: true })

            if (!ADMIN_EMAILS.includes(userData.user.email ?? '')) {
                query = query.eq('user_id', userData.user.id)
            }

            const { data, error } = await query
            if (error) {
                console.error('Error load mileages for report:', error)
                setRows([])
            } else {
                setRows(data || [])
            }
            setLoading(false)
        }

        load()
    }, [router])

    const totalAmount = useMemo(() => {
        return filteredRows.reduce((sum, r) => {
            const distance = typeof r.distance === 'number'
                ? r.distance
                : r.end_mile - r.start_mile

            const amount = typeof r.amount === 'number'
                ? r.amount
                : distance * RATE_PER_KM

            return sum + (Number.isFinite(amount) ? amount : 0)
        }, 0)
    }, [filteredRows])


    const displayName = user?.email ?? ''

    const handlePrint = () => {
        if (typeof window !== 'undefined') {
            window.print()
        }
    }

    if (loading) {
        return (
            <>
                <Navbar />
                <main className="p-6 max-w-4xl mx-auto">
                    <p className="text-sm text-slate-500">กำลังโหลดรายงาน...</p>
                </main>
            </>
        )
    }

    return (
        <>
            {/* <Navbar className="no-print" /> */}
            <main className="p-4 md:p-6 max-w-5xl mx-auto print:max-w-none print:p-0">
                {/* แถบปุ่มบนสุด (ซ่อนเวลา print) */}
                <div className="flex justify-between items-center mb-4 print:hidden">
                    <div className="border p-4 rounded-md mb-4">
                        <div>
                            <h1 className="text-xl font-semibold text-slate-800">
                                รายงานคำนวณค่า Mileage
                            </h1>
                            <p className="text-xs text-slate-500">
                                อัตรา {RATE_PER_KM.toLocaleString()} บาท / 1 กม.
                            </p>
                        </div>

                        <p className="font-medium mb-2">ตัวเลือกการออกรายงาน</p>

                        {/* ฟิลเตอร์ + ปุ่ม (ทั้งหมดซ่อนไม่ให้พิมพ์ออกมา) */}
                        <div className="print:hidden space-y-4 mb-4">

                            {/* ปุ่มกลับ + พิมพ์ */}
                            <div className="flex justify-between items-center">
                                <Button
                                    variant="outline"
                                    onClick={() => router.push('/private-mile')}
                                    className="flex items-center gap-2"
                                >
                                    <ArrowLeft className="w-4 h-4" />
                                    กลับหน้าบันทึกเลขไมล์
                                </Button>

                                <Button
                                    onClick={handlePrint}
                                    className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700"
                                >
                                    <Printer className="w-4 h-4" />
                                    พิมพ์รายงาน
                                </Button>
                            </div>

                            {/* กล่องฟิลเตอร์ */}
                            <div className="border p-4 rounded-lg bg-white shadow-sm">
                                <p className="font-medium mb-3">ตัวเลือกการออกรายงาน</p>

                                <div className="space-y-3">

                                    {/* --- ช่วงวันที่ --- */}
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            checked={filterType === 'range'}
                                            onChange={() => setFilterType('range')}
                                        />
                                        ช่วงวันที่
                                    </label>

                                    {filterType === 'range' && (
                                        <div className="flex gap-2 ml-6">
                                            <DatePicker
                                                selected={startDate}
                                                onChange={(date: Date | null) => setStartDate(date)}
                                                dateFormat="dd/MM/yyyy"
                                                className="border px-2 py-1 rounded-md"
                                                placeholderText="วันเริ่มต้น"
                                            />
                                            <span>ถึง</span>
                                            <DatePicker
                                                selected={endDate}
                                                onChange={(date: Date | null) => setStartDate(date)}
                                                dateFormat="dd/MM/yyyy"
                                                className="border px-2 py-1 rounded-md"
                                            placeholderText="วันสิ้นสุด"
                                            />
                                        </div>
                                    )}

                                    {/* --- เลือกเดือน --- */}
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            checked={filterType === 'month'}
                                            onChange={() => setFilterType('month')}
                                        />
                                        เลือกเดือน
                                    </label>

                                    {filterType === 'month' && (
                                        <div className="flex gap-2 ml-6">
                                            <select
                                                value={selectedMonth}
                                                onChange={e => setSelectedMonth(Number(e.target.value))}
                                                className="border p-1 rounded"
                                            >
                                                {[...Array(12)].map((_, i) => (
                                                    <option key={i} value={i + 1}>{i + 1}</option>
                                                ))}
                                            </select>

                                            <select
                                                value={selectedYear}
                                                onChange={e => setSelectedYear(Number(e.target.value))}
                                                className="border p-1 rounded"
                                            >
                                                {[2023, 2024, 2025, 2026].map(y => (
                                                    <option key={y} value={y}>{y}</option>
                                                ))}
                                            </select>
                                        </div>
                                    )}

                                    {/* --- เลือกปี --- */}
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            checked={filterType === 'year'}
                                            onChange={() => setFilterType('year')}
                                        />
                                        เลือกปี
                                    </label>

                                    {filterType === 'year' && (
                                        <div className="ml-6">
                                            <select
                                                value={selectedYear}
                                                onChange={e => setSelectedYear(Number(e.target.value))}
                                                className="border p-1 rounded"
                                            >
                                                {[2023, 2024, 2025, 2026].map(y => (
                                                    <option key={y} value={y}>{y}</option>
                                                ))}
                                            </select>
                                        </div>
                                    )}

                                    {/* --- เลือกรายการเอง --- */}
                                    {/* <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            checked={filterType === 'select'}
                                            onChange={() => setFilterType('select')}
                                        />
                                        เลือกรายการเอง
                                    </label> */}

                                    {filterType === 'select' && (
                                        <p className="ml-6 text-xs text-slate-500">
                                            ✓ เลือกรายการจาก checkbox ในตารางด้านล่าง
                                        </p>
                                    )}

                                </div>
                            </div>
                        </div>

                    </div>


                </div>
                <div id="print-area">
                    {/* เนื้อหาหน้ารายงาน (จริง ๆ) */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 md:p-6 print:shadow-none print:border-none print:rounded-none">
                        {/* Header โลโก้ + ชื่อบริษัท + หัวเรื่อง */}
                        <header className="flex flex-col gap-3 border-b border-slate-200 pb-4 mb-4">
                            <div className="flex items-center justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    {/* โลโก้ (เปลี่ยน path ได้) */}
                                    <div className="h-14 w-14 rounded-full overflow-hidden border border-slate-200 flex items-center justify-center">
                                        <img
                                            src="/images/logo1.jpeg"
                                            alt="Company Logo"
                                            className="h-full w-full object-cover"
                                        />
                                    </div>
                                    <div>
                                        <h2 className="text-base font-semibold text-slate-800">
                                            NWM.INDUSTRY Co.,Ltd
                                        </h2>
                                        <p className="text-xs text-slate-500">
                                            บริษัท นวมิตร อุตสาหกรรม จำกัด
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right text-xs text-slate-600">
                                    <p className="font-semibold">รายละเอียดการคำนวณค่า Mileage</p>
                                    <p>อัตรา {RATE_PER_KM.toLocaleString()} บาท ต่อ 1 กิโลเมตร</p>
                                </div>
                            </div>

                            <div className="text-center">
                                <p className="font-semibold text-sm">ใบบันทึกเลข Mileage</p>
                            </div>

                            <div className="flex justify-between text-xs text-slate-700">
                                <p>
                                    ชื่อพนักงาน:{' '}
                                    <span className="font-semibold">
                                        {rows[0]?.employee_name || '-'}
                                    </span>
                                </p>
                                {isAdmin && (
                                    <p className="text-amber-700">
                                        ผู้ดูแลระบบ (ดูข้อมูลพนักงานหลายคนได้)
                                    </p>
                                )}
                            </div>
                        </header>

                        {/* ตารางข้อมูล */}
                        <section className="mb-6">
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs border border-slate-300 border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50 text-slate-700">
                                            {filterType === 'select' && (
                                                <th className="border border-slate-300 px-1 py-1 w-6"></th>
                                            )}
                                            <th className="border border-slate-300 px-1 py-1 w-8">#</th>
                                            <th className="border border-slate-300 px-1 py-1 w-20">
                                                วันที่
                                            </th>
                                            <th className="border border-slate-300 px-1 py-1">
                                                สถานที่
                                            </th>
                                            <th className="border border-slate-300 px-1 py-1 w-16">
                                                เริ่มต้น
                                            </th>
                                            <th className="border border-slate-300 px-1 py-1 w-16">
                                                สิ้นสุด
                                            </th>
                                            <th className="border border-slate-300 px-1 py-1 w-16">
                                                จำนวน (กม.)
                                            </th>
                                            <th className="border border-slate-300 px-1 py-1">
                                                เหตุผล
                                            </th>
                                            <th className="border border-slate-300 px-1 py-1 w-16">
                                                ยอด (บาท)
                                            </th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {(() => {
                                            const MAX_ROWS = 20;

                                            // ✓ เลือกแถวที่จะใช้จริง
                                            const printRows = filterType === 'select'
                                                ? rows.filter(r => selectedIds.includes(r.id))
                                                : filteredRows;
                                            // ✓ คำนวณยอดรวม
                                            const totalPrintAmount = printRows.reduce((sum, r) => {
                                                if (!r) return sum;
                                                const distance = r.distance ?? (r.end_mile - r.start_mile);
                                                const amount = r.amount ?? distance * RATE_PER_KM;
                                                return sum + amount;
                                            }, 0);


                                            // ✓ เติมแถวว่างให้ครบ 25 แถว
                                            const filled = [...printRows];
                                            while (filled.length < MAX_ROWS) filled.push(null as any);

                                            return (
                                                <>
                                                    {filled.map((r, idx) => {

                                                        // ---- แถวว่าง ----
                                                        if (!r) {
                                                            return (
                                                                <tr key={`empty-${idx}`} className="h-6">
                                                                    {filterType === 'select' && (
                                                                        <td className="border border-slate-300 w-6"></td>
                                                                    )}

                                                                    <td className="border border-slate-300 text-center text-slate-400">
                                                                        {idx + 1}
                                                                    </td>
                                                                    <td className="border border-slate-300"></td>
                                                                    <td className="border border-slate-300"></td>
                                                                    <td className="border border-slate-300"></td>
                                                                    <td className="border border-slate-300"></td>
                                                                    <td className="border border-slate-300"></td>
                                                                    <td className="border border-slate-300"></td>
                                                                    <td className="border border-slate-300"></td>
                                                                </tr>
                                                            );
                                                        }

                                                        // ---- แถวข้อมูลจริง ----
                                                        const d = new Date(r.date);
                                                        const distance = r.distance ?? (r.end_mile - r.start_mile);
                                                        const amount = r.amount ?? distance * RATE_PER_KM;
                                                        const isChecked = selectedIds.includes(r.id);

                                                        return (
                                                            <tr key={r.id}>
                                                                {filterType === 'select' && (
                                                                    <td className="border border-slate-300 text-center w-6">
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={isChecked}
                                                                            onChange={() => {
                                                                                setSelectedIds(prev =>
                                                                                    isChecked
                                                                                        ? prev.filter(id => id !== r.id)
                                                                                        : [...prev, r.id]
                                                                                );
                                                                            }}
                                                                        />
                                                                    </td>
                                                                )}

                                                                <td className="border border-slate-300 text-center">{idx + 1}</td>
                                                                <td className="border border-slate-300 text-center">
                                                                    {format(d, 'dd/MM/yyyy', { locale: th })}
                                                                </td>
                                                                <td className="border border-slate-300">{r.location}</td>
                                                                <td className="border border-slate-300 text-right">
                                                                    {r.start_mile.toLocaleString()}
                                                                </td>
                                                                <td className="border border-slate-300 text-right">
                                                                    {r.end_mile.toLocaleString()}
                                                                </td>
                                                                <td className="border border-slate-300 text-right">{distance}</td>
                                                                <td className="border border-slate-300">{r.remark}</td>
                                                                <td className="border border-slate-300 text-right">
                                                                    {amount.toLocaleString()}
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}

                                                    {/* ---- แถวรวม ---- */}
                                                    <tr className="bg-slate-50 font-semibold">
                                                        {filterType === 'select' && <td className="border border-slate-300"></td>}

                                                        <td className="border border-slate-300"></td>
                                                        <td className="border border-slate-300 text-right" colSpan={6}>
                                                            ยอดรวม
                                                        </td>
                                                        <td className="border border-slate-300 text-right">
                                                            {totalPrintAmount.toLocaleString()}
                                                        </td>
                                                    </tr>
                                                </>
                                            );
                                        })()}
                                    </tbody>


                                </table>
                            </div>
                        </section>

                        {/* ส่วนลายเซ็น */}
                        <section className="mt-6 flex justify-end">
                            <table className="border border-slate-300 text-xs">
                                <thead>
                                    <tr className="bg-slate-50">
                                        <th className="border border-slate-300 px-3 py-1 text-center w-40">
                                            ลงชื่อพนักงาน
                                        </th>
                                        <th className="border border-slate-300 px-3 py-1 text-center w-40">
                                            ลงชื่อหัวหน้างาน
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr className="h-16">
                                        <td className="border border-slate-300" />
                                        <td className="border border-slate-300" />
                                    </tr>
                                    <tr>
                                        <td className="border border-slate-300 px-2 py-1">
                                            วันที่: ……………………………
                                        </td>
                                        <td className="border border-slate-300 px-2 py-1">
                                            วันที่: ……………………………
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </section>
                    </div>
                </div>

                {/* footer โค้ด/เวอร์ชั่น (optional) */}
                <footer className="mt-4 text-right text-[10px] text-slate-400 print:hidden">
                    Mileage Report • Generated by Car Booking System
                </footer>
            </main>
        </>
    )
}
