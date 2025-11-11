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

  // โหลดข้อมูลตาม filter
  const load = async () => {
    setError(null)
    setLoading(true)
    try {
      // คิดช่วงวันที่จาก mode
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

      // ดึงข้อมูลจาก Supabase:
      // miles -> (booking_id) -> bookings.date + cars.plate
      // เลือกเฉพาะ record ที่มีการบันทึกไมล์ (total_mile อาจเป็น null ถ้าไม่ได้บันทึก)
      const { data, error } = await supabase
        .from('miles')
        .select(`
    total_mile,
    bookings!inner (
      date,
      user_id,
      cars!inner ( plate ),
      profiles:user_id (
        department
      )
    )
  `)
        .gte('bookings.date', from)
        .lte('bookings.date', to)


      if (error) throw error

      const mapped: Row[] = (data || []).map((r: any) => ({
        plate: r.bookings?.cars?.plate ?? '-',
        date: r.bookings?.date ?? '',
        total_mile: Number(r.total_mile ?? (r.end_mile ?? 0) - (r.start_mile ?? 0)),
        department: r.bookings?.profiles?.department ?? '-',
      }))


      setRows(mapped)
    } catch (e: any) {
      setError(e?.message ?? 'โหลดข้อมูลล้มเหลว')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])


  // สรุปผลรวมต่อทะเบียน
  const aggregated: AggRow[] = useMemo(() => {
    const byPlate: Record<string, AggRow> = {}
    for (const r of rows) {
      if (!byPlate[r.plate]) byPlate[r.plate] = { plate: r.plate, trips: 0, totalKm: 0 }
      byPlate[r.plate].trips += 1
      byPlate[r.plate].totalKm += Number.isFinite(r.total_mile) ? r.total_mile : 0
    }
    return Object.values(byPlate).sort((a, b) => a.plate.localeCompare(b.plate, 'th'))
  }, [rows])

  const byDepartment = useMemo(() => {
    const dep: Record<string, { department: string; trips: number; totalKm: number }> = {}
    for (const r of rows) {
      const key = r.department || '-'
      if (!dep[key]) dep[key] = { department: key, trips: 0, totalKm: 0 }
      dep[key].trips += 1
      dep[key].totalKm += Number.isFinite(r.total_mile) ? r.total_mile : 0
    }
    return Object.values(dep).sort((a, b) => a.department.localeCompare(b.department, 'th'))
  }, [rows])


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
    // ✅ 1. สร้าง workbook ก่อน
    const wb = XLSX.utils.book_new()

    // ✅ 2. เตรียม sheet1: สรุปต่อทะเบียน
    const sheet1 = aggregated.map(a => ({
      'ทะเบียนรถ': a.plate,
      'จำนวนครั้งที่ใช้ (ทริป)': a.trips,
      'รวมระยะทาง (กม.)': a.totalKm,
    }))
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sheet1), 'สรุปต่อทะเบียน')

    // ✅ 3. เตรียม sheet2: รายการดิบ
    const sheet2 = rows.map(r => ({
      'วันที่': r.date,
      'ทะเบียนรถ': r.plate,
      'ระยะทาง (กม.)': r.total_mile,
    }))
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sheet2), 'รายการดิบ')

    // ✅ 4. ถ้ามี byDepartment → เพิ่ม sheet3
    const sheet3 = byDepartment.map(d => ({
      'แผนก': d.department,
      'จำนวนครั้งที่ใช้ (ทริป)': d.trips,
      'รวมระยะทาง (กม.)': d.totalKm,
    }))
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sheet3), 'สรุปต่อแผนก')

    // ✅ 5. แปลงและดาวน์โหลดไฟล์
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
                  </tr>
                </thead>
                <tbody>
                  {byDepartment.map((r) => (
                    <tr key={r.department} className="border-b hover:bg-blue-50">
                      <td className="p-2 sm:p-3">{r.department}</td>
                      <td className="p-2 sm:p-3 text-right">{r.trips.toLocaleString('th-TH')}</td>
                      <td className="p-2 sm:p-3 text-right">{r.totalKm.toLocaleString('th-TH')}</td>
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
                  {rows
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
