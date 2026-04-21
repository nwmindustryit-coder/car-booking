"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { Printer, ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import { th } from "date-fns/locale";

const RATE_PER_KM = 5;
const ADMIN_EMAILS = ["theeraphat@nawamit.com"];

type MileageRow = {
  id: string;
  user_id: string;
  date: string;
  location: string;
  start_mile: number;
  end_mile: number;
  remark: string | null;
  distance?: number | null;
  amount?: number | null;
  employee_name?: string | null;
};

type User = {
  id: string;
  email?: string;
};

export default function PrivateMileageReportPage() {
  const [user, setUser] = useState<User | null>(null);
  const [rows, setRows] = useState<MileageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<"range" | "month" | "year" | "select">("range");

  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);

  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const router = useRouter();

  const isAdmin = useMemo(
    () => !!user?.email && ADMIN_EMAILS.includes(user.email),
    [user]
  );

  // ✅ 1. โหลดข้อมูล (useEffect)
  useEffect(() => {
    const load = async () => {
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr || !userData.user) {
        router.push("/login");
        return;
      }
      const u: User = {
        id: userData.user.id,
        email: userData.user.email ?? undefined,
      };
      setUser(u);

      let query = supabase
        .from("mileages")
        .select("*")
        .order("date", { ascending: true })
        .order("created_at", { ascending: true });

      if (!ADMIN_EMAILS.includes(userData.user.email ?? "")) {
        query = query.eq("user_id", userData.user.id);
      }

      const { data, error } = await query;
      if (error) {
        console.error("Error load mileages for report:", error);
        setRows([]);
      } else {
        setRows(data || []);
      }
      setLoading(false);
    };

    load();
  }, [router]);

  // ✅ 2. Filter ข้อมูล (Hooks ต้องอยู่ข้างนอกสุด)
  const filteredRows = useMemo(() => {
    if (filterType === "range" && startDate && endDate) {
      return rows.filter((r) => {
        const d = new Date(r.date);
        // ทำให้ endDate ครอบคลุมไปถึงเวลา 23:59:59 ของวันนั้นด้วย
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        return d >= startDate && d <= end;
      });
    }

    if (filterType === "month") {
      return rows.filter((r) => {
        const d = new Date(r.date);
        return d.getMonth() + 1 === selectedMonth && d.getFullYear() === selectedYear;
      });
    }

    if (filterType === "year") {
      return rows.filter((r) => {
        const d = new Date(r.date);
        return d.getFullYear() === selectedYear;
      });
    }

    if (filterType === "select") {
      return rows;
    }

    return rows;
  }, [rows, filterType, startDate, endDate, selectedMonth, selectedYear]);

  // ✅ 3. คำนวณแถวที่จะพิมพ์ และ ยอดรวม
  const printRows = useMemo(() => {
    if (filterType === "select") {
      return rows.filter((r) => selectedIds.includes(r.id));
    }
    return filteredRows;
  }, [filterType, rows, filteredRows, selectedIds]);

  const totalPrintAmount = useMemo(() => {
    return printRows.reduce((sum, r) => {
      if (!r) return sum;
      const distance = r.distance ?? r.end_mile - r.start_mile;
      const amount = r.amount ?? distance * RATE_PER_KM;
      return sum + amount;
    }, 0);
  }, [printRows]);

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  if (loading) {
    return (
      <main className="flex flex-col items-center justify-center h-screen text-blue-600">
        <svg className="animate-spin h-8 w-8 mb-3 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
        </svg>
        <p className="text-gray-500 animate-pulse">กำลังโหลดรายงาน...</p>
      </main>
    );
  }

  return (
    <main className="p-4 md:p-6 max-w-5xl mx-auto print:max-w-none print:p-0">
      {/* แถบปุ่มบนสุด (ซ่อนเวลา print) */}
      <div className="flex justify-between items-center mb-4 print:hidden">
        <div className="border p-4 rounded-md mb-4 w-full">
          <div>
            <h1 className="text-xl font-semibold text-slate-800">รายงานคำนวณค่า Mileage</h1>
            <p className="text-xs text-slate-500">อัตรา {RATE_PER_KM.toLocaleString()} บาท / 1 กม.</p>
          </div>

          <p className="font-medium mb-2 mt-4">ตัวเลือกการออกรายงาน</p>

          <div className="print:hidden space-y-4 mb-4">
            <div className="flex justify-between items-center">
              <Button variant="outline" onClick={() => router.push("/private-mile")} className="flex items-center gap-2">
                <ArrowLeft className="w-4 h-4" /> กลับหน้าบันทึกเลขไมล์
              </Button>
              <Button onClick={handlePrint} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
                <Printer className="w-4 h-4" /> พิมพ์รายงาน
              </Button>
            </div>

            {/* กล่องฟิลเตอร์ */}
            <div className="border p-4 rounded-lg bg-white shadow-sm">
              <div className="space-y-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" checked={filterType === "range"} onChange={() => setFilterType("range")} />
                  ช่วงวันที่
                </label>
                {filterType === "range" && (
                  <div className="flex gap-2 ml-6">
                    <DatePicker
                      selected={startDate}
                      onChange={(date: Date | null) => setStartDate(date)}
                      dateFormat="dd/MM/yyyy"
                      className="border px-2 py-1 rounded-md text-sm"
                      placeholderText="วันเริ่มต้น"
                    />
                    <span>ถึง</span>
                    <DatePicker
                      selected={endDate}
                      onChange={(date: Date | null) => setEndDate(date)}
                      dateFormat="dd/MM/yyyy"
                      className="border px-2 py-1 rounded-md text-sm"
                      placeholderText="วันสิ้นสุด"
                    />
                  </div>
                )}

                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" checked={filterType === "month"} onChange={() => setFilterType("month")} />
                  เลือกเดือน
                </label>
                {filterType === "month" && (
                  <div className="flex gap-2 ml-6">
                    <select value={selectedMonth} onChange={(e) => setSelectedMonth(Number(e.target.value))} className="border p-1 rounded text-sm">
                      {[...Array(12)].map((_, i) => (
                        <option key={i} value={i + 1}>{i + 1}</option>
                      ))}
                    </select>
                    <select value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))} className="border p-1 rounded text-sm">
                      {[2023, 2024, 2025, 2026].map((y) => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>
                )}

                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" checked={filterType === "year"} onChange={() => setFilterType("year")} />
                  เลือกปี
                </label>
                {filterType === "year" && (
                  <div className="ml-6">
                    <select value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))} className="border p-1 rounded text-sm">
                      {[2023, 2024, 2025, 2026].map((y) => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div id="print-area">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 md:p-6 print:shadow-none print:border-none print:rounded-none">
          <header className="flex flex-col gap-3 border-b border-slate-200 pb-4 mb-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="h-14 w-14 rounded-full overflow-hidden border border-slate-200 flex items-center justify-center">
                  <img src="/images/logo1.jpeg" alt="Company Logo" className="h-full w-full object-cover" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-slate-800">NWM.INDUSTRY Co.,Ltd</h2>
                  <p className="text-xs text-slate-500">บริษัท นวมิตร อุตสาหกรรม จำกัด</p>
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
                ชื่อพนักงาน: <span className="font-semibold">{printRows.length > 0 ? printRows[0].employee_name : "-"}</span>
              </p>
              {isAdmin && <p className="text-amber-700">ผู้ดูแลระบบ (ดูข้อมูลพนักงานหลายคนได้)</p>}
            </div>
          </header>

          <section className="mb-6">
            <div className="overflow-x-auto">
              <table className="w-full text-xs border border-slate-300 border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-700">
                    {filterType === "select" && <th className="border border-slate-300 px-1 py-1 w-6 print:hidden">เลือก</th>}
                    <th className="border border-slate-300 px-1 py-1 w-8">#</th>
                    <th className="border border-slate-300 px-1 py-1 w-20">วันที่</th>
                    <th className="border border-slate-300 px-1 py-1 min-w-[120px]">สถานที่</th>
                    <th className="border border-slate-300 px-1 py-1 w-16">เริ่มต้น</th>
                    <th className="border border-slate-300 px-1 py-1 w-16">สิ้นสุด</th>
                    <th className="border border-slate-300 px-1 py-1 w-16">จำนวน(กม.)</th>
                    <th className="border border-slate-300 px-1 py-1 min-w-[120px]">เหตุผล</th>
                    <th className="border border-slate-300 px-1 py-1 w-16">ยอด(บาท)</th>
                  </tr>
                </thead>

                <tbody>
                  {(() => {
                    const MAX_ROWS = 20;
                    const filled = [...printRows];
                    while (filled.length < MAX_ROWS) filled.push(null as any);

                    return (
                      <>
                        {filled.map((r, idx) => {
                          if (!r) {
                            return (
                              <tr key={`empty-${idx}`} className="h-6">
                                {filterType === "select" && <td className="border border-slate-300 w-6 print:hidden"></td>}
                                <td className="border border-slate-300 text-center text-slate-400">{idx + 1}</td>
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

                          const d = new Date(r.date);
                          const distance = r.distance ?? r.end_mile - r.start_mile;
                          const amount = r.amount ?? distance * RATE_PER_KM;
                          const isChecked = selectedIds.includes(r.id);

                          return (
                            <tr key={r.id}>
                              {filterType === "select" && (
                                <td className="border border-slate-300 text-center w-6 print:hidden">
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => {
                                      setSelectedIds((prev) =>
                                        isChecked ? prev.filter((id) => id !== r.id) : [...prev, r.id]
                                      );
                                    }}
                                  />
                                </td>
                              )}
                              <td className="border border-slate-300 text-center text-slate-700">{idx + 1}</td>
                              <td className="border border-slate-300 text-center">{format(d, "dd/MM/yyyy", { locale: th })}</td>
                              <td className="border border-slate-300 px-2 whitespace-normal break-words">{r.location}</td>
                              <td className="border border-slate-300 text-right px-1">{r.start_mile.toLocaleString()}</td>
                              <td className="border border-slate-300 text-right px-1">{r.end_mile.toLocaleString()}</td>
                              <td className="border border-slate-300 text-right px-1">{distance}</td>
                              <td className="border border-slate-300 px-2 whitespace-normal break-words">{r.remark || "-"}</td>
                              <td className="border border-slate-300 text-right px-1">{amount.toLocaleString()}</td>
                            </tr>
                          );
                        })}

                        <tr className="bg-slate-50 font-semibold">
                          {filterType === "select" && <td className="border border-slate-300 print:hidden"></td>}
                          <td className="border border-slate-300"></td>
                          <td className="border border-slate-300 text-right pr-2" colSpan={6}>ยอดรวม</td>
                          <td className="border border-slate-300 text-right px-1">{totalPrintAmount.toLocaleString()}</td>
                        </tr>
                      </>
                    );
                  })()}
                </tbody>
              </table>
            </div>
          </section>

          <section className="mt-6 flex justify-end">
            <table className="border border-slate-300 text-xs">
              <thead>
                <tr className="bg-slate-50">
                  <th className="border border-slate-300 px-3 py-1 text-center w-40">ลงชื่อพนักงาน</th>
                  <th className="border border-slate-300 px-3 py-1 text-center w-40">ลงชื่อหัวหน้างาน</th>
                </tr>
              </thead>
              <tbody>
                <tr className="h-16">
                  <td className="border border-slate-300" />
                  <td className="border border-slate-300" />
                </tr>
                <tr>
                  <td className="border border-slate-300 px-2 py-1 text-center">วันที่: ……………………………</td>
                  <td className="border border-slate-300 px-2 py-1 text-center">วันที่: ……………………………</td>
                </tr>
              </tbody>
            </table>
          </section>
        </div>
      </div>

      <footer className="mt-4 text-right text-[10px] text-slate-400 print:hidden">
        Mileage Report • Generated by Car Booking System
      </footer>
    </main>
  );
}