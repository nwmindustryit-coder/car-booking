'use client'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import Navbar from '@/components/Navbar'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import { saveAs } from 'file-saver'
import * as XLSX from 'xlsx'
import { format } from 'date-fns'
import { th } from 'date-fns/locale'
import { 
  FileSpreadsheet, 
  Printer, 
  CalendarRange, 
  CalendarDays, 
  CarFront, 
  Building2, 
  Clock, 
  Route, 
  BarChart3,
  RefreshCw
} from 'lucide-react'

type Row = {
  plate: string
  date: string        // YYYY-MM-DD
  total_mile: number  // จากตาราง miles
  department: string
  time_slot?: string
}

type AggRow = {
  plate: string
  trips: number
  totalKm: number
}

const toYYYYMMDD = (d: Date) => d.toLocaleDateString('sv-SE') // YYYY-MM-DD

export default function ReportsPage() {
  const [mode, setMode] = useState<'month' | 'range'>('month')
  const [month, setMonth] = useState<Date>(new Date()) // picker แบบเดือน
  const [start, setStart] = useState<Date>(new Date(new Date().getFullYear(), new Date().getMonth(), 1))
  const [end, setEnd] = useState<Date>(new Date())
  const [loading, setLoading] = useState(false)
  const [rows, setRows] = useState<Row[]>([])
  const [error, setError] = useState<string | null>(null)

  // 🔵 สรุปเวลาการใช้รถ (แบบไม่ใช้เลขไมล์)
  const aggregatedTime = useMemo(() => {
    const map: Record<string, { plate: string; trips: number; totalMinutes: number }> = {}
    for (const r of rows) {
      if (!map[r.plate]) map[r.plate] = { plate: r.plate, trips: 0, totalMinutes: 0 }
      map[r.plate].trips += 1
      if (r.time_slot) {
        const minutes = r.time_slot.split(',').map(s => timeSlotToMinutes(s)).reduce((a, b) => a + b, 0)
        map[r.plate].totalMinutes += minutes
      }
    }
    return Object.values(map).sort((a, b) => a.plate.localeCompare(b.plate, 'th'))
  }, [rows])

  const aggregatedTimeByDept = useMemo(() => {
    const map: Record<string, { department: string; trips: number; totalMinutes: number }> = {}
    for (const r of rows) {
      const dept = r.department || '-'
      if (!map[dept]) map[dept] = { department: dept, trips: 0, totalMinutes: 0 }
      map[dept].trips += 1
      if (r.time_slot) {
        const minutes = r.time_slot.split(',').map(s => timeSlotToMinutes(s)).reduce((a, b) => a + b, 0)
        map[dept].totalMinutes += minutes
      }
    }
    return Object.values(map)
  }, [rows])

  function timeSlotToMinutes(slot: string): number {
    const [start, end] = slot.split('-').map(s => s.trim())
    if (!start || !end) return 0
    const [h1, m1] = start.split(':').map(Number)
    const [h2, m2] = end.split(':').map(Number)
    return (h2 * 60 + m2) - (h1 * 60 + m1)
  }

  function formatMinutesToReadable(totalMinutes: number): string {
    const days = Math.floor(totalMinutes / (60 * 24))
    const hours = Math.floor((totalMinutes % (60 * 24)) / 60)
    const minutes = totalMinutes % 60
    const parts = []
    if (days > 0) parts.push(`${days} วัน`)
    if (hours > 0) parts.push(`${hours} ชม.`)
    if (minutes > 0) parts.push(`${minutes} นาที`)
    return parts.join(' ') || '0 นาที'
  }

  const load = async () => {
    setError(null)
    setLoading(true)
    try {
      let from = toYYYYMMDD(start)
      let to = toYYYYMMDD(end)

      if (mode === 'month') {
        const y = month.getFullYear()
        const m = month.getMonth()
        const first = new Date(y, m, 1)
        const last = new Date(y, m + 1, 0)
        from = toYYYYMMDD(first)
        to = toYYYYMMDD(last)
      }

      const { data: bookingsRaw, error: bErr } = await supabase
        .from('bookings')
        .select(`id, date, time_slot, user_id, cars!inner ( plate ), profiles:user_id ( department )`)
        .gte('date', from)
        .lte('date', to)

      if (bErr) throw bErr

      const { data: milesData, error: mErr } = await supabase
        .from('miles')
        .select(`booking_id, start_mile, end_mile, total_mile`)

      if (mErr) throw mErr

      const milesMap = Object.fromEntries((milesData || []).map(m => [m.booking_id, m]))

      const mapped: Row[] = (bookingsRaw || []).map((b: any) => {
        const m = milesMap[b.id] || null
        const plate = (() => {
          const c: any = b.cars
          if (!c) return '-'
          if (Array.isArray(c)) return c[0]?.plate ?? '-'
          return c.plate ?? '-'
        })()
        const dept = (() => {
          const p: any = b.profiles
          if (!p) return '-'
          if (Array.isArray(p)) return p[0]?.department ?? '-'
          return p.department ?? '-'
        })()

        return {
          plate,
          date: b.date,
          department: dept,
          time_slot: b.time_slot ?? '',
          total_mile: m ? (m.total_mile ?? (m.end_mile - m.start_mile)) : null,
        }
      })

      setRows(mapped)
    } catch (e: any) {
      setError(e?.message ?? 'โหลดข้อมูลล้มเหลว')
    } finally {
      setLoading(false)
    }
  }

  const rowsWithMile = useMemo(() => rows.filter(r => r.total_mile !== null && !isNaN(r.total_mile)), [rows])

  useEffect(() => {
    load()
  }, [])

  const aggregated = useMemo(() => {
    const byPlate: Record<string, AggRow> = {}
    for (const r of rowsWithMile) {
      if (!byPlate[r.plate]) byPlate[r.plate] = { plate: r.plate, trips: 0, totalKm: 0 }
      byPlate[r.plate].trips += 1
      byPlate[r.plate].totalKm += r.total_mile || 0
    }
    return Object.values(byPlate)
  }, [rowsWithMile])

  const byDepartment = useMemo(() => {
    const dep: Record<string, { department: string; trips: number; totalKm: number; totalMinutes: number }> = {}
    for (const r of rowsWithMile) {
      const key = r.department || '-'
      if (!dep[key]) dep[key] = { department: key, trips: 0, totalKm: 0, totalMinutes: 0 }
      dep[key].trips += 1
      dep[key].totalKm += r.total_mile || 0
      if (r.time_slot) {
        const minutes = r.time_slot.split(',').map(s => timeSlotToMinutes(s)).reduce((a, b) => a + b, 0)
        dep[key].totalMinutes += minutes
      }
    }
    return Object.values(dep)
  }, [rowsWithMile])

  const rangeLabel = useMemo(() => {
    if (mode === 'month') return format(month, 'MMMM yyyy', { locale: th })
    return `${format(start, 'dd MMM yyyy', { locale: th })} - ${format(end, 'dd MMM yyyy', { locale: th })}`
  }, [mode, month, start, end])

  // KPIs
  const totalTrips = rows.length
  const totalKm = aggregated.reduce((sum, r) => sum + r.totalKm, 0)
  const totalMinutes = aggregatedTime.reduce((sum, r) => sum + r.totalMinutes, 0)

  const handlePrint = () => window.print()

  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new()
    const sheet1 = aggregated.map(a => ({ 'ทะเบียนรถ': a.plate, 'จำนวนครั้งที่ใช้ (ทริป)': a.trips, 'รวมระยะทาง (กม.)': a.totalKm }))
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sheet1), 'สรุปต่อทะเบียน')
    const sheet2 = byDepartment.map(d => ({ 'แผนก': d.department, 'จำนวนครั้งที่ใช้ (ทริป)': d.trips, 'รวมระยะทาง (กม.)': d.totalKm, 'เวลารวมทั้งหมด': formatMinutesToReadable(d.totalMinutes) }))
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sheet2), 'สรุปต่อแผนก')
    const sheet3 = rowsWithMile.map(r => ({ 'วันที่': r.date, 'ทะเบียนรถ': r.plate, 'ระยะทาง (กม.)': r.total_mile, 'แผนก': r.department, 'ช่วงเวลา': r.time_slot || '' }))
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sheet3), 'รายการดิบ')
    const sheet4 = aggregatedTime.map(r => ({ 'ทะเบียนรถ': r.plate, 'จำนวนทริปทั้งหมด': r.trips, 'เวลารวมทั้งหมด': formatMinutesToReadable(r.totalMinutes), 'หมายเหตุ': 'คำนวณตามช่วงเวลา — ไม่อิงเลขไมล์' }))
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sheet4), 'สรุปเวลาต่อทะเบียน')
    const sheet5 = aggregatedTimeByDept.map(d => ({ 'แผนก': d.department, 'จำนวนทริปทั้งหมด': d.trips, 'เวลารวมทั้งหมด': formatMinutesToReadable(d.totalMinutes), 'หมายเหตุ': 'คำนวณตามช่วงเวลา — ไม่อิงเลขไมล์' }))
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sheet5), 'สรุปเวลาต่อแผนก')

    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
    const blob = new Blob([wbout], { type: 'application/octet-stream' })
    saveAs(blob, `รายงานการใช้รถ_${rangeLabel}.xlsx`)
  }

  return (
    <div className="min-h-screen bg-slate-50/50 pb-12">
      <Navbar />
      <main className="p-4 sm:p-6 max-w-7xl mx-auto print:p-0 mt-4">
        
        {/* Header & Filters */}
        <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6 mb-8 print:hidden">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 bg-blue-600 rounded-xl shadow-sm text-white">
                <BarChart3 className="w-6 h-6" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight">รายงานสถิติการใช้รถ</h1>
            </div>
            <p className="text-slate-500 font-medium ml-14">ช่วงเวลา: <span className="text-blue-600">{rangeLabel}</span></p>
          </div>

          <div className="bg-white p-2 rounded-2xl shadow-sm border border-slate-200 flex flex-wrap lg:flex-nowrap items-center gap-3 w-full xl:w-auto">
            
            {/* โหมดตัวกรอง */}
            <div className="bg-slate-100 p-1 rounded-xl flex gap-1 items-center w-full sm:w-auto">
              <button
                className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all ${mode === 'month' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                onClick={() => setMode('month')}
              >
                <CalendarDays className="w-4 h-4"/> รายเดือน
              </button>
              <button
                className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all ${mode === 'range' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                onClick={() => setMode('range')}
              >
                <CalendarRange className="w-4 h-4"/> ช่วงวันที่
              </button>
            </div>

            {/* Date Pickers */}
            <div className="flex-1 sm:flex-none flex items-center gap-2 px-2">
              {mode === 'month' ? (
                <DatePicker
                  selected={month}
                  onChange={(d: Date | null) => d && setMonth(d)}
                  dateFormat="MMMM yyyy"
                  showMonthYearPicker
                  className="w-[160px] h-10 px-3 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer text-center"
                />
              ) : (
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <DatePicker
                    selected={start}
                    onChange={(d: Date | null) => d && setStart(d)}
                    dateFormat="dd/MM/yyyy"
                    className="w-[120px] h-10 px-3 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer text-center"
                  />
                  <span className="text-slate-400 font-medium">-</span>
                  <DatePicker
                    selected={end}
                    onChange={(d: Date | null) => d && setEnd(d)}
                    dateFormat="dd/MM/yyyy"
                    className="w-[120px] h-10 px-3 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer text-center"
                  />
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 w-full sm:w-auto px-1 border-t sm:border-t-0 sm:border-l border-slate-100 pt-3 sm:pt-0 sm:pl-3">
              <button
                onClick={load}
                disabled={loading}
                className="flex-1 sm:flex-none h-10 px-4 flex items-center justify-center gap-2 bg-slate-800 text-white rounded-xl text-sm font-medium hover:bg-slate-900 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                {loading ? 'กำลังโหลด...' : 'ดึงข้อมูล'}
              </button>
              
              <button onClick={handlePrint} className="h-10 w-10 flex items-center justify-center text-slate-500 bg-slate-50 hover:bg-slate-100 hover:text-slate-800 border border-slate-200 rounded-xl transition-colors" title="พิมพ์รายงาน">
                <Printer className="w-4 h-4" />
              </button>

              <button
                onClick={handleExportExcel}
                disabled={aggregated.length === 0}
                className="h-10 px-4 flex items-center justify-center gap-2 bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 rounded-xl text-sm font-medium transition-colors disabled:opacity-50 disabled:grayscale"
                title="ดาวน์โหลดไฟล์ Excel"
              >
                <FileSpreadsheet className="w-4 h-4" /> Excel
              </button>
            </div>

          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm font-medium flex items-center gap-2 animate-in fade-in">
            ⚠️ {error}
          </div>
        )}

        {/* 📊 KPI Cards Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 print:hidden">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-5">
             <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                <Route className="w-6 h-6"/>
             </div>
             <div>
                <p className="text-sm font-medium text-slate-500">จำนวนทริปทั้งหมด</p>
                <h3 className="text-2xl font-bold text-slate-800">{totalTrips.toLocaleString('th-TH')} <span className="text-sm font-medium text-slate-400">ครั้ง</span></h3>
             </div>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-5">
             <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
                <CarFront className="w-6 h-6"/>
             </div>
             <div>
                <p className="text-sm font-medium text-slate-500">รวมระยะทางขับขี่ (ที่บันทึกไมล์)</p>
                <h3 className="text-2xl font-bold text-slate-800">{totalKm.toLocaleString('th-TH')} <span className="text-sm font-medium text-slate-400">กม.</span></h3>
             </div>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-5">
             <div className="w-14 h-14 rounded-full bg-purple-50 flex items-center justify-center text-purple-600">
                <Clock className="w-6 h-6"/>
             </div>
             <div>
                <p className="text-sm font-medium text-slate-500">รวมเวลาการใช้รถ</p>
                <h3 className="text-xl font-bold text-slate-800">{formatMinutesToReadable(totalMinutes)}</h3>
             </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8 print:block print:space-y-8">
          
          {/* ตารางที่ 1: สรุปต่อทะเบียน */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden print:shadow-none print:border-slate-300">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
              <CarFront className="w-5 h-5 text-blue-600"/>
              <h2 className="font-bold text-slate-800">สรุปการใช้รถต่อทะเบียน (บันทึกไมล์)</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-600 font-medium">
                  <tr>
                    <th className="px-5 py-3 text-left">ทะเบียนรถ</th>
                    <th className="px-5 py-3 text-right">จำนวนทริป</th>
                    <th className="px-5 py-3 text-right">รวมระยะทาง</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {aggregated.map((r) => (
                    <tr key={r.plate} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-5 py-3 font-medium">{r.plate}</td>
                      <td className="px-5 py-3 text-right font-mono">{r.trips.toLocaleString('th-TH')}</td>
                      <td className="px-5 py-3 text-right font-mono text-emerald-600 font-medium">{r.totalKm.toLocaleString('th-TH')} กม.</td>
                    </tr>
                  ))}
                  {aggregated.length === 0 && (
                    <tr><td className="p-8 text-center text-slate-400" colSpan={3}>ไม่พบข้อมูลในระบบ</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* ตารางที่ 2: สรุปต่อแผนก */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden print:shadow-none print:border-slate-300">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
              <Building2 className="w-5 h-5 text-indigo-600"/>
              <h2 className="font-bold text-slate-800">สรุปการใช้รถต่อแผนก (บันทึกไมล์)</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-600 font-medium">
                  <tr>
                    <th className="px-5 py-3 text-left">แผนก</th>
                    <th className="px-5 py-3 text-right">ทริป</th>
                    <th className="px-5 py-3 text-right">ระยะทาง (กม.)</th>
                    <th className="px-5 py-3 text-right">เวลารวม</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {byDepartment.map((r) => (
                    <tr key={r.department} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-5 py-3 font-medium">{r.department}</td>
                      <td className="px-5 py-3 text-right font-mono">{r.trips.toLocaleString('th-TH')}</td>
                      <td className="px-5 py-3 text-right font-mono text-emerald-600 font-medium">{r.totalKm.toLocaleString('th-TH')}</td>
                      <td className="px-5 py-3 text-right text-slate-500">{formatMinutesToReadable(r.totalMinutes)}</td>
                    </tr>
                  ))}
                  {byDepartment.length === 0 && (
                    <tr><td className="p-8 text-center text-slate-400" colSpan={4}>ไม่พบข้อมูลในระบบ</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* ตารางที่ 3: สรุปเวลาต่อทะเบียน */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden print:shadow-none print:border-slate-300">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3 bg-purple-50/30">
              <Clock className="w-5 h-5 text-purple-600"/>
              <div>
                <h2 className="font-bold text-slate-800">สรุปเวลาการใช้รถต่อทะเบียน</h2>
                <p className="text-xs text-slate-500 font-normal mt-0.5">คำนวณจากช่วงเวลาจอง ไม่อิงเลขไมล์</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-600 font-medium">
                  <tr>
                    <th className="px-5 py-3 text-left">ทะเบียนรถ</th>
                    <th className="px-5 py-3 text-center">จำนวนทริป</th>
                    <th className="px-5 py-3 text-right">เวลารวม</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {aggregatedTime.map((r) => (
                    <tr key={r.plate} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-5 py-3 font-medium">{r.plate}</td>
                      <td className="px-5 py-3 text-center font-mono">{r.trips}</td>
                      <td className="px-5 py-3 text-right font-medium text-purple-700">{formatMinutesToReadable(r.totalMinutes)}</td>
                    </tr>
                  ))}
                  {aggregatedTime.length === 0 && (
                    <tr><td className="p-8 text-center text-slate-400" colSpan={3}>ไม่พบข้อมูลในระบบ</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* ตารางที่ 4: สรุปเวลาต่อแผนก */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden print:shadow-none print:border-slate-300">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3 bg-purple-50/30">
              <Clock className="w-5 h-5 text-purple-600"/>
              <div>
                <h2 className="font-bold text-slate-800">สรุปเวลาการใช้รถต่อแผนก</h2>
                <p className="text-xs text-slate-500 font-normal mt-0.5">คำนวณจากช่วงเวลาจอง ไม่อิงเลขไมล์</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-600 font-medium">
                  <tr>
                    <th className="px-5 py-3 text-left">แผนก</th>
                    <th className="px-5 py-3 text-center">จำนวนทริป</th>
                    <th className="px-5 py-3 text-right">เวลารวมทั้งหมด</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {aggregatedTimeByDept.map((r) => (
                    <tr key={r.department} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-5 py-3 font-medium">{r.department}</td>
                      <td className="px-5 py-3 text-center font-mono">{r.trips.toLocaleString('th-TH')}</td>
                      <td className="px-5 py-3 text-right font-medium text-purple-700">{formatMinutesToReadable(r.totalMinutes)}</td>
                    </tr>
                  ))}
                  {aggregatedTimeByDept.length === 0 && (
                    <tr><td className="p-8 text-center text-slate-400" colSpan={3}>ไม่พบข้อมูลในระบบ</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* ตารางรายการดิบ เต็มความกว้าง */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden print:shadow-none print:border-slate-300">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
            <Route className="w-5 h-5 text-slate-600"/>
            <h2 className="font-bold text-slate-800">รายการดิบรายทริป (เฉพาะที่มีการบันทึกเลขไมล์)</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600 font-medium">
                <tr>
                  <th className="px-5 py-3 text-left">วันที่</th>
                  <th className="px-5 py-3 text-left">ทะเบียนรถ</th>
                  <th className="px-5 py-3 text-left">แผนก</th>
                  <th className="px-5 py-3 text-right">ระยะทาง (กม.)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {rowsWithMile
                  .sort((a, b) => b.date.localeCompare(a.date)) // เรียงใหม่ไปเก่าดีกว่า
                  .map((r, idx) => (
                    <tr key={`${r.plate}_${r.date}_${idx}`} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-5 py-3 font-medium text-slate-600">
                        {format(new Date(r.date), 'dd MMM yyyy', { locale: th })}
                      </td>
                      <td className="px-5 py-3 font-medium">{r.plate}</td>
                      <td className="px-5 py-3 text-slate-500">{r.department}</td>
                      <td className="px-5 py-3 text-right font-mono font-medium">{r.total_mile?.toLocaleString('th-TH')}</td>
                    </tr>
                  ))}
                {rowsWithMile.length === 0 && (
                  <tr><td className="p-12 text-center text-slate-400" colSpan={4}>ไม่พบข้อมูลในระบบ</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* สไตล์สำหรับพิมพ์ */}
      <style jsx global>{`
        @media print {
          @page { margin: 1cm; }
          nav, button, .react-datepicker, .react-datepicker__tab-loop, .print\\:hidden { display: none !important; }
          main { padding: 0 !important; margin: 0 !important; background: white !important;}
          table { font-size: 11px; }
          th { background-color: #f8fafc !important; -webkit-print-color-adjust: exact; }
          .shadow, .shadow-sm, .shadow-md, .shadow-lg { box-shadow: none !important; }
          .border { border-color: #e2e8f0 !important; }
          body { background-color: white !important; }
        }
      `}</style>
    </div>
  )
}