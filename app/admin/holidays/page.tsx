"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { 
  CalendarDays, 
  Plus, 
  Trash2, 
  ArrowLeft, 
  Search, 
  AlertCircle,
  CheckCircle2,
  CalendarCheck
} from "lucide-react";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { th } from "date-fns/locale";
import { useAlert } from "@/components/ui/alert-provider";

export default function AdminHolidays() {
  const [holidays, setHolidays] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchSearchQuery] = useState("");
  const [newHoliday, setNewHoliday] = useState({ date: "", name: "" });
  const [pastHolidayNames, setPastHolidayNames] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { showAlert } = useAlert();

  const COMMON_HOLIDAYS = [
    "วันขึ้นปีใหม่",
    "วันมาฆบูชา",
    "วันจักรี",
    "วันสงกรานต์",
    "วันแรงงานแห่งชาติ",
    "วันฉัตรมงคล",
    "วันพืชมงคล",
    "วันวิสาขบูชา",
    "วันเฉลิมพระชนมพรรษาสมเด็จพระนางเจ้าฯ พระบรมราชินี",
    "วันอาสาฬหบูชา",
    "วันเข้าพรรษา",
    "วันเฉลิมพระชนมพรรษาพระบาทสมเด็จพระเจ้าอยู่หัว",
    "วันแม่แห่งชาติ",
    "วันคล้ายวันสวรรคต ร.9",
    "วันปิยมหาราช",
    "วันพ่อแห่งชาติ",
    "วันรัฐธรรมนูญ",
    "วันสิ้นปี",
    "วันหยุดชดเชย",
    "วันหยุดพิเศษ",
  ];

  // รวมรายการแนะนำจากระบบ + ข้อมูลที่เคยกรอกไว้ (Unique & Sorted)
  const ALL_SUGGESTIONS = Array.from(new Set([...COMMON_HOLIDAYS, ...pastHolidayNames])).sort();

  useEffect(() => {
    fetchHolidays();
  }, []);

  const fetchHolidays = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("holidays")
        .select("*")
        .order("date", { ascending: true });

      if (error) throw error;
      setHolidays(data || []);

      // ดึงรายชื่อวันหยุดที่เคยบันทึกไว้ (Unique)
      const uniqueNames = Array.from(new Set((data || []).map((h: any) => h.name)));
      setPastHolidayNames(uniqueNames);
    } catch (err: any) {
      console.error("Fetch holidays error:", err);
      // ถ้าไม่มีตาราง จะลองสร้างจากข้อมูลเบื้องต้น (แต่ในระบบจริง Admin ควรสร้างตารางก่อน)
    } finally {
      setLoading(false);
    }
  };

  const handleAddHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHoliday.date || !newHoliday.name) return;

    try {
      setIsSubmitting(true);
      const { error } = await supabase
        .from("holidays")
        .insert([newHoliday]);

      if (error) throw error;

      showAlert({
        title: "สำเร็จ",
        description: "เพิ่มวันหยุดเรียบร้อยแล้ว",
        type: "success"
      });
      setNewHoliday({ date: "", name: "" });
      fetchHolidays();
    } catch (err: any) {
      showAlert({
        title: "เกิดข้อผิดพลาด",
        description: err.message,
        type: "error"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteHoliday = async (id: string) => {
    if (!confirm("ยืนยันการลบวันหยุดนี้?")) return;

    try {
      const { error } = await supabase
        .from("holidays")
        .delete()
        .eq("id", id);

      if (error) throw error;

      showAlert({
        title: "สำเร็จ",
        description: "ลบวันหยุดเรียบร้อยแล้ว",
        type: "success"
      });
      fetchHolidays();
    } catch (err: any) {
      showAlert({
        title: "เกิดข้อผิดพลาด",
        description: err.message,
        type: "error"
      });
    }
  };

  const filteredHolidays = holidays.filter(h => 
    h.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    h.date.includes(searchQuery)
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-300">
      <Navbar />
      
      <main className="p-4 sm:p-6 max-w-5xl mx-auto pt-24 space-y-6">
        {/* Breadcrumb & Header */}
        <div className="flex flex-col gap-4">
          <Link href="/admin" className="flex items-center text-sm text-slate-500 hover:text-blue-600 transition-colors w-fit">
            <ArrowLeft className="w-4 h-4 mr-1" /> กลับไปหน้าแผงควบคุม
          </Link>
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600 dark:text-red-400 shadow-sm">
                <CalendarCheck className="w-7 h-7" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-800 dark:text-white leading-tight">จัดการวันหยุดนักขัตฤกษ์</h1>
                <p className="text-sm text-slate-500 dark:text-slate-400">เพิ่มหรือลบวันหยุดเพื่อให้ระบบแสดงผลในปฏิทิน</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form เพิ่มวันหยุด */}
          <Card className="lg:col-span-1 border-none shadow-sm dark:bg-slate-800 dark:border dark:border-slate-700 h-fit sticky top-24">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Plus className="w-5 h-5 text-blue-500" /> เพิ่มวันหยุดใหม่
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddHoliday} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">วันที่</label>
                  <Input 
                    type="date" 
                    required
                    value={newHoliday.date}
                    onChange={(e) => setNewHoliday({...newHoliday, date: e.target.value})}
                    className="dark:bg-slate-700 dark:border-slate-600"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">ชื่อวันหยุด</label>
                  <div className="relative">
                    <Input 
                      placeholder="พิมพ์ชื่อ หรือเลือกจากรายการ..." 
                      required
                      list="holiday-presets"
                      value={newHoliday.name}
                      onChange={(e) => setNewHoliday({...newHoliday, name: e.target.value})}
                      className="dark:bg-slate-700 dark:border-slate-600"
                    />
                    <datalist id="holiday-presets">
                      {ALL_SUGGESTIONS.map(name => (
                        <option key={name} value={name} />
                      ))}
                    </datalist>
                  </div>
                  <p className="text-[10px] text-slate-400 italic">* สามารถเลือกจากรายการแนะนำหรือพิมพ์เองก็ได้</p>
                </div>
                <Button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white font-bold h-11 rounded-xl"
                >
                  {isSubmitting ? "กำลังบันทึก..." : "ยืนยันการเพิ่มวันหยุด"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* รายการวันหยุด */}
          <Card className="lg:col-span-2 border-none shadow-sm dark:bg-slate-800 dark:border dark:border-slate-700">
            <CardHeader className="pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <CalendarDays className="w-5 h-5 text-red-500" /> รายการวันหยุดทั้งหมด
                </CardTitle>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input 
                    placeholder="ค้นหาวันหยุด..." 
                    className="pl-9 h-9 w-full sm:w-64 bg-slate-50 dark:bg-slate-700 border-none text-sm"
                    value={searchQuery}
                    onChange={(e) => setSearchSearchQuery(e.target.value)}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex flex-col items-center justify-center py-12 space-y-3">
                  <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
                  <p className="text-slate-500 text-sm">กำลังโหลดข้อมูล...</p>
                </div>
              ) : filteredHolidays.length > 0 ? (
                <div className="overflow-hidden rounded-xl border border-slate-100 dark:border-slate-700">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 font-bold border-b dark:border-slate-700">
                      <tr>
                        <th className="px-4 py-3">วันที่</th>
                        <th className="px-4 py-3">ชื่อวันหยุด</th>
                        <th className="px-4 py-3 text-right">จัดการ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y dark:divide-slate-700">
                      {filteredHolidays.map((h) => (
                        <tr key={h.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                          <td className="px-4 py-3 font-mono text-blue-600 dark:text-blue-400">
                            {format(parseISO(h.date), "dd/MM/yyyy")}
                          </td>
                          <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-200">
                            {h.name}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button 
                              onClick={() => handleDeleteHoliday(h.id)}
                              className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12 bg-slate-50/50 dark:bg-slate-900/20 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700">
                  <AlertCircle className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500 font-medium">ไม่พบข้อมูลวันหยุด</p>
                  <p className="text-slate-400 text-xs mt-1">คุณสามารถเพิ่มวันหยุดใหม่ได้ที่กล่องด้านซ้ายมือ</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
