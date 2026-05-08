"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Navbar from "@/components/Navbar";
import { Badge } from "@/components/ui/badge";

export default function AdminCarMaintenance() {
  const [cars, setCars] = useState<any[]>([]);
  const [maintenance, setMaintenance] = useState<any[]>([]);
  const [mileageLog, setMileageLog] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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
      <main className="flex flex-col items-center justify-center h-screen text-blue-600">
        <svg className="animate-spin h-8 w-8 mb-3 text-blue-500" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
        </svg>
        <p className="text-gray-500 animate-pulse">กำลังโหลดข้อมูลระบบ...</p>
      </main>
    );
  }

  const ALERT_MILEAGE_OPTIONS = [500, 800, 1000, 1200, 1500, 2000];
  const ALERT_DAYS_OPTIONS = [7, 15, 30, 45, 60, 90]; // ตัวเลือกแจ้งเตือนล่วงหน้า (วัน)

  return (
    <>
      <Navbar />
      <main className="max-w-5xl mx-auto p-4 space-y-6">
        <h1 className="text-xl font-bold text-slate-800">⚙️ ระบบจัดการรถและระยะเข้าศูนย์ (Admin)</h1>

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
            <div key={car.id} className="p-6 border border-slate-200 rounded-2xl bg-white shadow-sm hover:shadow-md transition-all">
              <h2 className="text-lg font-bold text-blue-700 mb-4 border-b pb-2 flex items-center gap-2">
                🚗 รถทะเบียน {car.plate} <span className="text-sm font-normal text-slate-400">({car.brand || 'รถส่วนกลาง'})</span>
              </h2>

              <div className="grid md:grid-cols-3 gap-6">
                {/* --- หมวดที่ 1: ระยะทางและไมล์ --- */}
                <div className="space-y-4 bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                  <h3 className="font-bold text-blue-800 text-sm">📍 ข้อมูลระยะทาง</h3>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">ไมล์ปัจจุบัน</label>
                    <input
                      type="number"
                      defaultValue={current}
                      className="border border-slate-300 p-2 rounded-md w-full focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                      onBlur={(e) => updateMileage(car.id, Number(e.target.value))}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">ระยะเข้าศูนย์ถัดไป (กม.)</label>
                    <input
                      type="number"
                      defaultValue={m.next_service_mileage}
                      className="border border-slate-300 p-2 rounded-md w-full focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                      onBlur={(e) => saveMaintenance(car.id, { next_service_mileage: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">แจ้งเตือนเข้าศูนย์ล่วงหน้า</label>
                    <select
                      value={alert_before_mileage}
                      className="border border-slate-300 p-2 rounded-md w-full bg-white outline-none"
                      onChange={(e) => saveMaintenance(car.id, { alert_before_mileage: Number(e.target.value) })}
                    >
                      {ALERT_MILEAGE_OPTIONS.map((val) => (
                        <option key={val} value={val}>{val.toLocaleString()} กม.</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* --- หมวดที่ 2: วันที่ซ่อมบำรุง --- */}
                <div className="space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <h3 className="font-bold text-slate-700 text-sm">📅 แผนซ่อมบำรุง</h3>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">วันที่เข้าศูนย์ล่าสุด</label>
                    <input
                      type="date"
                      defaultValue={m.last_service_date || ""}
                      className="border border-slate-300 p-2 rounded-md w-full outline-none bg-white"
                      onBlur={(e) => saveMaintenance(car.id, { last_service_date: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">วันที่นัดครั้งถัดไป</label>
                    <input
                      type="date"
                      defaultValue={m.next_service_date || ""}
                      className="border border-slate-300 p-2 rounded-md w-full outline-none bg-white"
                      onBlur={(e) => saveMaintenance(car.id, { next_service_date: e.target.value })}
                    />
                  </div>
                </div>

                {/* --- ✨ หมวดที่ 3: ภาษี / พ.ร.บ. / ประกัน --- */}
                <div className="space-y-4 bg-amber-50/50 p-4 rounded-xl border border-amber-100">
                  <h3 className="font-bold text-amber-800 text-sm flex items-center justify-between">
                    📄 วันหมดอายุเอกสาร
                  </h3>
                  
                  {/* เพิ่มตัวเลือกตั้งค่าการแจ้งเตือนเอกสารล่วงหน้า */}
                  <div className="pb-3 border-b border-amber-200/50">
                    <label className="block text-xs font-medium text-amber-700 mb-1">แจ้งเตือนเอกสารล่วงหน้า</label>
                    <select
                      value={alert_before_days}
                      className="border border-slate-300 p-1.5 rounded-md w-full text-sm bg-white outline-none focus:ring-2 focus:ring-amber-500 text-amber-700 font-medium"
                      onChange={(e) => updateCarDocument(car.id, { alert_before_days: Number(e.target.value) })}
                    >
                      {ALERT_DAYS_OPTIONS.map((val) => (
                        <option key={val} value={val}>{val} วัน</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">ภาษีรถยนต์</label>
                    <input
                      type="date"
                      defaultValue={car.tax_expire || ""}
                      className="border border-slate-300 p-2 rounded-md w-full outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                      onBlur={(e) => updateCarDocument(car.id, { tax_expire: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">พ.ร.บ.</label>
                    <input
                      type="date"
                      defaultValue={car.act_expire || ""}
                      className="border border-slate-300 p-2 rounded-md w-full outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                      onBlur={(e) => updateCarDocument(car.id, { act_expire: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">ประกันภัย</label>
                    <input
                      type="date"
                      defaultValue={car.insurance_expire || ""}
                      className="border border-slate-300 p-2 rounded-md w-full outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                      onBlur={(e) => updateCarDocument(car.id, { insurance_expire: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* ส่วนแสดงสถานะสรุปด้านล่าง Card */}
              <div className="mt-6 flex flex-wrap gap-4 items-center justify-between bg-slate-50 p-4 rounded-xl">
                 <div className="text-sm">
                    ระยะทางคงเหลือ: 
                    <span className={`text-lg font-bold ml-2 ${
                      remaining <= alert_before_mileage ? (remaining <= 0 ? "text-red-600" : "text-orange-500") : "text-emerald-600"
                    }`}>
                      {remaining.toLocaleString()} กม.
                    </span>
                 </div>
                 {remaining <= 0 && <Badge className="bg-red-600 text-white animate-pulse">ถึงกำหนดเข้าศูนย์!</Badge>}
                 {remaining > 0 && remaining <= alert_before_mileage && <Badge className="bg-orange-500 text-white">ใกล้ถึงกำหนด</Badge>}
              </div>
            </div>
          );
        })}
      </main>
    </>
  );
}