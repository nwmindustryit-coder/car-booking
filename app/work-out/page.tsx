"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import {
  Briefcase,
  MapPin,
  Clock,
  CalendarDays,
  User,
  Moon,
  Sun,
  Calculator,
  Save,
  FileText,
  Pencil,
  Trash2,
  Activity,
  Banknote,
} from "lucide-react";

export default function WorkOutPage() {
  const [user, setUser] = useState<any>(null);
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // 🌙 State สำหรับ Dark Mode
  const [isDarkMode, setIsDarkMode] = useState(false);

  // แบบฟอร์ม
  const [date, setDate] = useState("");
  const [place, setPlace] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [stayOver, setStayOver] = useState(false);
  const [employeeName, setEmployeeName] = useState("");
  const [department, setDepartment] = useState("");

  // สำหรับแก้ไข
  const [editId, setEditId] = useState<string | null>(null);

  const router = useRouter();

  // 🚀 โหลดสถานะ Dark Mode ตอนเข้าเว็บ
  useEffect(() => {
    const savedTheme = localStorage.getItem("dashboardTheme");
    if (savedTheme === "dark") {
      setIsDarkMode(true);
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  const toggleTheme = () => {
    if (isDarkMode) {
      setIsDarkMode(false);
      document.documentElement.classList.remove("dark");
      localStorage.setItem("dashboardTheme", "light");
    } else {
      setIsDarkMode(true);
      document.documentElement.classList.add("dark");
      localStorage.setItem("dashboardTheme", "dark");
    }
  };

  useEffect(() => {
    const load = async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return router.push("/login");

      setUser(userData.user);

      // ✅ ดึง profile ของ user
      const { data: profile } = await supabase
        .from("profiles")
        .select("department")
        .eq("id", userData.user.id)
        .single();

      setDepartment(profile?.department ?? "");

      const { data } = await supabase
        .from("workouts")
        .select("*")
        .eq("user_id", userData.user.id)
        .order("date", { ascending: false });

      setRows(data ?? []);
      setEmployeeName(userData.user.user_metadata?.full_name ?? "");
      setLoading(false);
    };
    load();
  }, [router]);

  const calcHours = () => {
    if (!startTime || !endTime) return 0;
    const s = new Date(`2000-01-01T${startTime}`);
    const e = new Date(`2000-01-01T${endTime}`);
    if (e < s) e.setDate(e.getDate() + 1);
    const diffMs = e.getTime() - s.getTime();
    const diff = diffMs / 1000 / 3600;
    return Math.round(diff * 100) / 100;
  };

  const calcAmount = () => {
    const h = calcHours();
    if (stayOver) return 200;
    if (h > 8) return 100;
    if (h > 0) return 60;
    return 0;
  };

  const resetForm = () => {
    setDate("");
    setPlace("");
    setStartTime("");
    setEndTime("");
    setStayOver(false);
    setEditId(null);
  };

  // บันทึก & อัพเดท
  const save = async () => {
    if (!date || !place || !startTime || !endTime || !employeeName) {
      return alert("กรุณากรอกข้อมูลให้ครบถ้วน");
    }

    const hours = calcHours();
    const amount = calcAmount();

    const payload = {
      user_id: user.id,
      employee_name: employeeName,
      date,
      location: place,
      start_time: startTime,
      end_time: endTime,
      hours,
      stay_over: stayOver,
      amount,
    };

    let error;
    if (editId) {
      const res = await supabase
        .from("workouts")
        .update(payload)
        .eq("id", editId);
      error = res.error;
    } else {
      const res = await supabase.from("workouts").insert(payload);
      error = res.error;
    }

    if (!error) {
      alert(editId ? "อัปเดตข้อมูลสำเร็จ ✅" : "บันทึกข้อมูลสำเร็จ ✅");
      resetForm();

      const { data } = await supabase
        .from("workouts")
        .select("*")
        .eq("user_id", user.id)
        .order("date", { ascending: false });
      setRows(data ?? []);
    } else {
      alert("เกิดข้อผิดพลาด: " + error.message);
    }
  };

  // ลบข้อมูล
  const remove = async (id: string) => {
    if (!confirm("ต้องการลบข้อมูลนี้หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้"))
      return;
    await supabase.from("workouts").delete().eq("id", id);
    setRows(rows.filter((r) => r.id !== id));
  };

  // โหลดข้อมูลเดิมเข้า form
  const edit = (row: any) => {
    setEditId(row.id);
    setEmployeeName(row.employee_name);
    setDate(row.date);
    setPlace(row.location);
    setStartTime(row.start_time);
    setEndTime(row.end_time);
    setStayOver(row.stay_over);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-300">
        <Navbar />
        <main className="flex flex-col items-center justify-center h-[80vh]">
          <div className="p-8 bg-white dark:bg-slate-800 rounded-3xl shadow-xl flex flex-col items-center border dark:border-slate-700">
            <Activity className="w-12 h-12 text-blue-600 dark:text-blue-400 animate-spin mb-4" />
            <p className="text-slate-600 dark:text-slate-300 font-medium text-lg">
              กำลังโหลดข้อมูล...
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-900/50 pb-12 transition-colors duration-300">
      <Navbar />

      <main className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6 mt-4">
        {/* Header Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-white tracking-tight flex items-center gap-2">
              <Briefcase className="w-8 h-8 text-blue-600 dark:text-blue-400" />{" "}
              บันทึกเวลาทำงานนอกสถานที่
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm sm:text-base">
              ระบบบันทึกเวลาเพื่อคำนวณเบี้ยเลี้ยงการปฏิบัติงานนอกพื้นที่
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* 🌙 ปุ่ม Toggle Dark Mode */}
            <Button
              onClick={toggleTheme}
              variant="outline"
              className="bg-white dark:bg-slate-800 dark:text-white dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors h-11 px-4 rounded-xl"
            >
              {isDarkMode ? (
                <Sun className="w-4 h-4 mr-2 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 mr-2 text-indigo-500" />
              )}
              {isDarkMode ? "Light Mode" : "Dark Mode"}
            </Button>

            <Button
              onClick={() => router.push("/work-out/report")}
              className="bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 text-white shadow-md flex items-center gap-2 h-11 px-6 rounded-xl transition-transform active:scale-95"
            >
              <FileText className="w-4 h-4" /> ออกรายงาน
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* 🟢 ส่วนฟอร์มกรอกข้อมูล */}
          <div className="lg:col-span-7 space-y-6">
            <Card className="border-none shadow-xl rounded-2xl bg-white dark:bg-slate-800 overflow-hidden transition-colors">
              <div className="bg-blue-50/50 dark:bg-slate-800/80 border-b border-slate-100 dark:border-slate-700 px-6 py-4">
                <CardTitle className="text-blue-800 dark:text-blue-400 flex items-center gap-2 text-lg">
                  {editId ? (
                    <Pencil className="w-5 h-5" />
                  ) : (
                    <Save className="w-5 h-5" />
                  )}
                  {editId
                    ? "แก้ไขข้อมูลการปฏิบัติงาน"
                    : "ฟอร์มบันทึกการปฏิบัติงาน"}
                </CardTitle>
              </div>
              <CardContent className="p-6 space-y-5">
                {/* แถว 1: ชื่อ & แผนก */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <User className="w-4 h-4 text-slate-400 dark:text-slate-500" /> ชื่อพนักงาน
                    </label>
                    <input
                      type="text"
                      value={employeeName}
                      onChange={(e) => setEmployeeName(e.target.value)}
                      className="w-full h-11 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl px-4 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-slate-700 dark:text-white dark:placeholder-slate-400"
                      placeholder="ระบุชื่อพนักงาน"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Briefcase className="w-4 h-4 text-slate-400 dark:text-slate-500" /> แผนก
                    </label>
                    <input
                      type="text"
                      value={department}
                      disabled
                      className="w-full h-11 bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 text-slate-500 dark:text-slate-400 cursor-not-allowed"
                    />
                  </div>
                </div>

                {/* แถว 2: วันที่ & สถานที่ */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <CalendarDays className="w-4 h-4 text-slate-400 dark:text-slate-500" />{" "}
                      วันที่ปฏิบัติงาน
                    </label>
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full h-11 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl px-4 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-slate-700 dark:text-white"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-slate-400 dark:text-slate-500" /> สถานที่
                    </label>
                    <input
                      value={place}
                      onChange={(e) => setPlace(e.target.value)}
                      className="w-full h-11 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl px-4 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-slate-700 dark:text-white dark:placeholder-slate-400"
                      placeholder="ระบุสถานที่ทำงาน"
                    />
                  </div>
                </div>

                {/* แถว 3: เวลา & ค้างคืน */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 p-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700 rounded-xl">
                  <div className="space-y-1.5 col-span-1">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Sun className="w-4 h-4 text-orange-400" /> เวลาเริ่ม
                    </label>
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full h-11 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg px-3 focus:ring-2 focus:ring-blue-500 outline-none text-slate-700 dark:text-white shadow-sm"
                    />
                  </div>
                  <div className="space-y-1.5 col-span-1">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Moon className="w-4 h-4 text-indigo-400" /> เวลากลับ
                    </label>
                    <input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="w-full h-11 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg px-3 focus:ring-2 focus:ring-blue-500 outline-none text-slate-700 dark:text-white shadow-sm"
                    />
                  </div>
                  <div className="space-y-1.5 col-span-2 sm:col-span-1 flex flex-col justify-end">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      สถานะค้างคืน
                    </label>
                    <label
                      className={`flex items-center justify-center gap-2 h-11 border rounded-lg cursor-pointer transition-all select-none ${stayOver ? "bg-indigo-50 dark:bg-indigo-900/30 border-indigo-200 dark:border-indigo-700/50 text-indigo-700 dark:text-indigo-400 font-medium" : "bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600"}`}
                    >
                      <input
                        type="checkbox"
                        checked={stayOver}
                        onChange={() => setStayOver(!stayOver)}
                        className="w-4 h-4 text-indigo-600 rounded border-slate-300 dark:border-slate-600 dark:bg-slate-800 focus:ring-indigo-500"
                      />
                      ค้างคืน (Overnight)
                    </label>
                  </div>
                </div>

                {/* กล่องสรุปผล */}
                <div className="bg-blue-600 dark:bg-blue-700 text-white rounded-xl p-4 flex items-center justify-between shadow-md transition-colors">
                  <div className="flex items-center gap-3">
                    <Calculator className="w-8 h-8 opacity-80" />
                    <div>
                      <p className="text-blue-100 text-sm font-medium">
                        รวมเวลาปฏิบัติงาน
                      </p>
                      <p className="text-xl font-bold">
                        {calcHours()}{" "}
                        <span className="text-sm font-normal">ชม.</span>
                      </p>
                    </div>
                  </div>
                  <div className="text-right border-l border-blue-400/50 dark:border-blue-500/50 pl-4">
                    <p className="text-blue-100 text-sm font-medium">
                      เบี้ยเลี้ยงสุทธิ
                    </p>
                    <p className="text-2xl font-bold text-yellow-300 dark:text-yellow-400">
                      {calcAmount()}{" "}
                      <span className="text-sm text-yellow-100 dark:text-yellow-200/80 font-normal">
                        บาท
                      </span>
                    </p>
                  </div>
                </div>

                {/* ปุ่ม Action */}
                <div className="flex gap-3 pt-2">
                  {editId && (
                    <Button
                      variant="outline"
                      onClick={resetForm}
                      className="w-1/3 h-12 rounded-xl text-slate-600 dark:text-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:hover:bg-slate-700"
                    >
                      ยกเลิก
                    </Button>
                  )}
                  <Button
                    onClick={save}
                    className={`h-12 rounded-xl text-base font-bold shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 ${
                      editId
                        ? "w-2/3 bg-orange-500 hover:bg-orange-600 dark:bg-orange-600 dark:hover:bg-orange-700 text-white"
                        : "w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white"
                    }`}
                  >
                    <Save className="w-5 h-5" />
                    {editId ? "อัปเดตข้อมูล" : "บันทึกข้อมูล"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 🔵 ส่วนประวัติรายการที่บันทึก */}
          <div className="lg:col-span-5 space-y-4">
            <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" /> ประวัติการบันทึก
              (ล่าสุด)
            </h2>

            {rows.length === 0 ? (
              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 border-dashed rounded-2xl p-10 text-center text-slate-500 dark:text-slate-400 shadow-sm flex flex-col items-center transition-colors">
                <FileText className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-3" />
                <p>ยังไม่มีประวัติการบันทึกเวลาทำงาน</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1 pb-4 custom-scrollbar">
                {rows.map((r) => (
                  <Card
                    key={r.id}
                    className="border border-slate-200 dark:border-slate-700 shadow-sm hover:border-blue-300 dark:hover:border-blue-500 transition-colors bg-white dark:bg-slate-800 overflow-hidden group"
                  >
                    <div className="p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-2">
                          <div className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 p-2 rounded-lg">
                            <CalendarDays className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="font-bold text-slate-800 dark:text-white">
                              {format(new Date(r.date), "dd MMMM yyyy", {
                                locale: th,
                              })}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                              <MapPin className="w-3 h-3" /> {r.location}
                            </p>
                          </div>
                        </div>
                        {r.stay_over && (
                          <Badge className="bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100">
                            <Moon className="w-3 h-3 mr-1" /> ค้างคืน
                          </Badge>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2 bg-slate-50 dark:bg-slate-900/50 rounded-lg p-3 border border-slate-100 dark:border-slate-700 mb-3">
                        <div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                            เวลาทำงาน
                          </p>
                          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                            {r.start_time} - {r.end_time}
                          </p>
                        </div>
                        <div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                            รวมเวลา / เบี้ยเลี้ยง
                          </p>
                          <p className="text-sm font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1">
                            {r.hours} ชม.{" "}
                            <span className="text-slate-300 dark:text-slate-600">|</span>
                            <Banknote className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />{" "}
                            <span className="text-emerald-600 dark:text-emerald-400">
                              {r.amount} ฿
                            </span>
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-1/2 h-8 text-slate-600 dark:text-slate-300 dark:border-slate-600 dark:bg-slate-700 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-600 transition-colors"
                          onClick={() => edit(r)}
                        >
                          <Pencil className="w-3.5 h-3.5 mr-1.5" /> แก้ไข
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="w-1/2 h-8 text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/50 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                          onClick={() => remove(r.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5 mr-1.5" /> ลบ
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* เพิ่ม CSS สำหรับ Custom Scrollbar เล็กๆ */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
                .custom-scrollbar::-webkit-scrollbar { width: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
                
                /* Dark Mode Scrollbar */
                .dark .custom-scrollbar::-webkit-scrollbar-thumb { background: #475569; }
                .dark .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #64748b; }
            `,
        }}
      />
    </div>
  );
}