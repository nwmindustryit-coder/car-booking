'use client';
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Navbar from '@/components/Navbar';

import {
    Bar,
    Line,
    Doughnut
} from 'react-chartjs-2';

import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    LineElement,
    PointElement,
    ArcElement,
    Tooltip,
    Legend
} from 'chart.js';

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    LineElement,
    PointElement,
    ArcElement,
    Tooltip,
    Legend
);

// ---------- Time Slot Mapping ----------
const TIME_SLOTS: Record<string, number> = {
    'ก่อนเวลางาน': 0,
    'หลังเวลางาน': 0,
    '08:00-09:00': 60,
    '09:01-10:00': 59,
    '10:01-11:00': 59,
    '11:01-12:00': 59,
    '13:00-14:00': 60,
    '14:01-15:00': 59,
    '15:01-16:00': 59,
    '16:01-17:00': 59,
};

// ---------- Format minutes to วัน ชม นาที ----------
function formatDuration(mins: number) {
    if (!mins || mins <= 0) return '0 นาที';
    const days = Math.floor(mins / 1440);
    mins %= 1440;
    const hrs = Math.floor(mins / 60);
    const m = mins % 60;

    const parts = [];
    if (days > 0) parts.push(`${days} วัน`);
    if (hrs > 0) parts.push(`${hrs} ชม`);
    if (m > 0) parts.push(`${m} นาที`);

    return parts.join(' ');
}

export default function DashboardPage() {
    const [rows, setRows] = useState<any[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [modalData, setModalData] = useState<any[] | null>(null);
    const [modalTitle, setModalTitle] = useState<string>('');

    const load = async () => {
        setError(null);
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
        `);

            if (bErr) throw bErr;

            const { data: milesData, error: mErr } = await supabase
                .from('miles')
                .select(`booking_id, start_mile, end_mile, total_mile`);

            if (mErr) throw mErr;

            const milesMap = Object.fromEntries(
                (milesData || []).map(m => [m.booking_id, m])
            );

            const mapped = (bookingsRaw || []).map((b: any) => {
                const m = milesMap[b.id];

                const carPlate = (() => {
                    const c: any = b.cars;
                    if (!c) return '-';
                    if (Array.isArray(c)) return c[0]?.plate ?? '-';
                    return c.plate ?? '-';
                })();

                const dept = (() => {
                    const p: any = b.profiles;
                    if (!p) return '-';
                    if (Array.isArray(p)) return p[0]?.department ?? '-';
                    return p.department ?? '-';
                })();

                const km = m ? (m.total_mile ?? (m.end_mile - m.start_mile)) : 0;
                const mins = parseTimeSlotToMinutes(b.time_slot);

                return {
                    id: b.id,
                    plate: carPlate,
                    date: b.date,
                    department: dept,
                    time_slot: b.time_slot ?? '',
                    km,
                    mins,
                };
            });

            setRows(mapped);
        } catch (e: any) {
            setError(e.message);
        }
    };

    function parseTimeSlotToMinutes(timeSlot: string | null): number {
        if (!timeSlot) return 0;

        // คุ้มกันกรณีพิเศษ
        if (timeSlot.includes('ก่อนเวลา')) return 0;
        if (timeSlot.includes('หลังเวลา')) return 0;

        const slots = timeSlot.split(',').map(s => s.trim());
        let total = 0;

        for (const slot of slots) {
            const [start, end] = slot.split('-');
            if (!start || !end) continue;

            const [h1, m1] = start.split(':').map(Number);
            const [h2, m2] = end.split(':').map(Number);

            const diff = (h2 * 60 + m2) - (h1 * 60 + m1);
            if (diff > 0) total += diff;
        }

        return total;
    }


    const monthKeys = [...new Set(rows.map(r => r.date.slice(0, 7)))]
        .sort()   // "2025-01", "2025-02", ... test
        .reverse(); // เอาใหม่สุดก่อน

    const last2 = monthKeys.slice(0, 2);  // [ล่าสุด, ก่อนหน้า]

    const summary = last2.map(m => {
        const list = rows.filter(r => r.date.startsWith(m));
        return {
            month: m,
            trips: list.length,
            km: list.reduce((a, b) => a + b.km, 0),
            mins: list.reduce((a, b) => a + b.mins, 0)
        };
    });



    useEffect(() => {
        load();
    }, []);

    // ---------- Aggregations ----------
    const aggregated = useMemo(() => {
        const result: Record<string, { plate: string; trips: number; km: number; mins: number }> = {};
        for (const r of rows) {
            if (!result[r.plate]) result[r.plate] = { plate: r.plate, trips: 0, km: 0, mins: 0 };
            result[r.plate].trips++;
            result[r.plate].km += r.km;
            result[r.plate].mins += r.mins;
        }
        return Object.values(result);
    }, [rows]);

    const byDept = useMemo(() => {
        const map: Record<string, { dept: string; trips: number }> = {};
        for (const r of rows) {
            if (!map[r.department]) map[r.department] = { dept: r.department, trips: 0 };
            map[r.department].trips++;
        }
        return Object.values(map);
    }, [rows]);

    const tripsPerDay = useMemo(() => {
        const map: Record<string, number> = {};
        for (const r of rows) {
            if (!map[r.date]) map[r.date] = 0;
            map[r.date]++;
        }
        return map;
    }, [rows]);

    const usageTimePerDay = useMemo(() => {
        const map: Record<string, number> = {};
        for (const r of rows) {
            map[r.date] = (map[r.date] || 0) + r.mins;
        }
        return map;
    }, [rows]);

    // ---------- Car Availability Widget ----------
    const today = new Date().toISOString().slice(0, 10);
    const usedPlatesToday = new Set(rows.filter(r => r.date === today).map(r => r.plate));

    const freeCars = aggregated.filter(c => !usedPlatesToday.has(c.plate));
    const busyCars = aggregated.filter(c => usedPlatesToday.has(c.plate));

    // ---------- Monthly Summary ----------
    const latestMonth = useMemo(() => {
        if (rows.length === 0) return null;
        const sorted = [...rows].sort((a, b) => a.date.localeCompare(b.date));
        const last = sorted[sorted.length - 1].date.slice(0, 7);
        return last; // "2025-01"
    }, [rows]);

    const monthlyRows = useMemo(() => {
        if (!latestMonth) return [];
        return rows.filter(r => r.date.startsWith(latestMonth));
    }, [rows, latestMonth]);

    const monthlySummary = {
        trips: monthlyRows.length,
        km: monthlyRows.reduce((a, b) => a + b.km, 0),
        mins: monthlyRows.reduce((a, b) => a + b.mins, 0),
    };

    // ---------- Drill Down ----------
    const openModalForPlate = (plate: string) => {
        const data = rows.filter(r => r.plate === plate);
        setModalTitle(`รายละเอียดทะเบียน ${plate}`);
        setModalData(data);
    };

    const openModalForDate = (date: string) => {
        const data = rows.filter(r => r.date === date);
        setModalTitle(`รายละเอียดวันที่ ${date}`);
        setModalData(data);
    };

    return (
        <div className="p-4">
            <Navbar />

            <main className="max-w-7xl mx-auto p-4">
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

                    <div className="p-5 rounded-xl shadow bg-gradient-to-br from-indigo-500 to-indigo-300 text-white">
                        <p className="text-sm opacity-80">เวลาการใช้งานรวม</p>
                        <p className="text-xl font-bold">{formatDuration(aggregated.reduce((a, b) => a + b.mins, 0))}</p>
                    </div>

                    <div className="p-5 rounded-xl shadow bg-gradient-to-br from-blue-500 to-blue-300 text-white">
                        <p className="text-sm opacity-80">จำนวนทะเบียนทั้งหมด</p>
                        <p className="text-3xl font-bold">{aggregated.length}</p>
                    </div>
                </div>

                {/* WIDGET CAR AVAILABILITY */}
                <div className="bg-white shadow rounded-xl p-5 mb-10">
                    <h2 className="font-semibold text-[#2f3195] mb-3">สถานะรถวันนี้</h2>
                    <p>รถไม่ว่าง: {busyCars.length} คัน</p>
                    <p>รถว่าง: {freeCars.length} คัน</p>
                </div>

                {/* BAR: mileage per plate */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
                    <div className="bg-white p-5 shadow rounded-xl">
                        <h2 className="font-semibold mb-3 text-[#2f3195]">ระยะทางรวมต่อทะเบียน</h2>
                        <Bar
                            data={{
                                labels: aggregated.map(r => r.plate),
                                datasets: [{
                                    label: 'กม.',
                                    data: aggregated.map(r => r.km),
                                    backgroundColor: '#2f3195',
                                }]
                            }}
                            options={{
                                onClick: (_, elements) => {
                                    if (elements.length > 0) {
                                        const index = elements[0].index;
                                        openModalForPlate(aggregated[index].plate);
                                    }
                                }
                            }}
                        />
                    </div>

                    {/* BAR: usage time per plate */}
                    <div className="bg-white p-5 shadow rounded-xl">
                        <h2 className="font-semibold mb-3 text-[#2f3195]">เวลาการใช้งานรถ (นาที)</h2>
                        <Bar
                            data={{
                                labels: aggregated.map(r => r.plate),
                                datasets: [{
                                    label: 'นาที',
                                    data: aggregated.map(r => r.mins),
                                    backgroundColor: '#3b82f6',
                                }]
                            }}
                        />
                    </div>
                </div>

                {/* DOUGHNUT */}
                <div className="bg-white p-5 shadow rounded-xl mb-10">
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

                {/* LINE CHART */}
                <div className="bg-white p-5 shadow rounded-xl mb-10">
                    <h2 className="font-semibold mb-3 text-[#2f3195]">จำนวนทริปต่อวัน</h2>
                    <Line
                        data={{
                            labels: Object.keys(tripsPerDay),
                            datasets: [{
                                label: 'ทริป',
                                data: Object.values(tripsPerDay),
                                borderColor: '#2f3195',
                                fill: false,
                                tension: 0.3,
                            }]
                        }}
                        options={{
                            onClick: (_, elements) => {
                                if (elements.length > 0) {
                                    const index = elements[0].index;
                                    const d = Object.keys(tripsPerDay)[index];
                                    openModalForDate(d);
                                }
                            }
                        }}
                    />
                </div>

                {/* MONTHLY SUMMARY (2 months) */}
                <div className="bg-white p-5 shadow rounded-xl mb-10">
                    <h2 className="font-semibold mb-4 text-[#2f3195]">สรุป 2 เดือนล่าสุด</h2>

                    {summary.map((m) => (
                        <div key={m.month} className="mb-4 border-b pb-3">
                            <h3 className="font-bold text-lg text-[#2f3195]">
                                เดือน {m.month}
                            </h3>
                            <p>จำนวนทริป: {m.trips}</p>
                            <p>รวมกิโลเมตร: {m.km.toLocaleString('th-TH')}</p>
                            <p>เวลาการใช้งานรวม: {formatDuration(m.mins)}</p>
                        </div>
                    ))}
                </div>


                {/* MODAL */}
                {modalData && (
                    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
                        <div className="bg-white p-6 rounded-xl shadow-xl max-w-lg w-full">
                            <h3 className="text-xl font-semibold mb-4">{modalTitle}</h3>

                            <table className="w-full text-sm mb-4">
                                <thead>
                                    <tr className="text-left bg-blue-100 text-[#2f3195]">
                                        <th className="p-2">วันที่</th>
                                        <th className="p-2">แผนก</th>
                                        <th className="p-2">ไมล์</th>
                                        <th className="p-2">เวลา</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {modalData.map((r: any, i: number) => (
                                        <tr key={i} className="border-b">
                                            <td className="p-2">{r.date}</td>
                                            <td className="p-2">{r.department}</td>
                                            <td className="p-2">{r.km} กม.</td>
                                            <td className="p-2">{formatDuration(r.mins)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            <button
                                className="mt-2 px-4 py-2 bg-[#2f3195] text-white rounded-lg"
                                onClick={() => setModalData(null)}
                            >
                                ปิด
                            </button>
                        </div>
                    </div>
                )}

            </main>
        </div>
    );
}
