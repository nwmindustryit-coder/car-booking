"use client";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Navbar from "@/components/Navbar";

// ✅ 1. เพิ่ม Import สำหรับ format วันที่ (แก้ Error)
import { format } from "date-fns";
import { th } from "date-fns/locale";

import { Bar, Line, Doughnut } from "react-chartjs-2";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler, // ✅ เพิ่ม Filler สำหรับแรเงากราฟเส้น
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler,
);

// ✅ ตั้งค่า Global Options ให้ Tooltip ของทุกกราฟดูพรีเมียม
ChartJS.defaults.font.family = "'Prompt', 'Sarabun', sans-serif"; // รองรับฟอนต์ไทย
ChartJS.defaults.color = "#64748b";

const tooltipOptions = {
  backgroundColor: "rgba(15, 23, 42, 0.9)",
  titleFont: { size: 14, weight: "bold" as const },
  bodyFont: { size: 13 },
  padding: 12,
  cornerRadius: 8,
  displayColors: true,
  boxPadding: 4,
};

// ---------- Format minutes to วัน ชม นาที ----------
function formatDuration(mins: number) {
  if (!mins || mins <= 0) return "0 นาที";
  const days = Math.floor(mins / 1440);
  mins %= 1440;
  const hrs = Math.floor(mins / 60);
  const m = mins % 60;

  const parts = [];
  if (days > 0) parts.push(`${days} วัน`);
  if (hrs > 0) parts.push(`${hrs} ชม`);
  if (m > 0) parts.push(`${m} นาที`);

  return parts.join(" ");
}

export default function DashboardPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [modalData, setModalData] = useState<any[] | null>(null);
  const [modalTitle, setModalTitle] = useState<string>("");

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: bookingsRaw, error: bErr } = await supabase.from("bookings")
        .select(`
                   id, date, time_slot, user_id,
                   cars!inner ( plate ),
                   profiles:user_id ( department )
                `);

      if (bErr) throw bErr;

      const { data: milesData, error: mErr } = await supabase
        .from("miles")
        .select(`booking_id, start_mile, end_mile, total_mile`);

      if (mErr) throw mErr;

      const milesMap = Object.fromEntries(
        (milesData || []).map((m) => [m.booking_id, m]),
      );

      const mapped = (bookingsRaw || []).map((b: any) => {
        const m = milesMap[b.id];

        const carPlate = (() => {
          const c: any = b.cars;
          if (!c) return "-";
          if (Array.isArray(c)) return c[0]?.plate ?? "-";
          return c.plate ?? "-";
        })();

        const dept = (() => {
          const p: any = b.profiles;
          if (!p) return "-";
          if (Array.isArray(p)) return p[0]?.department ?? "-";
          return p.department ?? "-";
        })();

        const km = m ? (m.total_mile ?? m.end_mile - m.start_mile) : 0;
        const mins = parseTimeSlotToMinutes(b.time_slot);

        return {
          id: b.id,
          plate: carPlate,
          date: b.date,
          department: dept,
          time_slot: b.time_slot ?? "",
          km,
          mins,
        };
      });

      setRows(mapped);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  function parseTimeSlotToMinutes(timeSlot: string | null): number {
    if (!timeSlot) return 0;
    const slots = timeSlot.split(",").map((s) => s.trim());
    let total = 0;
    for (const slot of slots) {
      if (slot === "ก่อนเวลางาน" || slot === "หลังเวลางาน") continue;
      const [start, end] = slot.split("-");
      if (!start || !end) continue;
      const [h1, m1] = start.split(":").map(Number);
      const [h2, m2] = end.split(":").map(Number);
      const diff = h2 * 60 + m2 - (h1 * 60 + m1);
      if (diff > 0) total += diff;
    }
    return total;
  }

  useEffect(() => {
    load();
  }, []);

  // ---------- Aggregations ----------
  const aggregated = useMemo(() => {
    const result: Record<
      string,
      { plate: string; trips: number; km: number; mins: number }
    > = {};
    for (const r of rows) {
      if (!result[r.plate])
        result[r.plate] = { plate: r.plate, trips: 0, km: 0, mins: 0 };
      result[r.plate].trips++;
      result[r.plate].km += r.km;
      result[r.plate].mins += r.mins;
    }
    return Object.values(result);
  }, [rows]);

  const byDept = useMemo(() => {
    const map: Record<string, { dept: string; trips: number }> = {};
    for (const r of rows) {
      if (!map[r.department])
        map[r.department] = { dept: r.department, trips: 0 };
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

  const summary = useMemo(() => {
    const monthKeys = [...new Set(rows.map((r) => r.date.slice(0, 7)))]
      .sort()
      .reverse();
    const last2 = monthKeys.slice(0, 2);
    return last2.map((m) => {
      const list = rows.filter((r) => r.date.startsWith(m));
      return {
        month: m,
        trips: list.length,
        km: list.reduce((a, b) => a + b.km, 0),
        mins: list.reduce((a, b) => a + b.mins, 0),
      };
    });
  }, [rows]);

  const today = new Date().toISOString().slice(0, 10);
  const usedPlatesToday = new Set(
    rows.filter((r) => r.date === today).map((r) => r.plate),
  );
  const freeCars = aggregated.filter((c) => !usedPlatesToday.has(c.plate));
  const busyCars = aggregated.filter((c) => usedPlatesToday.has(c.plate));

  const openModalForPlate = (plate: string) => {
    const data = rows.filter((r) => r.plate === plate);
    setModalTitle(`รายละเอียดทะเบียน ${plate}`);
    setModalData(data);
  };

  const openModalForDate = (date: string) => {
    const data = rows.filter((r) => r.date === date);
    setModalTitle(
      `รายละเอียดวันที่ ${format(new Date(date), "dd MMM yyyy", { locale: th })}`,
    );
    setModalData(data);
  };

  if (loading) {
    return (
      <main className="flex flex-col items-center justify-center h-screen text-blue-600 bg-slate-50">
        <svg
          className="animate-spin h-10 w-10 mb-4 text-blue-500"
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
        <p className="text-slate-500 font-medium animate-pulse">
          กำลังประมวลผล Dashboard...
        </p>
      </main>
    );
  }

  return (
    <div className="bg-slate-50 min-h-screen pb-12">
      <Navbar />

      <main className="max-w-7xl mx-auto p-4 sm:p-6 mt-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 tracking-tight mb-8">
          Dashboard การใช้รถองค์กร
        </h1>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-6 border border-red-100 flex items-center">
            <span className="mr-2">⚠️</span> เกิดข้อผิดพลาด: {error}
          </div>
        )}

        {/* KPI CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
          <div className="p-6 rounded-2xl shadow-sm bg-white border border-slate-100 flex flex-col justify-center relative overflow-hidden group hover:border-blue-200 transition-colors">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-blue-50 rounded-full group-hover:scale-110 transition-transform"></div>
            <p className="text-sm font-medium text-slate-500 mb-1 z-10">
              จำนวนทริปทั้งหมด
            </p>
            <p className="text-3xl font-bold text-blue-600 z-10">
              {rows.length.toLocaleString("th-TH")}
            </p>
          </div>

          <div className="p-6 rounded-2xl shadow-sm bg-white border border-slate-100 flex flex-col justify-center relative overflow-hidden group hover:border-indigo-200 transition-colors">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-indigo-50 rounded-full group-hover:scale-110 transition-transform"></div>
            <p className="text-sm font-medium text-slate-500 mb-1 z-10">
              รวมระยะทาง (กม.)
            </p>
            <p className="text-3xl font-bold text-indigo-600 z-10">
              {aggregated.reduce((a, b) => a + b.km, 0).toLocaleString("th-TH")}
            </p>
          </div>

          <div className="p-6 rounded-2xl shadow-sm bg-white border border-slate-100 flex flex-col justify-center relative overflow-hidden group hover:border-emerald-200 transition-colors">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-emerald-50 rounded-full group-hover:scale-110 transition-transform"></div>
            <p className="text-sm font-medium text-slate-500 mb-1 z-10">
              เวลาการใช้งานรวม
            </p>
            <p className="text-2xl font-bold text-emerald-600 z-10 mt-1">
              {formatDuration(aggregated.reduce((a, b) => a + b.mins, 0))}
            </p>
          </div>

          <div className="p-6 rounded-2xl shadow-sm bg-gradient-to-br from-slate-800 to-slate-700 text-white flex flex-col justify-center relative overflow-hidden shadow-slate-200">
            <div className="absolute right-0 bottom-0 w-24 h-24 bg-white opacity-5 rounded-tl-full"></div>
            <p className="text-sm font-medium opacity-80 mb-1 z-10">
              จำนวนรถในระบบ
            </p>
            <p className="text-3xl font-bold z-10">
              {aggregated.length}{" "}
              <span className="text-lg font-normal opacity-80">คัน</span>
            </p>
          </div>
        </div>

        {/* WIDGET CAR AVAILABILITY */}
        <div className="bg-white shadow-sm border border-slate-100 rounded-2xl p-6 mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="font-semibold text-slate-800 text-lg">
              สถานะรถวันนี้
            </h2>
            <p className="text-sm text-slate-500">
              {format(new Date(), "EEEEที่ dd MMMM yyyy", { locale: th })}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <div className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-4 py-2 rounded-xl flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
              <span className="font-semibold">ว่าง {freeCars.length} คัน</span>
            </div>
            <div className="bg-orange-50 text-orange-700 border border-orange-200 px-4 py-2 rounded-xl flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-orange-500"></span>
              <span className="font-semibold">
                ถูกใช้งาน {busyCars.length} คัน
              </span>
            </div>
          </div>
        </div>

        {/* BAR CHARTS */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white p-6 shadow-sm border border-slate-100 rounded-2xl">
            <h2 className="font-semibold mb-4 text-slate-800 text-lg">
              ระยะทางรวมแยกตามทะเบียน (กม.)
            </h2>
            <div className="h-72 w-full">
              <Bar
                data={{
                  labels: aggregated.map((r) => r.plate),
                  datasets: [
                    {
                      label: "ระยะทาง (กม.)",
                      data: aggregated.map((r) => r.km),
                      backgroundColor: "rgba(59, 130, 246, 0.85)",
                      hoverBackgroundColor: "rgba(37, 99, 235, 1)",
                      borderRadius: 6,
                      borderSkipped: false,
                      barPercentage: 0.6,
                    },
                  ],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { display: false },
                    tooltip: tooltipOptions,
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      grid: { color: "#f1f5f9" },
                      border: { display: false },
                    },
                    x: { grid: { display: false }, border: { display: false } },
                  },
                  onClick: (_, elements) => {
                    if (elements.length > 0) {
                      const index = elements[0].index;
                      openModalForPlate(aggregated[index].plate);
                    }
                  },
                }}
              />
            </div>
          </div>

          <div className="bg-white p-6 shadow-sm border border-slate-100 rounded-2xl">
            <h2 className="font-semibold mb-4 text-slate-800 text-lg">
              เวลาการใช้งานแยกตามทะเบียน (นาที)
            </h2>
            <div className="h-72 w-full">
              <Bar
                data={{
                  labels: aggregated.map((r) => r.plate),
                  datasets: [
                    {
                      label: "เวลาใช้งาน (นาที)",
                      data: aggregated.map((r) => r.mins),
                      backgroundColor: "rgba(99, 102, 241, 0.85)",
                      hoverBackgroundColor: "rgba(79, 70, 229, 1)",
                      borderRadius: 6,
                      borderSkipped: false,
                      barPercentage: 0.6,
                    },
                  ],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { display: false },
                    tooltip: tooltipOptions,
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      grid: { color: "#f1f5f9" },
                      border: { display: false },
                    },
                    x: { grid: { display: false }, border: { display: false } },
                  },
                }}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* DOUGHNUT */}
          <div className="bg-white p-6 shadow-sm border border-slate-100 rounded-2xl flex flex-col">
            <h2 className="font-semibold text-slate-800 text-lg mb-2">
              สัดส่วนทริปตามแผนก
            </h2>
            <div className="flex-1 flex justify-center items-center h-72 w-full relative">
              <Doughnut
                data={{
                  labels: byDept.map((d) => d.dept),
                  datasets: [
                    {
                      data: byDept.map((d) => d.trips),
                      backgroundColor: [
                        "#3b82f6",
                        "#6366f1",
                        "#8b5cf6",
                        "#14b8a6",
                        "#0ea5e9",
                        "#cbd5e1",
                      ],
                      borderWidth: 0,
                      hoverOffset: 4,
                    },
                  ],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  cutout: "75%", // รูตรงกลางกว้างขึ้น ดูพรีเมียม
                  plugins: {
                    legend: {
                      position: "bottom",
                      labels: {
                        usePointStyle: true,
                        padding: 20,
                        font: { family: "'Prompt', sans-serif" },
                      },
                    },
                    tooltip: tooltipOptions,
                  },
                }}
              />
              {/* ข้อความตรงกลางโดนัท */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-8">
                <span className="text-3xl font-bold text-slate-800">
                  {rows.length}
                </span>
                <span className="text-xs text-slate-500 uppercase tracking-wider">
                  ทริปรวม
                </span>
              </div>
            </div>
          </div>

          {/* LINE CHART */}
          <div className="bg-white p-6 shadow-sm border border-slate-100 rounded-2xl">
            <h2 className="font-semibold mb-4 text-slate-800 text-lg">
              แนวโน้มจำนวนทริปรายวัน
            </h2>
            <div className="h-72 w-full">
              <Line
                data={{
                  labels: Object.keys(tripsPerDay).map((dateStr) =>
                    format(new Date(dateStr), "dd MMM", { locale: th }),
                  ),
                  datasets: [
                    {
                      label: "จำนวนทริป",
                      data: Object.values(tripsPerDay),
                      borderColor: "#3b82f6",
                      backgroundColor: "rgba(59, 130, 246, 0.15)", // สีแรเงาใต้กราฟ
                      borderWidth: 3,
                      fill: true, // เปิดแรเงา
                      tension: 0.4, // โค้งมน
                      pointRadius: 0, // ซ่อนจุด
                      pointHoverRadius: 6, // ขยายจุดตอนโฮเวอร์
                      pointBackgroundColor: "#ffffff",
                      pointBorderColor: "#3b82f6",
                      pointBorderWidth: 2,
                    },
                  ],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  interaction: { mode: "index", intersect: false }, // โฮเวอร์ง่ายขึ้น
                  plugins: {
                    legend: { display: false },
                    tooltip: tooltipOptions,
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      grid: { color: "#f1f5f9" },
                      border: { display: false },
                      ticks: { stepSize: 1, padding: 10 },
                    },
                    x: {
                      grid: { display: false },
                      border: { display: false },
                      ticks: { padding: 10 },
                    },
                  },
                  onClick: (_, elements) => {
                    if (elements.length > 0) {
                      const index = elements[0].index;
                      const d = Object.keys(tripsPerDay)[index];
                      openModalForDate(d);
                    }
                  },
                }}
              />
            </div>
          </div>
        </div>

        {/* MONTHLY SUMMARY (2 months) */}
        <div className="bg-white p-6 shadow-sm border border-slate-100 rounded-2xl">
          <h2 className="font-semibold mb-4 text-slate-800 text-lg">
            สรุปสถิติ 2 เดือนล่าสุด
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {summary.map((m) => {
              const [year, month] = m.month.split("-");
              const monthName = format(
                new Date(Number(year), Number(month) - 1),
                "MMMM yyyy",
                { locale: th },
              );

              return (
                <div
                  key={m.month}
                  className="bg-slate-50 border border-slate-100 rounded-xl p-5"
                >
                  <h3 className="font-bold text-lg text-indigo-700 mb-4 pb-2 border-b border-slate-200">
                    เดือน {monthName}
                  </h3>
                  <div className="space-y-3 text-slate-700">
                    <div className="flex justify-between items-center">
                      <span className="flex items-center gap-2">
                        <span className="p-1.5 bg-blue-100 text-blue-600 rounded-lg">
                          🚘
                        </span>{" "}
                        จำนวนทริป
                      </span>
                      <span className="font-semibold">{m.trips} ครั้ง</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="flex items-center gap-2">
                        <span className="p-1.5 bg-emerald-100 text-emerald-600 rounded-lg">
                          🛣️
                        </span>{" "}
                        รวมระยะทาง
                      </span>
                      <span className="font-semibold">
                        {m.km.toLocaleString("th-TH")} กม.
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="flex items-center gap-2">
                        <span className="p-1.5 bg-orange-100 text-orange-600 rounded-lg">
                          ⏱️
                        </span>{" "}
                        เวลาใช้งาน
                      </span>
                      <span className="font-semibold">
                        {formatDuration(m.mins)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* MODAL (Drill Down) */}
        {modalData && (
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setModalData(null)}
          >
            <div
              className="bg-white p-0 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                <h3 className="text-lg font-bold text-slate-800">
                  {modalTitle}
                </h3>
                <button
                  className="text-slate-400 hover:text-slate-600 p-1 bg-slate-100 rounded-full"
                  onClick={() => setModalData(null)}
                >
                  ✕
                </button>
              </div>

              <div className="overflow-y-auto flex-1 p-6">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-slate-500">
                    <tr className="text-left">
                      <th className="p-3 font-medium rounded-l-lg border-b border-slate-200">
                        วันที่
                      </th>
                      <th className="p-3 font-medium border-b border-slate-200">
                        แผนก
                      </th>
                      <th className="p-3 font-medium text-right border-b border-slate-200">
                        ไมล์
                      </th>
                      <th className="p-3 font-medium text-right rounded-r-lg border-b border-slate-200">
                        เวลา
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {modalData.map((r: any, i: number) => (
                      <tr
                        key={i}
                        className="hover:bg-blue-50/50 transition-colors"
                      >
                        <td className="p-3 text-slate-700">
                          {format(new Date(r.date), "dd MMM yy", {
                            locale: th,
                          })}
                        </td>
                        <td className="p-3 text-slate-700 font-medium">
                          {r.department}
                        </td>
                        <td className="p-3 text-right text-slate-600">
                          {r.km.toLocaleString()} กม.
                        </td>
                        <td className="p-3 text-right text-slate-600">
                          {formatDuration(r.mins)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
