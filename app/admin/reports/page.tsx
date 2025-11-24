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
  const [user, setUser] = useState<any>(null)

  // 🔵 สรุปเวลาการใช้รถ "ต่อแผนก" (ไม่ใช้เลขไมล์)
  // const aggregatedTimeByDept = useMemo(() => {
  //   const map: Record<string, { department: string; trips: number; totalMinutes: number }> = {}

  //   for (const r of rows) {
  //     const dept = r.department || '-'
  //     if (!map[dept]) {
  //       map[dept] = { department: dept, trips: 0, totalMinutes: 0 }
  //     }

  //     // ถ้าไม่มี time_slot ข้ามไป
  //     if (!r.time_slot) continue

  //     const minutes = r.time_slot
  //       .split(',')
  //       .map(s => timeSlotToMinutes(s))
  //       .reduce((a, b) => a + b, 0)

  //     map[dept].trips += 1
  //     map[dept].totalMinutes += minutes
  //   }

  //   return Object.values(map)
  //     .sort((a, b) => a.department.localeCompare(b.department, 'th'))
  // }, [rows])


  // 🔵 สรุปเวลาต่อทะเบียน (แบบไม่ใช้เลขไมล์)
  // const aggregatedTime = useMemo(() => {
  //   const map: Record<string, { plate: string; trips: number; totalMinutes: number }> = {}

  //   for (const r of rows) {
  //     if (!r.time_slot) continue

  //     if (!map[r.plate]) {
  //       map[r.plate] = { plate: r.plate, trips: 0, totalMinutes: 0 }
  //     }

  //     const minutes = r.time_slot
  //       .split(',')
  //       .map(s => timeSlotToMinutes(s))
  //       .reduce((a, b) => a + b, 0)

  //     map[r.plate].trips += 1
  //     map[r.plate].totalMinutes += minutes
  //   }

  //   return Object.values(map)
  //     .sort((a, b) => a.plate.localeCompare(b.plate, 'th'))
  // }, [rows])

  // สรุปต่อทะเบียน (รวมทุกทริป)
  // const aggregated = useMemo(() => {
  //   const result: Record<string, AggRow> = {}

  //   for (const r of rows) {
  //     if (!result[r.plate]) {
  //       result[r.plate] = { plate: r.plate, trips: 0, totalKm: 0 }
  //     }

  //     // ทุกแถวคือ 1 ทริป
  //     result[r.plate].trips += 1

  //     // ถ้ามีไมล์ → เพิ่ม km
  //     if (Number.isFinite(r.total_mile)) {
  //       result[r.plate].totalKm += r.total_mile
  //     }
  //   }

  //   return Object.values(result)
  // }, [rows])
  // 🔵 สรุปเวลาการใช้รถ (แบบไม่ใช้เลขไมล์)
  const aggregatedTime = useMemo(() => {
    const map: Record<string, { plate: string; trips: number; totalMinutes: number }> = {}

    for (const r of rows) {
      if (!map[r.plate]) {
        map[r.plate] = { plate: r.plate, trips: 0, totalMinutes: 0 }
      }

      // ทุกแถวคือ 1 ทริป
      map[r.plate].trips += 1

      // รวมเวลาตาม time_slot ถ้ามี
      if (r.time_slot) {
        const minutes = r.time_slot
          .split(',')
          .map(s => timeSlotToMinutes(s))
          .reduce((a, b) => a + b, 0)
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

      // ทริป = ทุกแถวใน rows
      map[dept].trips += 1

      // รวมเวลาจาก time_slot ถ้ามี
      if (r.time_slot) {
        const minutes = r.time_slot
          .split(',')
          .map(s => timeSlotToMinutes(s))
          .reduce((a, b) => a + b, 0)
        map[dept].totalMinutes += minutes
      }
    }

    return Object.values(map)
  }, [rows])




  // แปลงช่วงเวลา "HH:mm-HH:mm" เป็นจำนวนนาที
  function timeSlotToMinutes(slot: string): number {
    const [start, end] = slot.split('-').map(s => s.trim())
    if (!start || !end) return 0
    const [h1, m1] = start.split(':').map(Number)
    const [h2, m2] = end.split(':').map(Number)
    return (h2 * 60 + m2) - (h1 * 60 + m1)
  }

  // แปลงจำนวนนาทีรวมทั้งหมด → เป็นข้อความ "x วัน y ชม. z นาที"
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


  // โหลดข้อมูลตาม filter
  const load = async () => {
    setError(null)
    setLoading(true)
    try {
      // ช่วงวันที่
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

      // โหลด bookings ทั้งหมด
      const { data: bookingsRaw, error: bErr } = await supabase
        .from('bookings')
        .select(`
        id,
        date,
        time_slot,
        user_id,
        cars!inner ( plate ),
        profiles:user_id ( department )
      `)
        .gte('date', from)
        .lte('date', to)

      if (bErr) throw bErr

      // โหลด miles ทั้งหมด
      const { data: milesData, error: mErr } = await supabase
        .from('miles')
        .select(`booking_id, start_mile, end_mile, total_mile`)

      if (mErr) throw mErr

      // ทำ map miles
      const milesMap = Object.fromEntries(
        (milesData || []).map(m => [m.booking_id, m])
      )

      // รวม bookings + miles
      const mapped: Row[] = (bookingsRaw || []).map(b => {
        const m = milesMap[b.id] || null

        return {
          plate: b.cars?.plate ?? '-',
          date: b.date,
          department: b.profiles?.department ?? '-',
          time_slot: b.time_slot ?? '',
          total_mile: m
            ? (m.total_mile ?? (m.end_mile - m.start_mile))
            : null,
        }
      })

      setRows(mapped)
    } catch (e: any) {
      setError(e?.message ?? 'โหลดข้อมูลล้มเหลว')
    } finally {
      setLoading(false)
    }
  }

  // ชุดข้อมูลที่มีการกรอกเลขไมล์
  const rowsWithMile = useMemo(() => {
    return rows.filter(r => r.total_mile !== null && !isNaN(r.total_mile))
  }, [rows])


  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])


  // สรุปผลรวมต่อทะเบียน
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




  // ชื่อช่วงวันที่/เดือน เพื่อแสดงหัวรายงาน + ตั้งชื่อไฟล์
  const rangeLabel = useMemo(() => {
    if (mode === 'month') {
      return format(month, 'MMMM yyyy', { locale: th })
    }
    return `${format(start, 'dd MMM yyyy', { locale: th })} - ${format(end, 'dd MMM yyyy', { locale: th })}`
  }, [mode, month, start, end])

  // พิมพ์ (ใช้ CSS สื่อสารด้วย @media print)
  const handlePrint = () => {
    window.print()
  }

  // ดาวน์โหลด Excel
  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new()

    // ============================
    // 1) Sheet: สรุปต่อทะเบียน (เฉพาะที่มีเลขไมล์)
    // ============================
    const sheet1 = aggregated.map(a => ({
      'ทะเบียนรถ': a.plate,
      'จำนวนครั้งที่ใช้ (ทริป)': a.trips,
      'รวมระยะทาง (กม.)': a.totalKm,
    }))
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sheet1), 'สรุปต่อทะเบียน')

    // ============================
    // 2) Sheet: สรุปต่อแผนก (เฉพาะที่มีเลขไมล์)
    // ============================
    const sheet2 = byDepartment.map(d => ({
      'แผนก': d.department,
      'จำนวนครั้งที่ใช้ (ทริป)': d.trips,
      'รวมระยะทาง (กม.)': d.totalKm,
      'เวลารวมทั้งหมด': formatMinutesToReadable(d.totalMinutes),
    }))
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sheet2), 'สรุปต่อแผนก')

    // ============================
    // 3) Sheet: รายการดิบ (เฉพาะที่มีเลขไมล์)
    // ============================
    const sheet3 = rowsWithMile.map(r => ({
      'วันที่': r.date,
      'ทะเบียนรถ': r.plate,
      'ระยะทาง (กม.)': r.total_mile,
      'แผนก': r.department,
      'ช่วงเวลา': r.time_slot || '',
    }))
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sheet3), 'รายการดิบ')

    // ============================
    // 4) Sheet: สรุปเวลาต่อทะเบียน (รวมทุกทริป)
    // ============================
    const sheet4 = aggregatedTime.map(r => ({
      'ทะเบียนรถ': r.plate,
      'จำนวนทริปทั้งหมด': r.trips,
      'เวลารวมทั้งหมด': formatMinutesToReadable(r.totalMinutes),
      'หมายเหตุ': 'คำนวณตามช่วงเวลา — ไม่อิงเลขไมล์',
    }))
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sheet4), 'สรุปเวลาต่อทะเบียน')

    // ============================
    // 5) Sheet: สรุปเวลาต่อแผนก (รวมทุกทริป)
    // ============================
    const sheet5 = aggregatedTimeByDept.map(d => ({
      'แผนก': d.department,
      'จำนวนทริปทั้งหมด': d.trips,
      'เวลารวมทั้งหมด': formatMinutesToReadable(d.totalMinutes),
      'หมายเหตุ': 'คำนวณตามช่วงเวลา — ไม่อิงเลขไมล์',
    }))
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sheet5), 'สรุปเวลาต่อแผนก')

    // ============================
    // Export
    // ============================
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
    const blob = new Blob([wbout], { type: 'application/octet-stream' })
    saveAs(blob, `รายงานการใช้รถ_${rangeLabel}.xlsx`)
  }



  return (
    <>
      <div className="p-4">
        <Navbar />
        <main className="p-4 sm:p-6 max-w-6xl mx-auto print:p-0">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between  gap-3 mb-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-blue-700">รายงานการใช้รถ</h1>
              <p className="text-sm text-gray-500">ช่วง: {rangeLabel}</p>
            </div>

            <div className="flex flex-wrap gap-2 items-center">
              {/* สลับโหมด เดือน / ช่วงวันที่ */}
              <div className="border rounded-lg overflow-hidden flex">
                <button
                  className={`px-3 py-1 text-sm ${mode === 'month' ? 'bg-blue-600 text-white' : 'bg-white text-blue-600'}`}
                  onClick={() => setMode('month')}
                >
                  รายเดือน
                </button>
                <button
                  className={`px-3 py-1 text-sm ${mode === 'range' ? 'bg-blue-600 text-white' : 'bg-white text-blue-600'}`}
                  onClick={() => setMode('range')}
                >
                  ช่วงวันที่
                </button>
              </div>

              {/* ตัวเลือกเดือน หรือ วัน */}
              {mode === 'month' ? (
                <DatePicker
                  selected={month}
                  onChange={(d: Date | null) => d && setMonth(d)}
                  dateFormat="MMMM yyyy"
                  showMonthYearPicker
                  className="border rounded-md p-2 text-sm"
                />
              ) : (
                <div className="flex gap-2">
                  <DatePicker
                    selected={start}
                    onChange={(d: Date | null) => d && setStart(d)}
                    dateFormat="dd/MM/yyyy"
                    className="border rounded-md p-2 text-sm"
                  />
                  <span className="self-center text-sm">ถึง</span>
                  <DatePicker
                    selected={end}
                    onChange={(d: Date | null) => d && setEnd(d)}
                    dateFormat="dd/MM/yyyy"
                    className="border rounded-md p-2 text-sm"
                  />
                </div>
              )}

              <button
                onClick={load}
                className="px-3 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"
                disabled={loading}
              >
                {loading ? 'กำลังโหลด...' : 'ดึงข้อมูล'}
              </button>

              <button
                onClick={handlePrint}
                className="px-3 py-2 bg-white text-blue-600 border rounded-md text-sm hover:bg-blue-50"
              >
                พิมพ์รายงาน
              </button>

              <button
                onClick={handleExportExcel}
                className="px-3 py-2 bg-green-600 text-white rounded-md text-sm hover:bg-green-700"
                disabled={aggregated.length === 0}
              >
                ดาวน์โหลด Excel
              </button>

            </div>
          </div>

          {error && (
            <div className="mb-3 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
              {error}
            </div>
          )}

          {/* สรุปต่อทะเบียน */}
          <div className="bg-white rounded-xl shadow overflow-hidden mb-6 print:shadow-none">
            <div className="px-4 py-2 font-semibold text-white bg-[#2f3195]">
              สรุปการใช้รถต่อทะเบียน ({rangeLabel})
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs sm:text-sm min-w-[700px]">
                <thead className="bg-blue-100 text-blue-800">
                  <tr>
                    <th className="p-2 sm:p-3 text-left">ทะเบียนรถ</th>
                    <th className="p-2 sm:p-3 text-right">จำนวนทริป</th>
                    <th className="p-2 sm:p-3 text-right">รวมระยะทาง (กม.)</th>
                  </tr>
                </thead>
                <tbody>
                  {aggregated.map((r) => (
                    <tr key={r.plate} className="border-b hover:bg-blue-50">
                      <td className="p-2 sm:p-3">{r.plate}</td>
                      <td className="p-2 sm:p-3 text-right">{r.trips.toLocaleString('th-TH')}</td>
                      <td className="p-2 sm:p-3 text-right">{r.totalKm.toLocaleString('th-TH')}</td>
                    </tr>
                  ))}
                  {aggregated.length === 0 && (
                    <tr>
                      <td className="p-3 text-center text-gray-500" colSpan={3}>ไม่พบข้อมูล</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* ✅ สรุปต่อแผนก */}
          <div className="bg-white rounded-xl shadow overflow-hidden mb-6 print:shadow-none">
            <div className="px-4 py-2 font-semibold text-white bg-[#2f3195]">
              สรุปการใช้รถต่อแผนก ({rangeLabel})
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs sm:text-sm min-w-[700px]">
                <thead className="bg-blue-100 text-blue-800">
                  <tr>
                    <th className="p-2 sm:p-3 text-left">แผนก</th>
                    <th className="p-2 sm:p-3 text-right">จำนวนทริป</th>
                    <th className="p-2 sm:p-3 text-right">รวมระยะทาง (กม.)</th>
                    <th className="p-2 sm:p-3 text-right">เวลารวมทั้งหมด</th>
                  </tr>
                </thead>
                <tbody>
                  {byDepartment.map((r) => (
                    <tr key={r.department} className="border-b hover:bg-blue-50">
                      <td className="p-2 sm:p-3">{r.department}</td>
                      <td className="p-2 sm:p-3 text-right">{r.trips.toLocaleString('th-TH')}</td>
                      <td className="p-2 sm:p-3 text-right">{r.totalKm.toLocaleString('th-TH')}</td>
                      <td className="p-2 sm:p-3 text-right">
                        {formatMinutesToReadable(r.totalMinutes)}
                      </td>
                    </tr>
                  ))}
                  {byDepartment.length === 0 && (
                    <tr>
                      <td className="p-3 text-center text-gray-500" colSpan={3}>ไม่พบข้อมูล</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* 🔵 สรุปเวลาการใช้รถ (แบบไม่ใช้เลขไมล์) */}
          <div className="bg-white rounded-xl shadow overflow-hidden mb-6 print:shadow-none">
            <div className="px-4 py-2 font-semibold text-white bg-purple-700">
              สรุปเวลาการใช้รถ (ตามช่วงเวลาที่เลือก) — {rangeLabel}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs sm:text-sm min-w-[700px]">
                <thead className="bg-purple-100 text-purple-800">
                  <tr>
                    <th className="p-2 sm:p-3 text-left">ทะเบียนรถ</th>
                    <th className="p-2 sm:p-3 text-center">จำนวนทริป</th>
                    <th className="p-2 sm:p-3 text-right">เวลารวม</th>
                    <th className="p-2 sm:p-3 text-right">หมายเหตุ</th>
                  </tr>
                </thead>
                <tbody>
                  {aggregatedTime.map((r) => (
                    <tr key={r.plate} className="border-b hover:bg-purple-50">
                      <td className="p-2 sm:p-3">{r.plate}</td>
                      <td className="p-2 sm:p-3 text-center">{r.trips}</td>
                      <td className="p-2 sm:p-3 text-right">
                        {formatMinutesToReadable(r.totalMinutes)}
                      </td>
                      <td className="p-2 sm:p-3 text-right">
                        (คำนวณจากช่วงเวลา — ไม่มีการกรอกเลขไมล์)
                      </td>
                    </tr>
                  ))}
                  {aggregatedTime.length === 0 && (
                    <tr>
                      <td className="p-3 text-center text-gray-500" colSpan={4}>
                        ไม่พบข้อมูล
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* 🔵 สรุปเวลาการใช้รถต่อแผนก (ไม่ใช้เลขไมล์) */}
          <div className="bg-white rounded-xl shadow overflow-hidden mb-6 print:shadow-none">
            <div className="px-4 py-2 font-semibold text-white bg-purple-700">
              สรุปเวลาการใช้รถต่อแผนก (ตามช่วงเวลาเท่านั้น) — {rangeLabel}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs sm:text-sm min-w-[700px]">
                <thead className="bg-purple-100 text-purple-800">
                  <tr>
                    <th className="p-2 sm:p-3 text-left">แผนก</th>
                    <th className="p-2 sm:p-3 text-center">จำนวนทริป</th>
                    <th className="p-2 sm:p-3 text-right">เวลารวมทั้งหมด</th>
                    <th className="p-2 sm:p-3 text-right">หมายเหตุ</th>
                  </tr>
                </thead>
                <tbody>
                  {aggregatedTimeByDept.map((r) => (
                    <tr key={r.department} className="border-b hover:bg-purple-50">
                      <td className="p-2 sm:p-3">{r.department}</td>
                      <td className="p-2 sm:p-3 text-center">
                        {r.trips.toLocaleString('th-TH')}
                      </td>
                      <td className="p-2 sm:p-3 text-right">
                        {formatMinutesToReadable(r.totalMinutes)}
                      </td>
                      <td className="p-2 sm:p-3 text-gray-600 text-right">
                        (คำนวณจากช่วงเวลา — ไม่มีการกรอกเลขไมล์)
                      </td>
                    </tr>
                  ))}

                  {aggregatedTimeByDept.length === 0 && (
                    <tr>
                      <td className="p-3 text-center text-gray-500" colSpan={4}>
                        ไม่พบข้อมูล
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>


          {/* รายการดิบ */}
          <div className="bg-white rounded-xl shadow overflow-hidden print:shadow-none">
            <div className="px-4 py-2 font-semibold text-white bg-gray-600">
              รายการดิบ (แต่ละทริป) ({rangeLabel})
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs sm:text-sm min-w-[700px]">
                <thead className="bg-blue-100 text-blue-800">
                  <tr>
                    <th className="p-2 sm:p-3 text-left">วันที่</th>
                    <th className="p-2 sm:p-3">ทะเบียนรถ</th>
                    <th className="p-2 sm:p-3 text-right">ระยะทาง (กม.)</th>
                  </tr>
                </thead>
                <tbody>
                  {rowsWithMile
                    .sort((a, b) => a.date.localeCompare(b.date))
                    .map((r, idx) => (
                      <tr key={`${r.plate}_${r.date}_${idx}`} className="border-b hover:bg-blue-50">
                        <td className="p-2 sm:p-3 text-left">
                          {format(new Date(r.date), 'dd MMM yyyy', { locale: th })}
                        </td>
                        <td className="p-2 sm:p-3 text-center">{r.plate}</td>
                        <td className="p-2 sm:p-3 text-right">{r.total_mile?.toLocaleString('th-TH')}</td>
                      </tr>
                    ))}
                  {rows.length === 0 && (
                    <tr>
                      <td className="p-3 text-center text-gray-500" colSpan={3}>ไม่พบข้อมูล</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>

        {/* สไตล์สำหรับพิมพ์ */}
        <style jsx global>{`
        @media print {
          nav, button, .react-datepicker, .react-datepicker__tab-loop, .print\\:hidden { display: none !important; }
          main { padding: 0 !important; }
          table { font-size: 12px; }
          .shadow, .shadow-md, .shadow-lg { box-shadow: none !important; }
        }
      `}</style>
      </div>
    </>
  )
}
