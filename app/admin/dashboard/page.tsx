'use client'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import Navbar from '@/components/Navbar'
import {
    Bar,
    Line,
    Doughnut,
} from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Tooltip, Legend } from 'chart.js'
import { format } from 'date-fns'
import { th } from 'date-fns/locale'
import 'react-datepicker/dist/react-datepicker.css'

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Tooltip, Legend)

type Row = {
    plate: string
    date: string
    total_mile: number
    department: string
    time_slot?: string
}

export default function DashboardPage() {
    const [rows, setRows] = useState<Row[]>([])
    const [error, setError] = useState<string | null>(null)

    const load = async () => {
        setError(null)
        try {
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

            if (bErr) throw bErr

            const { data: milesData, error: mErr } = await supabase
                .from('miles')
                .select(`booking_id, start_mile, end_mile, total_mile`)

            if (mErr) throw mErr

            const milesMap = Object.fromEntries(
                (milesData || []).map(m => [m.booking_id, m])
            )

            const mapped = (bookingsRaw || []).map(b => {
                const m = milesMap[b.id] || null

                // ปลอดภัย 100%
                const carPlate = (() => {
                    if (!b.cars) return '-'
                    if (Array.isArray(b.cars)) return b.cars[0]?.plate ?? '-'
                    return b.cars.plate ?? '-'
                })()

                const dept = (() => {
                    if (!b.profiles) return '-'
                    if (Array.isArray(b.profiles)) return b.profiles[0]?.department ?? '-'
                    return b.profiles.department ?? '-'
                })()

                return {
                    plate: carPlate,
                    date: b.date,
                    department: dept,
                    time_slot: b.time_slot ?? '',
                    total_mile: m ? (m.total_mile ?? (m.end_mile - m.start_mile)) : 0,
                }
            })



            setRows(mapped)
        } catch (e: any) {
            setError(e.message)
        }
    }

    useEffect(() => {
        load()
    }, [])

    const aggregated = useMemo(() => {
        const result: Record<string, { plate: string; trips: number; km: number }> = {}
        for (const r of rows) {
            if (!result[r.plate]) result[r.plate] = { plate: r.plate, trips: 0, km: 0 }
            result[r.plate].trips++
            result[r.plate].km += r.total_mile || 0
        }
        return Object.values(result)
    }, [rows])

    const byDept = useMemo(() => {
        const map: Record<string, { dept: string; trips: number }> = {}
        for (const r of rows) {
            if (!map[r.department]) map[r.department] = { dept: r.department, trips: 0 }
            map[r.department].trips++
        }
        return Object.values(map)
    }, [rows])

    const tripsPerDay = useMemo(() => {
        const map: Record<string, number> = {}
        for (const r of rows) {
            const d = r.date
            if (!map[d]) map[d] = 0
            map[d]++
        }
        return map
    }, [rows])

    return (
        <div className="p-4">
            <Navbar />
            <main className="max-w-6xl mx-auto p-4">

                <h1 className="text-2xl sm:text-3xl font-bold text-[#2f3195] mb-6">
                    Dashboard การใช้รถ (Corporate)
                </h1>

                {/* KPI CARDS */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">

                    <div className="p-5 rounded-xl shadow bg-gradient-to-br from-[#2f3195] to-[#3b82f6] text-white">
                        <p className="text-sm opacity-80">จำนวนทริปทั้งหมด</p>
                        <p className="text-3xl font-bold">{rows.length.toLocaleString('th-TH')}</p>
                    </div>

                    <div className="p-5 rounded-xl shadow bg-gradient-to-br from-[#3b82f6] to-blue-400 text-white">
                        <p className="text-sm opacity-80">รวมระยะทาง (กม.)</p>
                        <p className="text-3xl font-bold">
                            {aggregated.reduce((a, b) => a + b.km, 0).toLocaleString('th-TH')}
                        </p>
                    </div>

                    <div className="p-5 rounded-xl shadow bg-gradient-to-br from-blue-400 to-blue-300 text-white">
                        <p className="text-sm opacity-80">จำนวนทะเบียนที่ใช้</p>
                        <p className="text-3xl font-bold">{aggregated.length}</p>
                    </div>

                    <div className="p-5 rounded-xl shadow bg-gradient-to-br from-indigo-500 to-indigo-300 text-white">
                        <p className="text-sm opacity-80">จำนวนแผนกที่ใช้รถ</p>
                        <p className="text-3xl font-bold">{byDept.length}</p>
                    </div>

                </div>

                {/* GRAPH ROW */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">

                    {/* BAR: ระยะทางต่อทะเบียน */}
                    <div className="bg-white p-5 shadow rounded-xl">
                        <h2 className="font-semibold mb-3 text-[#2f3195]">ระยะทางรวมต่อทะเบียน</h2>
                        <Bar
                            data={{
                                labels: aggregated.map(r => r.plate),
                                datasets: [{
                                    label: 'กิโลเมตร',
                                    data: aggregated.map(r => r.km),
                                    backgroundColor: '#2f3195',
                                }]
                            }}
                        />
                    </div>

                    {/* PIE: การใช้รถตามแผนก */}
                    <div className="bg-white p-5 shadow rounded-xl">
                        <h2 className="font-semibold mb-3 text-[#2f3195]">การใช้รถตามแผนก</h2>
                        <Doughnut
                            data={{
                                labels: byDept.map(d => d.dept),
                                datasets: [{
                                    label: 'ทริป',
                                    data: byDept.map(d => d.trips),
                                    backgroundColor: ['#2f3195', '#3b82f6', '#60a5fa', '#93c5fd'],
                                }]
                            }}
                        />
                    </div>

                </div>

                {/* GRAPH 2 */}
                <div className="bg-white p-5 shadow rounded-xl mb-10">
                    <h2 className="font-semibold mb-3 text-[#2f3195]">จำนวนทริปต่อวัน</h2>
                    <Line
                        data={{
                            labels: Object.keys(tripsPerDay),
                            datasets: [{
                                label: 'จำนวนทริป',
                                data: Object.values(tripsPerDay),
                                borderColor: '#2f3195',
                                fill: false,
                                tension: 0.3,
                            }]
                        }}
                    />
                </div>

                {/* SUMMARY TABLE */}
                <div className="bg-white p-5 shadow rounded-xl mb-10">
                    <h2 className="font-semibold mb-4 text-[#2f3195]">รถที่ถูกใช้มากที่สุด</h2>
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-left bg-blue-100 text-[#2f3195]">
                                <th className="p-2">ทะเบียน</th>
                                <th className="p-2">ทริป</th>
                                <th className="p-2">ระยะทางรวม</th>
                            </tr>
                        </thead>
                        <tbody>
                            {aggregated
                                .sort((a, b) => b.trips - a.trips)
                                .slice(0, 5)
                                .map(r => (
                                    <tr key={r.plate} className="border-b">
                                        <td className="p-2">{r.plate}</td>
                                        <td className="p-2">{r.trips}</td>
                                        <td className="p-2">{r.km.toLocaleString('th-TH')}</td>
                                    </tr>
                                ))}
                        </tbody>
                    </table>
                </div>

            </main>
        </div>
    )
}
