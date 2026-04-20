'use client'

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import Navbar from "@/components/Navbar"
import { Button } from "@/components/ui/button"

export default function AdminCarMaintenance() {

    const [cars, setCars] = useState<any[]>([])
    const [maintenance, setMaintenance] = useState<any[]>([])
    const [mileageLog, setMileageLog] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const load = async () => {
            const { data: carsData } = await supabase.from("cars").select("*").order("id")
            const { data: maintData } = await supabase.from("car_maintenance").select("*")
            const { data: logData } = await supabase.from("car_mileage_log").select("*")

            setCars(carsData || [])
            setMaintenance(maintData || [])
            setMileageLog(logData || [])
            setLoading(false)
        }
        load()
    }, [])

    const saveMaintenance = async (car_id: number, fields: any) => {
        const res = await supabase
            .from("car_maintenance")
            .upsert({ car_id, ...fields }, { onConflict: "car_id" })

        if (!res.error) alert("บันทึกสำเร็จ")
    }

    const updateMileage = async (car_id: number, current_mileage: number) => {
        const res = await supabase
            .from("car_mileage_log")
            .upsert({ car_id, current_mileage }, { onConflict: "car_id" })

        if (!res.error) alert("อัปเดตไมล์แล้ว")
    }

    if (loading) return 
    <main className="flex flex-col items-center justify-center h-screen text-blue-600">
        <svg
          className="animate-spin h-8 w-8 mb-3 text-blue-500"
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
        <p className="text-gray-500 animate-pulse">
          กำลังตรวจสอบสิทธิ์ผู้ใช้...
        </p>
      </main>

    return (
        <>
            <Navbar />

            <main className="max-w-4xl mx-auto p-4 space-y-6">

                <h1 className="text-xl font-semibold">ระบบจัดการระยะเข้าศูนย์</h1>

                {cars.map(car => {

                    const m = maintenance.find(x => x.car_id === car.id) || {}
                    const log = mileageLog.find(x => x.car_id === car.id) || {}

                    const next = m.next_service_mileage ?? 0
                    const current = log.current_mileage ?? 0
                    const alert_before = m.alert_before_mileage ?? 1000

                    const remaining = next - current

                    return (
                        <div key={car.id} className="p-4 border rounded-lg bg-white shadow">

                            <h2 className="text-lg font-medium mb-2">
                                รถทะเบียน {car.plate}
                            </h2>

                            {/* ไมล์ปัจจุบัน */}
                            <label className="block">ไมล์ปัจจุบัน</label>
                            <input
                                type="number"
                                defaultValue={current}
                                className="border p-2 rounded w-full mb-3"
                                onBlur={(e) => updateMileage(car.id, Number(e.target.value))}
                            />

                            {/* ระยะเข้าศูนย์ */}
                            <label className="block">ระยะเข้าศูนย์ครั้งถัดไป</label>
                            <input
                                type="number"
                                defaultValue={m.next_service_mileage}
                                className="border p-2 rounded w-full mb-3"
                                onBlur={(e) =>
                                    saveMaintenance(car.id, { next_service_mileage: Number(e.target.value) })
                                }
                            />

                            {/* วันที่เข้าศูนย์ */}
                            <label className="block">วันที่เข้าศูนย์ครั้งล่าสุด</label>
                            <input
                                type="date"
                                defaultValue={m.last_service_date || ''}
                                className="border p-2 rounded w-full mb-3"
                                onBlur={(e) =>
                                    saveMaintenance(car.id, { last_service_date: e.target.value })
                                }
                            />

                            {/* กำหนดครั้งหน้า */}
                            <label className="block">วันที่กำหนดเข้าศูนย์ครั้งหน้า</label>
                            <input
                                type="date"
                                defaultValue={m.next_service_date || ''}
                                className="border p-2 rounded w-full mb-3"
                                onBlur={(e) =>
                                    saveMaintenance(car.id, { next_service_date: e.target.value })
                                }
                            />

                            {/* Alert ก่อนล่วงหน้า */}
                            <label className="block mb-1">แจ้งเตือนล่วงหน้า (กม.)</label>

                            <select
                                defaultValue={alert_before}
                                className="border p-2 rounded w-full mb-3"
                                onChange={(e) =>
                                    saveMaintenance(car.id, { alert_before_mileage: Number(e.target.value) })
                                }
                            >
                                <option value="500">500 กม.</option>
                                <option value="800">800 กม.</option>
                                <option value="1000">1000 กม.</option>
                                <option value="1200">1200 กม.</option>
                                <option value="1500">1500 กม.</option>
                                <option value="2000">2000 กม.</option>
                                <option value={alert_before}>ค่าที่ใช้อยู่: {alert_before}</option>
                            </select>

                            <p className="text-sm mt-2">
                                ระยะคงเหลือ:{" "}
                                <span className={remaining <= 0 ? "text-red-600 font-bold" : "text-orange-600 font-bold"}>
                                    {remaining} กม.
                                </span>
                            </p>
                        </div>
                    )
                })}
            </main>
        </>
    )
}
