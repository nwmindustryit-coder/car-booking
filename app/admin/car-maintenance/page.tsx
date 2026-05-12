"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Navbar from "@/components/Navbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Wrench, Moon, Sun, CarFront, FileText, CalendarDays, AlertCircle, MapPin, Gauge } from "lucide-react";

export default function AdminCarMaintenance() {
  const [cars, setCars] = useState<any[]>([]);
  const [maintenance, setMaintenance] = useState<any[]>([]);
  const [mileageLog, setMileageLog] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // 🌙 State สำหรับ Dark Mode
  const [isDarkMode, setIsDarkMode] = useState(false);

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
      const { data: carsData } = await supabase.from("cars").select("*").order("id");
      const { data: maintData } = await supabase.from("car_maintenance").select("*");
      const { data: logData } = await supabase.from("car_mileage_log").select("*");

      setCars(carsData || []);
      setMaintenance(maintData || []);
      setMileageLog(logData || []);
      setLoading(false);
    };
    load();
  }, []);

  // ✅ ฟังก์ชันบันทึกข้อมูลเข้าศูนย์ (และแก้อาการ Error ข้อมูลวันที่ว่าง)
  const saveMaintenance = async (car_id: number, fields: any) => {
    // กรองค่าที่เป็น String ว่าง "" ให้กลายเป็น null ก่อนบันทึก
    const cleanedFields = { ...fields };
    Object.keys(cleanedFields).forEach((key) => {
      if (cleanedFields[key] === "") {
        cleanedFields[key] = null;
      }
    });

    const res = await supabase
      .from("car_maintenance")
      .upsert({ car_id, ...cleanedFields }, { onConflict: "car_id" });

    if (!res.error) {
      setMaintenance((prev) => {
        const exists = prev.find((m) => m.car_id === car_id);
        if (exists) {
          return prev.map((m) => (m.car_id === car_id ? { ...m, ...cleanedFields } : m));
        }
        return [...prev, { car_id, ...cleanedFields }];
      });
    } else {
      alert("เกิดข้อผิดพลาด: " + res.error.message);
    }
  };

  // ✅ ฟังก์ชันบันทึกวันหมดอายุเอกสาร (แก้อาการ Error ข้อมูลวันที่ว่าง)
  const updateCarDocument = async (id: number, fields: any) => {
    // กรองค่าที่เป็น String ว่าง "" ให้กลายเป็น null ก่อนบันทึก
    const cleanedFields = { ...fields };
    Object.keys(cleanedFields).forEach((key) => {
      if (cleanedFields[key] === "") {
        cleanedFields[key] = null;
      }
    });

    const { error } = await supabase
      .from("cars")
      .update(cleanedFields)
      .eq("id", id);

    if (!error) {
      setCars((prev) => prev.map((c) => (c.id === id ? { ...c, ...cleanedFields } : c)));
      console.log("บันทึกข้อมูลสำเร็จ");
    } else {
      alert("เกิดข้อผิดพลาด: " + error.message);
    }
  };

  const updateMileage = async (car_id: number, current_mileage: number) => {
    const res = await supabase
      .from("car_mileage_log")
      .upsert({ car_id, current_mileage }, { onConflict: "car_id" });

    if (!res.error) {
      setMileageLog((prev) => {
        const exists = prev.find((l) => l.car_id === car_id);
        if (exists) {
          return prev.map((l) => (l.car_id === car_id ? { ...l, current_mileage } : l));
        }
        return [...prev, { car_id, current_mileage }];
      });
    }
  };

  if (loading) {
    return (
      <main className="flex flex-col items-center justify-center h-screen text-blue-600 bg-slate-50 dark:bg-slate-900 transition-colors duration-300">
        <svg className="animate-spin h-8 w-8 mb-3 text-blue-500 dark:text-blue-400" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
        </svg>
        <p className="text-gray-500 dark:text-slate-400 animate-pulse">กำลังโหลดข้อมูลระบบ...</p>
      </main>
    );
  }

  const ALERT_MILEAGE_OPTIONS = [500, 800, 1000, 1200, 1500, 2000];
  const ALERT_DAYS_OPTIONS = [7, 15, 30, 45, 60, 90]; // ตัวเลือกแจ้งเตือนล่วงหน้า (วัน)

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-12 transition-colors duration-300">
      <Navbar />
      <main className="max-w-5xl mx-auto p-4 sm:p-6 space-y-6 mt-4">
        
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-700 pb-4 transition-colors">
          <div className="flex items-center gap-3">
            <div className="bg-orange-600 dark:bg-orange-500 p-3 rounded-xl shadow-sm">
              <Wrench className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-white">ระบบจัดการรถและระยะเข้าศูนย์</h1>
              <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">ตั้งค่าการแจ้งเตือน ไมล์รถ และวันต่อเอกสารสำคัญ</p>
            </div>
          </div>
          {/* 🌙 ปุ่ม Toggle Dark Mode */}
          <Button
            onClick={toggleTheme}
            variant="outline"
            className="w-full sm:w-auto bg-white dark:bg-slate-800 dark:text-white dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            {isDarkMode ? (
              <Sun className="w-4 h-4 mr-2 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 mr-2 text-indigo-500" />
            )}
            {isDarkMode ? "Light Mode" : "Dark Mode"}
          </Button>
        </div>

        {cars.map((car) => {
          const m = maintenance.find((x) => x.car_id === car.id) || {};
          const log = mileageLog.find((x) => x.car_id === car.id) || {};
          
          const current = log.current_mileage ?? 0;
          const next = m.next_service_mileage ?? 0;
          const alert_before_mileage = m.alert_before_mileage ?? 1000;
          const remaining = next - current;

          // ค่าเริ่มต้นการแจ้งเตือนเอกสารคือ 30 วัน ถ้าไม่ได้ตั้งค่าไว้
          const alert_before_days = car.alert_before_days ?? 30;

          return (
            <div key={car.id} className="p-6 border border-slate-200 dark:border-slate-700 rounded-2xl bg-white dark:bg-slate-800 shadow-sm hover:shadow-md transition-all duration-300 group">
              <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-4 border-b dark:border-slate-700 pb-3 flex items-center gap-2">
                <CarFront className="w-5 h-5 text-slate-600 dark:text-slate-400" /> 
                รถทะเบียน {car.plate} 
                <span className="text-sm font-normal text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-md ml-2">
                  {car.brand || 'รถส่วนกลาง'}
                </span>
              </h2>

              <div className="grid md:grid-cols-3 gap-6">
                {/* --- หมวดที่ 1: ระยะทางและไมล์ --- */}
                <div className="space-y-4 bg-slate-50/80 dark:bg-slate-900/40 p-5 rounded-xl border border-slate-100 dark:border-slate-700/50 transition-colors">
                  <h3 className="font-bold text-slate-700 dark:text-slate-300 text-sm flex items-center gap-2">
                    <Gauge className="w-4 h-4 text-blue-600 dark:text-blue-400" /> ข้อมูลระยะทาง
                  </h3>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">ไมล์ปัจจุบัน</label>
                    <input
                      type="number"
                      defaultValue={current}
                      className="border border-slate-200 dark:border-slate-600 p-2.5 rounded-lg w-full focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm transition-colors"
                      onBlur={(e) => updateMileage(car.id, Number(e.target.value))}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">ระยะเข้าศูนย์ถัดไป (กม.)</label>
                    <input
                      type="number"
                      defaultValue={m.next_service_mileage}
                      className="border border-slate-200 dark:border-slate-600 p-2.5 rounded-lg w-full focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm transition-colors"
                      onBlur={(e) => saveMaintenance(car.id, { next_service_mileage: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">แจ้งเตือนเข้าศูนย์ล่วงหน้า</label>
                    <div className="relative">
                      <select
                        value={alert_before_mileage}
                        className="border border-slate-200 dark:border-slate-600 p-2.5 rounded-lg w-full bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 outline-none appearance-none focus:ring-2 focus:ring-blue-500 text-sm transition-colors"
                        onChange={(e) => saveMaintenance(car.id, { alert_before_mileage: Number(e.target.value) })}
                      >
                        {ALERT_MILEAGE_OPTIONS.map((val) => (
                          <option key={val} value={val}>{val.toLocaleString()} กม.</option>
                        ))}
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">▼</div>
                    </div>
                  </div>
                </div>

                {/* --- หมวดที่ 2: วันที่ซ่อมบำรุง --- */}
                <div className="space-y-4 bg-slate-50/80 dark:bg-slate-900/40 p-5 rounded-xl border border-slate-100 dark:border-slate-700/50 transition-colors">
                  <h3 className="font-bold text-slate-700 dark:text-slate-300 text-sm flex items-center gap-2">
                    <CalendarDays className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> แผนซ่อมบำรุง
                  </h3>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">วันที่เข้าศูนย์ล่าสุด</label>
                    <input
                      type="date"
                      defaultValue={m.last_service_date || ""}
                      className="border border-slate-200 dark:border-slate-600 p-2.5 rounded-lg w-full outline-none focus:ring-2 focus:ring-emerald-500 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm transition-colors"
                      onBlur={(e) => saveMaintenance(car.id, { last_service_date: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">วันที่นัดครั้งถัดไป</label>
                    <input
                      type="date"
                      defaultValue={m.next_service_date || ""}
                      className="border border-slate-200 dark:border-slate-600 p-2.5 rounded-lg w-full outline-none focus:ring-2 focus:ring-emerald-500 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm transition-colors"
                      onBlur={(e) => saveMaintenance(car.id, { next_service_date: e.target.value })}
                    />
                  </div>
                </div>

                {/* --- หมวดที่ 3: ภาษี / พ.ร.บ. / ประกัน --- */}
                <div className="space-y-4 bg-slate-50/80 dark:bg-slate-900/40 p-5 rounded-xl border border-slate-100 dark:border-slate-700/50 transition-colors">
                  <h3 className="font-bold text-slate-700 dark:text-slate-300 text-sm flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-orange-600 dark:text-orange-400" /> วันหมดอายุเอกสาร
                    </div>
                  </h3>
                  
                  {/* เพิ่มตัวเลือกตั้งค่าการแจ้งเตือนเอกสารล่วงหน้า */}
                  <div className="pb-3 border-b border-slate-200 dark:border-slate-700/50">
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">แจ้งเตือนเอกสารล่วงหน้า</label>
                    <div className="relative">
                      <select
                        value={alert_before_days}
                        className="border border-slate-200 dark:border-slate-600 p-2 rounded-lg w-full text-sm bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-orange-500 appearance-none font-medium transition-colors"
                        onChange={(e) => updateCarDocument(car.id, { alert_before_days: Number(e.target.value) })}
                      >
                        {ALERT_DAYS_OPTIONS.map((val) => (
                          <option key={val} value={val}>{val} วัน</option>
                        ))}
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">▼</div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">ภาษีรถยนต์</label>
                    <input
                      type="date"
                      defaultValue={car.tax_expire || ""}
                      className="border border-slate-200 dark:border-slate-600 p-2.5 rounded-lg w-full outline-none focus:ring-2 focus:ring-orange-500 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm transition-colors"
                      onBlur={(e) => updateCarDocument(car.id, { tax_expire: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">พ.ร.บ.</label>
                    <input
                      type="date"
                      defaultValue={car.act_expire || ""}
                      className="border border-slate-200 dark:border-slate-600 p-2.5 rounded-lg w-full outline-none focus:ring-2 focus:ring-orange-500 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm transition-colors"
                      onBlur={(e) => updateCarDocument(car.id, { act_expire: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">ประกันภัย</label>
                    <input
                      type="date"
                      defaultValue={car.insurance_expire || ""}
                      className="border border-slate-200 dark:border-slate-600 p-2.5 rounded-lg w-full outline-none focus:ring-2 focus:ring-orange-500 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm transition-colors"
                      onBlur={(e) => updateCarDocument(car.id, { insurance_expire: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* ส่วนแสดงสถานะสรุปด้านล่าง Card */}
              <div className="mt-6 flex flex-wrap gap-4 items-center justify-between bg-slate-50 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-100 dark:border-slate-700/50 transition-colors">
                 <div className="text-sm text-slate-600 dark:text-slate-300 flex items-center">
                   <AlertCircle className="w-4 h-4 mr-2 text-slate-400" />
                   ระยะทางคงเหลือ: 
                   <span className={`text-lg font-bold ml-2 font-mono ${
                     remaining <= alert_before_mileage ? (remaining <= 0 ? "text-red-600 dark:text-red-400" : "text-orange-500 dark:text-orange-400") : "text-emerald-600 dark:text-emerald-400"
                   }`}>
                     {remaining.toLocaleString()} กม.
                   </span>
                 </div>
                 <div className="flex gap-2">
                   {remaining <= 0 && <Badge className="bg-red-50 text-red-700 border-red-200 dark:bg-red-900/40 dark:text-red-400 dark:border-red-800 animate-pulse font-medium px-3">ถึงกำหนดเข้าศูนย์!</Badge>}
                   {remaining > 0 && remaining <= alert_before_mileage && <Badge className="bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/40 dark:text-orange-400 dark:border-orange-800 font-medium px-3">ใกล้ถึงกำหนด</Badge>}
                   {remaining > alert_before_mileage && <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-400 dark:border-emerald-800 font-medium px-3">ปกติ</Badge>}
                 </div>
              </div>
            </div>
          );
        })}
      </main>
    </div>
  );
}