"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Navbar from "@/components/Navbar";
// import { Button } from "@/components/ui/button" // (ถ้าไม่ได้ใช้ สามารถเอาออกได้ครับ)

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

  // ✅ ปรับปรุงให้ State อัปเดตทันทีเมื่อบันทึก DB สำเร็จ
  const saveMaintenance = async (car_id: number, fields: any) => {
    const res = await supabase
      .from("car_maintenance")
      .upsert({ car_id, ...fields }, { onConflict: "car_id" });

    if (!res.error) {
      setMaintenance((prev) => {
        const exists = prev.find((m) => m.car_id === car_id);
        if (exists) {
          return prev.map((m) => (m.car_id === car_id ? { ...m, ...fields } : m));
        }
        return [...prev, { car_id, ...fields }];
      });
      // แจ้งเตือนแบบเนียนๆ ว่าบันทึกแล้ว (หรือจะเอา alert ออกแล้วใช้ Toast UI แทนก็ได้ครับ)
      console.log("บันทึกข้อมูลการเข้าศูนย์สำเร็จ"); 
    } else {
      alert("เกิดข้อผิดพลาด: " + res.error.message);
    }
  };

  // ✅ ปรับปรุงให้ State อัปเดตทันที
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

  // ✅ แก้ไข Fatal Error ใส่ () ครอบ return
  if (loading) {
    return (
      <main className="flex flex-col items-center justify-center h-screen text-blue-600">
        <svg
          className="animate-spin h-8 w-8 mb-3 text-blue-500"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
          />
        </svg>
        <p className="text-gray-500 animate-pulse">กำลังโหลดข้อมูลระบบ...</p>
      </main>
    );
  }

  const ALERT_OPTIONS = [500, 800, 1000, 1200, 1500, 2000];

  return (
    <>
      <Navbar />

      <main className="max-w-4xl mx-auto p-4 space-y-6">
        <h1 className="text-xl font-semibold text-slate-800">ระบบจัดการระยะเข้าศูนย์</h1>

        {cars.map((car) => {
          const m = maintenance.find((x) => x.car_id === car.id) || {};
          const log = mileageLog.find((x) => x.car_id === car.id) || {};

          const next = m.next_service_mileage ?? 0;
          const current = log.current_mileage ?? 0;
          const alert_before = m.alert_before_mileage ?? 1000;

          const remaining = next - current;

          return (
            <div key={car.id} className="p-5 border border-slate-200 rounded-xl bg-white shadow-sm hover:shadow-md transition-shadow">
              <h2 className="text-lg font-bold text-blue-700 mb-4 border-b pb-2">
                🚗 รถทะเบียน {car.plate}
              </h2>

              <div className="grid md:grid-cols-2 gap-4">
                {/* ไมล์ปัจจุบัน */}
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">ไมล์ปัจจุบัน</label>
                  <input
                    type="number"
                    defaultValue={current}
                    className="border border-slate-300 p-2 rounded-md w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    onBlur={(e) => updateMileage(car.id, Number(e.target.value))}
                  />
                </div>

                {/* ระยะเข้าศูนย์ */}
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">ระยะเข้าศูนย์ครั้งถัดไป</label>
                  <input
                    type="number"
                    defaultValue={m.next_service_mileage}
                    className="border border-slate-300 p-2 rounded-md w-full focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    onBlur={(e) =>
                      saveMaintenance(car.id, { next_service_mileage: Number(e.target.value) })
                    }
                  />
                </div>

                {/* วันที่เข้าศูนย์ */}
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">วันที่เข้าศูนย์ครั้งล่าสุด</label>
                  <input
                    type="date"
                    defaultValue={m.last_service_date || ""}
                    className="border border-slate-300 p-2 rounded-md w-full outline-none focus:ring-2 focus:ring-blue-500"
                    onBlur={(e) => saveMaintenance(car.id, { last_service_date: e.target.value })}
                  />
                </div>

                {/* กำหนดครั้งหน้า */}
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">วันที่กำหนดเข้าศูนย์ครั้งหน้า</label>
                  <input
                    type="date"
                    defaultValue={m.next_service_date || ""}
                    className="border border-slate-300 p-2 rounded-md w-full outline-none focus:ring-2 focus:ring-blue-500"
                    onBlur={(e) => saveMaintenance(car.id, { next_service_date: e.target.value })}
                  />
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                {/* Alert ก่อนล่วงหน้า */}
                <div className="w-full md:w-1/2">
                  <label className="block text-sm font-medium text-slate-600 mb-1">แจ้งเตือนล่วงหน้า (กม.)</label>
                  <select
                    value={alert_before} // ใช้ value แทน defaultValue เพื่อให้ซิงค์กับ State เสมอ
                    className="border border-slate-300 p-2 rounded-md w-full bg-slate-50 outline-none focus:ring-2 focus:ring-blue-500"
                    onChange={(e) =>
                      saveMaintenance(car.id, { alert_before_mileage: Number(e.target.value) })
                    }
                  >
                    {/* ✅ ป้องกันการแสดงตัวเลือกซ้ำซ้อน */}
                    {ALERT_OPTIONS.includes(alert_before) ? null : (
                      <option value={alert_before}>{alert_before} กม. (ค่าที่ตั้งไว้)</option>
                    )}
                    {ALERT_OPTIONS.map((val) => (
                      <option key={val} value={val}>
                        {val} กม.
                      </option>
                    ))}
                  </select>
                </div>

                {/* แสดงผลระยะคงเหลือ */}
                <div className="w-full md:w-1/2 md:text-right bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <p className="text-sm text-slate-600">
                    ระยะทางคงเหลือ:{" "}
                    <span
                      className={`text-xl ml-1 ${
                        remaining <= alert_before
                          ? remaining <= 0
                            ? "text-red-600 font-bold"
                            : "text-orange-500 font-bold"
                          : "text-emerald-600 font-bold"
                      }`}
                    >
                      {remaining.toLocaleString()} กม.
                    </span>
                  </p>
                  {remaining <= 0 && (
                    <p className="text-xs text-red-500 mt-1">⚠️ ถึงกำหนดเข้าศูนย์แล้ว!</p>
                  )}
                  {remaining > 0 && remaining <= alert_before && (
                    <p className="text-xs text-orange-500 mt-1">⚠️ ใกล้ถึงกำหนดเข้าศูนย์</p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </main>
    </>
  );
}