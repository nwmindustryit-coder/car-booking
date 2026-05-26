"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
  ShieldAlert,
  Search,
  ArrowLeft,
  ChevronRight,
} from "lucide-react";

export default function WorkOutPage() {
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [viewMode, setViewMode] = useState<'user' | 'admin'>('user');
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMonthFilter, setSelectedMonthFilter] = useState<string>("all");
  const [hasAutoSelected, setHasAutoSelected] = useState(false);

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

  const loadData = async (userId: string, currentViewMode: 'user' | 'admin') => {
    let query = supabase
      .from("workouts")
      .select("*")
      .order("date", { ascending: false });

    if (currentViewMode === 'user') {
      query = query.eq("user_id", userId);
    }

    const { data } = await query;
    setRows(data ?? []);
  };

  useEffect(() => {
    const load = async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return router.push("/login");

      setUser(userData.user);

      // ✅ ดึง profile ของ user
      const { data: profile } = await supabase
        .from("profiles")
        .select("department, role")
        .eq("id", userData.user.id)
        .single();

      setDepartment(profile?.department ?? "");
      if (profile?.role === 'admin') {
        setIsAdmin(true);
      }

      await loadData(userData.user.id, viewMode);
      
      setEmployeeName(userData.user.user_metadata?.full_name ?? "");
      setLoading(false);
    };
    load();
  }, [router, viewMode]);

  // ✅ ระบบตัวกรองเดือน (Month Filter)
  const availableMonths = useMemo(() => {
    if (rows.length === 0) return [];
    const monthsSet = new Set(rows.map((r: any) => r.date.substring(0, 7)));
    return Array.from(monthsSet).sort().reverse();
  }, [rows]);

  useEffect(() => {
    if (availableMonths.length > 0 && !hasAutoSelected) {
      setSelectedMonthFilter(availableMonths[0]);
      setHasAutoSelected(true);
    }
  }, [availableMonths, hasAutoSelected]);

  useEffect(() => {
    setHasAutoSelected(false);
    setSelectedMonthFilter("all");
  }, [viewMode]);

  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      const matchMonth = selectedMonthFilter === "all" || r.date.startsWith(selectedMonthFilter);
      const matchSearch =
        r.employee_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.location?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchMonth && matchSearch;
    });
  }, [rows, selectedMonthFilter, searchQuery]);

  const totalAmount = useMemo(() => {
    return filteredRows.reduce((sum, r) => sum + (r.amount || 0), 0);
  }, [filteredRows]);

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
      await loadData(user.id, viewMode);
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
    <div className="bg-slate-50 dark:bg-slate-900 min-h-screen pb-12 transition-colors duration-300">
      <Navbar />
      <main className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6 mt-4">
        
        {/* หัวข้อ + ปุ่มจัดการ */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 dark:text-white tracking-tight flex items-center gap-2">
              <Briefcase className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              บันทึกเวลาทำงานนอกสถานที่
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              ระบบบันทึกเวลาเพื่อคำนวณเบี้ยเลี้ยงการปฏิบัติงานนอกพื้นที่
            </p>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            {/* 🌙 ปุ่ม Toggle Dark Mode */}
            <Button
              onClick={toggleTheme}
              variant="outline"
              className="bg-white dark:bg-slate-800 dark:text-white dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              {isDarkMode ? (
                <Sun className="w-4 h-4 mr-2 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 mr-2 text-indigo-500" />
              )}
              {isDarkMode ? "Light Mode" : "Dark Mode"}
            </Button>

            <Button variant="outline" onClick={() => router.push("/")} className="bg-white dark:bg-slate-800 dark:text-white dark:border-slate-700 dark:hover:bg-slate-700">
              <ArrowLeft className="w-4 h-4 mr-2" /> กลับหน้าหลัก
            </Button>
            <Button onClick={() => router.push("/work-out/report")} className="bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 text-white shadow-sm">
              <FileText className="w-4 h-4 mr-2" /> ออกรายงาน
            </Button>
          </div>
        </div>

        {/* ✨ สวิตช์สลับมุมมอง (แสดงเฉพาะ Admin) */}
        {isAdmin && (
          <div className="bg-white dark:bg-slate-800 p-1 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 inline-flex transition-colors">
            <button
              onClick={() => setViewMode('user')}
              className={`flex items-center gap-2 px-5 py-2 text-sm font-semibold rounded-lg transition-all ${viewMode === 'user' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-700'}`}
            >
              <User className="w-4 h-4" /> มุมมองของคุณ
            </button>
            <button
              onClick={() => setViewMode('admin')}
              className={`flex items-center gap-2 px-5 py-2 text-sm font-semibold rounded-lg transition-all ${viewMode === 'admin' ? 'bg-amber-600 text-white shadow-md' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-700'}`}
            >
              <ShieldAlert className="w-4 h-4" /> มุมมองแอดมิน
            </button>
          </div>
        )}

        {/* ฟอร์มบันทึกการปฏิบัติงาน */}
        <Card className="border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden bg-white dark:bg-slate-800 transition-colors">
          <CardHeader className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-700 pb-4">
            <CardTitle className="text-lg text-slate-800 dark:text-white flex items-center gap-2">
              {editId ? (
                <><Pencil className="w-5 h-5 text-amber-600 dark:text-amber-500" /> แก้ไขข้อมูลการปฏิบัติงาน</>
              ) : (
                <><FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" /> ฟอร์มบันทึกการปฏิบัติงาน</>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-8 space-y-5">
                {/* แถว 1: ชื่อ & แผนก */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <User className="w-4 h-4 text-slate-400 dark:text-slate-500" /> ชื่อพนักงาน
                    </label>
                    <Input
                      type="text"
                      value={employeeName}
                      onChange={(e) => setEmployeeName(e.target.value)}
                      className="bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                      placeholder="ระบุชื่อพนักงาน"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Briefcase className="w-4 h-4 text-slate-400 dark:text-slate-500" /> แผนก
                    </label>
                    <Input
                      type="text"
                      value={department}
                      disabled
                      className="bg-slate-50 dark:bg-slate-800 dark:border-slate-700 text-slate-500 dark:text-slate-400 cursor-not-allowed"
                    />
                  </div>
                </div>

                {/* แถว 2: วันที่ & สถานที่ */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <CalendarDays className="w-4 h-4 text-slate-400 dark:text-slate-500" /> วันที่ปฏิบัติงาน
                    </label>
                    <Input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-slate-400 dark:text-slate-500" /> สถานที่
                    </label>
                    <Input
                      value={place}
                      onChange={(e) => setPlace(e.target.value)}
                      className="bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                      placeholder="ระบุสถานที่ทำงาน"
                    />
                  </div>
                </div>

                {/* แถว 3: เวลา & ค้างคืน */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 p-5 bg-slate-50/50 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-700 rounded-xl">
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Sun className="w-4 h-4 text-orange-400" /> เวลาเริ่ม
                    </label>
                    <Input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Moon className="w-4 h-4 text-indigo-400" /> เวลากลับ
                    </label>
                    <Input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                    />
                  </div>
                  <div className="flex flex-col justify-end pb-0.5">
                    <label
                      className={`flex items-center justify-center gap-2 h-10 border rounded-lg cursor-pointer transition-all select-none ${stayOver ? "bg-indigo-50 dark:bg-indigo-900/30 border-indigo-200 dark:border-indigo-700/50 text-indigo-700 dark:text-indigo-400 font-medium" : "bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600"}`}
                    >
                      <input
                        type="checkbox"
                        checked={stayOver}
                        onChange={() => setStayOver(!stayOver)}
                        className="w-4 h-4 text-indigo-600 rounded border-slate-300 dark:border-slate-600 dark:bg-slate-800 focus:ring-indigo-500"
                      />
                      <span className="text-sm">ค้างคืน (Overnight)</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* ส่วนสรุปขวา */}
              <div className="lg:col-span-4 flex flex-col gap-4">
                <div className="bg-blue-600 dark:bg-blue-700 text-white rounded-2xl p-6 shadow-lg shadow-blue-200 dark:shadow-none flex flex-col justify-between h-full min-h-[200px] transition-all">
                  <div className="flex justify-between items-start">
                    <div className="bg-white/20 p-2.5 rounded-xl backdrop-blur-md">
                      <Calculator className="w-6 h-6 text-white" />
                    </div>
                    <Badge className="bg-white/20 text-white border-none backdrop-blur-md">
                      สรุปผลการคำนวณ
                    </Badge>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <p className="text-blue-100 text-sm font-medium opacity-80 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" /> รวมเวลาปฏิบัติงาน
                      </p>
                      <p className="text-3xl font-extrabold tracking-tight">
                        {calcHours()} <span className="text-lg font-normal opacity-80">ชม.</span>
                      </p>
                    </div>
                    
                    <div className="pt-4 border-t border-white/10">
                      <p className="text-blue-100 text-sm font-medium opacity-80 flex items-center gap-1.5">
                        <Banknote className="w-3.5 h-3.5" /> เบี้ยเลี้ยงสุทธิ
                      </p>
                      <p className="text-4xl font-black text-yellow-300 drop-shadow-sm">
                        {calcAmount().toLocaleString()} <span className="text-xl font-normal opacity-80">฿</span>
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  {editId && (
                    <Button
                      variant="outline"
                      onClick={resetForm}
                      className="flex-1 h-12 rounded-xl text-slate-600 dark:text-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:hover:bg-slate-700"
                    >
                      ยกเลิก
                    </Button>
                  )}
                  <Button
                    onClick={save}
                    className={`flex-[2] h-12 rounded-xl text-base font-bold shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 ${
                      editId
                        ? "bg-amber-500 hover:bg-amber-600 text-white"
                        : "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200 dark:shadow-none"
                    }`}
                  >
                    <Save className="w-5 h-5" />
                    {editId ? "บันทึกการแก้ไข" : "บันทึกข้อมูล"}
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ตารางรายการ */}
        <Card className="border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden bg-white dark:bg-slate-800 transition-colors">
          <CardHeader className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-700 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 py-4">
            <div>
              <CardTitle className="text-lg text-slate-800 dark:text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                {viewMode === 'admin' ? "ประวัติการปฏิบัติงาน (พนักงานทั้งหมด)" : "ประวัติการปฏิบัติงานของคุณ"}
              </CardTitle>
            </div>
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <div className="relative flex-1 md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
                <Input
                  placeholder="ค้นหาชื่อ / สถานที่"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white dark:placeholder-slate-400 rounded-lg h-9"
                />
              </div>
              <Badge variant="secondary" className="bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 px-4 py-1.5 text-sm font-bold whitespace-nowrap">
                ยอดรวมเบี้ยเลี้ยง: {totalAmount.toLocaleString()} ฿
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {/* ✅ ตัวกรองเดือน */}
            {availableMonths.length > 0 && (
              <div className="flex overflow-x-auto p-4 gap-2 border-b border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 scrollbar-hide">
                <Button
                  variant={selectedMonthFilter === "all" ? "default" : "outline"}
                  className={`whitespace-nowrap rounded-full h-8 px-4 text-xs shadow-sm transition-all ${selectedMonthFilter === "all" ? "bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900" : "text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 dark:border-slate-700 dark:hover:bg-slate-700"}`}
                  onClick={() => setSelectedMonthFilter("all")}
                  size="sm"
                >
                  ดูทั้งหมด
                </Button>
                {availableMonths.map((monthStr: any) => {
                  const [year, month] = monthStr.split("-");
                  const monthName = format(new Date(Number(year), Number(month) - 1), "MMMM yyyy", { locale: th });
                  const isSelected = selectedMonthFilter === monthStr;
                  return (
                    <Button
                      key={monthStr}
                      variant={isSelected ? "default" : "outline"}
                      className={`whitespace-nowrap rounded-full h-8 px-4 text-xs shadow-sm transition-all ${isSelected ? "bg-blue-600 dark:bg-blue-500 text-white" : "text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 dark:border-slate-700 dark:hover:bg-slate-700"}`}
                      onClick={() => setSelectedMonthFilter(monthStr)}
                      size="sm"
                    >
                      {monthName}
                    </Button>
                  );
                })}
              </div>
            )}

            {filteredRows.length === 0 ? (
              <div className="p-16 text-center text-slate-500 dark:text-slate-400 flex flex-col items-center">
                <FileText className="w-12 h-12 text-slate-200 dark:text-slate-600 mb-3"/>
                <p>ไม่พบประวัติการบันทึกข้อมูล</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left whitespace-nowrap">
                  <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 font-medium border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="px-4 py-3 text-center w-12">#</th>
                      {viewMode === 'admin' && <th className="px-4 py-3">พนักงาน</th>}
                      <th className="px-4 py-3">วันที่</th>
                      <th className="px-4 py-3">สถานที่</th>
                      <th className="px-4 py-3 text-center">เวลาปฏิบัติงาน</th>
                      <th className="px-4 py-3 text-center">ค้างคืน</th>
                      <th className="px-4 py-3 text-right">รวมเวลา</th>
                      <th className="px-4 py-3 text-right">เบี้ยเลี้ยง</th>
                      <th className="px-4 py-3 text-center w-24">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                    {filteredRows.map((r, idx) => {
                      const d = new Date(r.date);
                      return (
                        <tr key={r.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-700/50 transition-colors group">
                          <td className="px-4 py-3 text-center text-slate-400 dark:text-slate-500">{idx + 1}</td>
                          
                          {viewMode === 'admin' && (
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-[10px] font-bold text-blue-600 dark:text-blue-400">
                                  {r.employee_name?.charAt(0)}
                                </div>
                                <span className="font-semibold text-slate-700 dark:text-slate-200">{r.employee_name}</span>
                              </div>
                            </td>
                          )}

                          <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                            {format(d, "dd MMM yy", { locale: th })}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-col">
                              <span className="text-slate-700 dark:text-slate-200 font-medium">{r.location}</span>
                              <span className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-1">
                                <MapPin className="w-2.5 h-2.5" /> พิกัดปฏิบัติงาน
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-mono">
                              {r.start_time} <ChevronRight className="w-3 h-3 opacity-30" /> {r.end_time}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            {r.stay_over ? (
                              <Badge className="bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100">
                                <Moon className="w-3 h-3 mr-1" /> ค้างคืน
                              </Badge>
                            ) : (
                              <span className="text-slate-300 dark:text-slate-700">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className="font-bold text-blue-600 dark:text-blue-400">{r.hours}</span>
                            <span className="ml-1 text-[10px] text-slate-400">ชม.</span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className="font-bold text-emerald-600 dark:text-emerald-400">{r.amount.toLocaleString()}</span>
                            <span className="ml-1 text-[10px] text-slate-400">฿</span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            {isAdmin || r.user_id === user.id ? (
                              <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/30" onClick={() => edit(r)}>
                                  <Pencil className="w-4 h-4" />
                                </Button>
                                <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30" onClick={() => remove(r.id)}>
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            ) : (
                              <span className="text-[10px] text-slate-300 dark:text-slate-700">ไม่มีสิทธิ์</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      <style
        dangerouslySetInnerHTML={{
          __html: `
                .scrollbar-hide::-webkit-scrollbar { display: none; }
                .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
            `,
        }}
      />
    </div>
  );
}