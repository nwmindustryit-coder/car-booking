"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Navbar from "@/components/Navbar";
import { useRouter } from "next/navigation";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { Pencil, Trash2, FileText, ArrowLeft, Search, User, ShieldAlert, Save, ClipboardList } from "lucide-react";

const RATE_PER_KM = 5;

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
  created_at?: string;
};

type UserData = {
  id: string;
  email?: string;
};

export default function PrivateMileagePage() {
  const router = useRouter();

  // States: User & Permissions
  const [user, setUser] = useState<UserData | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [viewMode, setViewMode] = useState<'user' | 'admin'>('user'); // ✅ เริ่มต้นเป็น user เสมอ
  const [loadingUser, setLoadingUser] = useState(true);

  // States: Data
  const [rows, setRows] = useState<MileageRow[]>([]);
  const [loadingRows, setLoadingRows] = useState(true);

  // States: Form
  const [date, setDate] = useState<Date | null>(new Date());
  const [location, setLocation] = useState("");
  const [startMile, setStartMile] = useState("");
  const [endMile, setEndMile] = useState("");
  const [remark, setRemark] = useState("");
  const [employeeName, setEmployeeName] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // States: Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMonthFilter, setSelectedMonthFilter] = useState<string>("all");
  const [hasAutoSelected, setHasAutoSelected] = useState(false);

  // ✅ 1. โหลด User & Role
  useEffect(() => {
    const loadUser = async () => {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) {
        router.push("/login");
        return;
      }
      
      setUser({ id: authData.user.id, email: authData.user.email ?? undefined });

      const { data: profileData } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', authData.user.id)
        .single();
        
      if (profileData && profileData.role === 'admin') {
        setIsAdmin(true);
      }
      setLoadingUser(false);
    };
    loadUser();
  }, [router]);

  // ✅ 2. โหลด Data โดยเช็คจาก viewMode ไม่ใช่แค่ isAdmin
  useEffect(() => {
    if (loadingUser || !user) return; 

    const loadRows = async () => {
      setLoadingRows(true);
      let query = supabase
        .from("mileages")
        .select("*")
        .order("date", { ascending: false }) // เรียงจากใหม่ไปเก่า
        .order("created_at", { ascending: false });

      // ✅ ถ้า ViewMode เป็น user ให้กรองเอาแค่ของตัวเอง (แอดมินก็ต้องถูกกรองถ้าเลือกโหมด user)
      if (viewMode === 'user') {
        query = query.eq("user_id", user.id);
      }

      const { data, error } = await query;
      if (error) console.error("Error loading mileages:", error);
      else setRows(data || []);
      
      setLoadingRows(false);
    };

    loadRows();
  }, [user, viewMode, loadingUser]); // ดึงใหม่ทุกครั้งที่สลับ viewMode

  // ✅ 3. ระบบตัวกรองเดือน (Month Filter)
  const availableMonths = useMemo(() => {
    if (rows.length === 0) return [];
    const monthsSet = new Set(rows.map((r) => r.date.substring(0, 7)));
    return Array.from(monthsSet).sort().reverse();
  }, [rows]);

  useEffect(() => {
    // ให้มัน Auto-select แค่ตอนโหลดข้อมูลเข้ามาครั้งแรก (ป้องกันเด้งกลับตอนกด "ดูทั้งหมด")
    if (availableMonths.length > 0 && !hasAutoSelected) {
      setSelectedMonthFilter(availableMonths[0]);
      setHasAutoSelected(true);
    }
  }, [availableMonths, hasAutoSelected]);

  // เมื่อสลับ View Mode ให้เคลียร์ AutoSelect เพื่อให้มันดึงเดือนล่าสุดของมุมมองนั้นๆ
  useEffect(() => {
    setHasAutoSelected(false);
    setSelectedMonthFilter("all");
  }, [viewMode]);

  // ✅ 4. กรองข้อมูลตามที่ Search และตาม Month Tab
  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      const matchMonth = selectedMonthFilter === "all" || r.date.startsWith(selectedMonthFilter);
      const matchSearch =
        r.employee_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.location?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.remark?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchMonth && matchSearch;
    });
  }, [rows, selectedMonthFilter, searchQuery]);

  const totalAmount = useMemo(() => {
    return filteredRows.reduce((sum, r) => {
      const distance = typeof r.distance === "number" ? r.distance : r.end_mile - r.start_mile;
      const amt = typeof r.amount === "number" ? r.amount : distance * RATE_PER_KM;
      return sum + (Number.isFinite(amt) ? amt : 0);
    }, 0);
  }, [filteredRows]);

  const resetForm = () => {
    setDate(new Date());
    setLocation("");
    setStartMile("");
    setEndMile("");
    setRemark("");
    setEmployeeName("");
    setEditingId(null);
  };

  const handleEdit = (row: MileageRow) => {
    setEditingId(row.id);
    setDate(new Date(row.date));
    setLocation(row.location);
    setStartMile(row.start_mile.toString());
    setEndMile(row.end_mile.toString());
    setRemark(row.remark || "");
    setEmployeeName(row.employee_name || "");
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (row: MileageRow) => {
    if (!confirm(`คุณต้องการลบรายการวันที่ ${format(new Date(row.date), "dd/MM/yyyy")} ใช่ไหม?`)) return;
    const { error } = await supabase.from("mileages").delete().eq("id", row.id);
    if (error) {
      alert("ลบรายการไม่สำเร็จ");
      return;
    }
    setRows((prev) => prev.filter((r) => r.id !== row.id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!date) return alert("กรุณาเลือกวันที่");
    if (!location.trim()) return alert("กรุณากรอกสถานที่");
    if (!startMile || !endMile) return alert("กรุณากรอกเลขไมล์ให้ครบ");

    const start = Number(startMile);
    const end = Number(endMile);
    if (Number.isNaN(start) || Number.isNaN(end)) return alert("เลขไมล์ต้องเป็นตัวเลข");
    if (end < start) return alert("เลขไมล์สิ้นสุดต้องมากกว่าหรือเท่ากับเลขไมล์เริ่มต้น");

    setSaving(true);
    const payload = {
      user_id: user.id,
      date: date.toISOString().slice(0, 10),
      location,
      start_mile: start,
      end_mile: end,
      remark: remark.trim() || null,
      employee_name: employeeName.trim(),
    };

    if (!editingId) {
      const { data, error } = await supabase.from("mileages").insert(payload).select().single();
      if (error) alert("บันทึกไม่สำเร็จ");
      else {
        setRows((prev) => [data as MileageRow, ...prev]);
        resetForm();
      }
    } else {
      const { data, error } = await supabase.from("mileages").update(payload).eq("id", editingId).select().single();
      if (error) alert("แก้ไขไม่สำเร็จ");
      else {
        setRows((prev) => prev.map((r) => (r.id === editingId ? (data as MileageRow) : r)));
        resetForm();
      }
    }
    setSaving(false);
  };

  if (loadingUser) {
    return (
      <main className="flex flex-col items-center justify-center h-screen text-blue-600 bg-slate-50">
        <div className="animate-spin h-10 w-10 mb-4 border-4 border-blue-500 border-t-transparent rounded-full" />
        <p className="text-slate-500 font-medium animate-pulse">กำลังตรวจสอบสิทธิ์ผู้ใช้...</p>
      </main>
    );
  }

  return (
    <div className="bg-slate-50 min-h-screen pb-12">
      <Navbar />
      <main className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6 mt-4">
        
        {/* หัวข้อ + ปุ่มจัดการ */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight">
              บันทึกเลขไมล์รถยนต์ส่วนตัว
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              ระบบคำนวณค่า Mileage อัตรา <span className="font-semibold text-emerald-600">{RATE_PER_KM.toLocaleString()} บาท / 1 กม.</span>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => router.push("/")} className="bg-white">
              <ArrowLeft className="w-4 h-4 mr-2" /> กลับหน้าหลัก
            </Button>
            <Button onClick={() => router.push("/private-mile/report")} className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm">
              <FileText className="w-4 h-4 mr-2" /> ออกรายงาน
            </Button>
          </div>
        </div>

        {/* ✨ สวิตช์สลับมุมมอง (แสดงเฉพาะ Admin) */}
        {isAdmin && (
          <div className="bg-white p-1 rounded-xl shadow-sm border border-slate-200 inline-flex">
            <button
              onClick={() => setViewMode('user')}
              className={`flex items-center gap-2 px-5 py-2 text-sm font-semibold rounded-lg transition-all ${viewMode === 'user' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}
            >
              <User className="w-4 h-4" /> มุมมองของคุณ
            </button>
            <button
              onClick={() => setViewMode('admin')}
              className={`flex items-center gap-2 px-5 py-2 text-sm font-semibold rounded-lg transition-all ${viewMode === 'admin' ? 'bg-amber-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}
            >
              <ShieldAlert className="w-4 h-4" /> มุมมองแอดมิน
            </button>
          </div>
        )}

        {/* ฟอร์มบันทึกเลขไมล์ */}
        <Card className="border-slate-200 shadow-sm overflow-hidden">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
            <CardTitle className="text-lg text-slate-800 flex items-center gap-2">
              {editingId ? (
                <><Pencil className="w-5 h-5 text-amber-600" /> แก้ไขข้อมูลเลขไมล์</>
              ) : (
                <><FileText className="w-5 h-5 text-blue-600" /> ฟอร์มบันทึกเลขไมล์</>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-5">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-slate-700">ชื่อพนักงาน</label>
                  <Input value={employeeName} onChange={(e) => setEmployeeName(e.target.value)} placeholder="เช่น นายธีรภัทร ทัศนาราม" required className="bg-white" />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-slate-700">วันที่เดินทาง</label>
                  <DatePicker selected={date} onChange={(d: Date | null) => setDate(d)} dateFormat="dd/MM/yyyy" className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" locale={th} />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-700">สถานที่</label>
                <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="เช่น เยี่ยมลูกค้า – ปราจีนบุรี" className="bg-white" />
              </div>

              <div className="grid md:grid-cols-3 gap-5">
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-slate-700">เลขไมล์เริ่มต้น</label>
                  <Input type="number" value={startMile} onChange={(e) => setStartMile(e.target.value)} min={0} className="bg-white font-mono" />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-slate-700">เลขไมล์สิ้นสุด</label>
                  <Input type="number" value={endMile} onChange={(e) => setEndMile(e.target.value)} min={0} className="bg-white font-mono" />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-slate-700">ระยะทาง (กม.) โดยประมาณ</label>
                  <div className="h-10 flex items-center justify-end px-4 rounded-md border border-emerald-200 bg-emerald-50 text-sm font-bold text-emerald-700">
                    {startMile && endMile && !Number.isNaN(Number(endMile) - Number(startMile)) ? `${Number(endMile) - Number(startMile)} กม.` : "-"}
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-700">หมายเหตุ / เหตุผลการเดินทาง</label>
                <Textarea value={remark} onChange={(e) => setRemark(e.target.value)} rows={2} placeholder="เช่น ไปติดตั้งเครื่องจักรที่บริษัทลูกค้า ..." className="bg-white resize-none" />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                {editingId && (
                  <Button type="button" variant="outline" onClick={resetForm} className="bg-white">
                    ยกเลิก
                  </Button>
                )}
                <Button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white min-w-[140px] shadow-sm flex items-center justify-center gap-2">
                  <Save className="w-4 h-4" />
                  {saving ? "กำลังบันทึก..." : editingId ? "บันทึกการแก้ไข" : "บันทึกข้อมูล"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* ตารางรายการ */}
        <Card className="border-slate-200 shadow-sm overflow-hidden">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg text-slate-800 flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-slate-600" />
                {viewMode === 'admin' ? "รายการเลขไมล์ (พนักงานทั้งหมด)" : "รายการเลขไมล์ของคุณ"}
              </CardTitle>
            </div>
            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="ค้นหาชื่อ / สถานที่ / เหตุผล"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 bg-white"
                />
              </div>
              <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 border-emerald-200 px-4 py-1.5 text-sm font-bold whitespace-nowrap">
                ยอดรวม: {totalAmount.toLocaleString()} ฿
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {/* ✅ ตัวกรองเดือน */}
            {availableMonths.length > 0 && (
              <div className="flex overflow-x-auto p-4 gap-2 border-b border-slate-100 bg-white scrollbar-hide">
                <Button
                  variant={selectedMonthFilter === "all" ? "default" : "outline"}
                  className={`whitespace-nowrap rounded-full shadow-sm transition-all ${selectedMonthFilter === "all" ? "bg-slate-800 text-white" : "text-slate-600 bg-white"}`}
                  onClick={() => setSelectedMonthFilter("all")}
                  size="sm"
                >
                  ดูทั้งหมด
                </Button>
                {availableMonths.map((monthStr) => {
                  const [year, month] = monthStr.split("-");
                  const monthName = format(new Date(Number(year), Number(month) - 1), "MMMM yyyy", { locale: th });
                  const isSelected = selectedMonthFilter === monthStr;
                  return (
                    <Button
                      key={monthStr}
                      variant={isSelected ? "default" : "outline"}
                      className={`whitespace-nowrap rounded-full shadow-sm transition-all ${isSelected ? "bg-blue-600 text-white" : "text-slate-600 bg-white"}`}
                      onClick={() => setSelectedMonthFilter(monthStr)}
                      size="sm"
                    >
                      {monthName}
                    </Button>
                  );
                })}
              </div>
            )}

            {loadingRows ? (
              <div className="p-12 text-center text-sm text-slate-500 flex flex-col items-center">
                <div className="animate-spin h-6 w-6 mb-3 border-2 border-blue-500 border-t-transparent rounded-full" />
                กำลังโหลดข้อมูล...
              </div>
            ) : filteredRows.length === 0 ? (
              <div className="p-16 text-center text-slate-500 flex flex-col items-center">
                <FileText className="w-12 h-12 text-slate-200 mb-3"/>
                <p>ไม่พบรายการเลขไมล์</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left whitespace-nowrap">
                  <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3 text-center w-12">#</th>
                      {viewMode === 'admin' && <th className="px-4 py-3">ชื่อพนักงาน</th>}
                      <th className="px-4 py-3">วันที่</th>
                      <th className="px-4 py-3 min-w-[200px]">สถานที่</th>
                      <th className="px-4 py-3 text-right">ระยะทาง (กม.)</th>
                      <th className="px-4 py-3 min-w-[150px]">เหตุผล</th>
                      <th className="px-4 py-3 text-right">ยอดเงิน (฿)</th>
                      <th className="px-4 py-3 text-center w-24">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredRows.map((r, idx) => {
                      const d = new Date(r.date);
                      const distance = typeof r.distance === "number" ? r.distance : r.end_mile - r.start_mile;
                      const amount = typeof r.amount === "number" ? r.amount : distance * RATE_PER_KM;

                      return (
                        <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-4 py-3 text-center text-slate-400">{idx + 1}</td>
                          
                          {viewMode === 'admin' && (
                            <td className="px-4 py-3 font-semibold text-slate-700">
                              {r.employee_name || "-"}
                            </td>
                          )}

                          <td className="px-4 py-3 text-slate-600">
                            {format(d, "dd MMM yy", { locale: th })}
                          </td>
                          <td className="px-4 py-3 text-slate-700">
                            <div className="max-w-[200px] whitespace-normal break-words leading-snug">{r.location}</div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex flex-col items-end">
                              <span className="font-semibold text-slate-800">{distance}</span>
                              <span className="text-[10px] text-slate-400 font-mono">({r.start_mile.toLocaleString()} - {r.end_mile.toLocaleString()})</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-slate-500 text-xs">
                            <div className="max-w-[150px] whitespace-normal break-words leading-snug">{r.remark || "-"}</div>
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-emerald-600">
                            {amount.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {isAdmin || r.user_id === user.id ? (
                              <div className="flex items-center justify-center gap-1">
                                <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-amber-600 hover:bg-amber-50" onClick={() => handleEdit(r)}>
                                  <Pencil className="w-4 h-4" />
                                </Button>
                                <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50" onClick={() => handleDelete(r)}>
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            ) : (
                              <span className="text-xs text-slate-300">-</span>
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
    </div>
  );
}