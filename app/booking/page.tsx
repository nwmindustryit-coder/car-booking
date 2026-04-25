"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  ArrowLeft, CalendarDays, CarFront, User, MapPin, 
  AlignLeft, CheckCircle2, Clock, CalendarCheck 
} from "lucide-react";

const TIME_SLOTS = [
  "ก่อนเวลางาน",
  "08:00-09:00",
  "09:01-10:00",
  "10:01-11:00",
  "11:01-12:00",
  "13:00-14:00",
  "14:01-15:00",
  "15:01-16:00",
  "16:01-17:00",
  "หลังเวลางาน",
];

export default function BookingPage() {
  const [cars, setCars] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [date, setDate] = useState<Date | null>(new Date());
  const [selectedTimes, setSelectedTimes] = useState<string[]>([]);
  
  const [pastDrivers, setPastDrivers] = useState<string[]>([]);

  const [form, setForm] = useState({
    driver_name: "",
    car_id: "",
    destination: "",
    reason: "",
  });
  const [bookingStatus, setBookingStatus] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push("/login");
      setUser(user);

      const { data: cars } = await supabase.from("cars").select("*");
      setCars(cars || []);

      const { data: history } = await supabase
        .from("bookings")
        .select("driver_name")
        .order("created_at", { ascending: false })
        .limit(100);
      
      if (history) {
        const uniqueNames = Array.from(new Set(history.map(h => h.driver_name).filter(Boolean)));
        setPastDrivers(uniqueNames);
      }
    };
    init();
  }, [router]);

  useEffect(() => {
    const checkBookings = async () => {
      if (!form.car_id || !date) return;
      const formattedDate = date.toLocaleDateString("sv-SE");

      const { data, error } = await supabase
        .from("bookings")
        .select("time_slot, driver_name")
        .eq("car_id", form.car_id)
        .eq("date", formattedDate);

      if (error) {
        console.error("Error loading bookings:", error);
        return;
      }

      const status: Record<string, string> = {};
      for (const slot of TIME_SLOTS) status[slot] = "ว่าง";

      for (const booking of data || []) {
        const bookedSlots = booking.time_slot.split(",").map((s) => s.trim());
        for (const slot of TIME_SLOTS) {
          if (bookedSlots.includes(slot)) {
            status[slot] = booking.driver_name;
          }
        }
      }
      setBookingStatus(status);
    };

    checkBookings();
  }, [form.car_id, date]);

  const toggleTimeSlot = (slot: string) => {
    setSelectedTimes((prev) =>
      prev.includes(slot) ? prev.filter((s) => s !== slot) : [...prev, slot],
    );
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    if (!user) return;
    if (!form.car_id || selectedTimes.length === 0)
      return alert("กรุณาเลือกรถและช่วงเวลาอย่างน้อย 1 ช่วง");

    setIsSubmitting(true);

    try {
      const sortedTimes = [...selectedTimes].sort(
        (a, b) => TIME_SLOTS.indexOf(a) - TIME_SLOTS.indexOf(b),
      );
      const combinedSlot = sortedTimes.join(", ");

      const { error } = await supabase.from("bookings").insert({
        user_id: user.id,
        user_name: user.email,
        car_id: form.car_id,
        driver_name: form.driver_name,
        date: date?.toLocaleDateString("sv-SE"),
        time_slot: combinedSlot,
        destination: form.destination,
        reason: form.reason,
      });

      if (error) {
        console.error(error);
      } else {
        // Line Notify
        await fetch("/api/line/notify-booking", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            driver_name: form.driver_name,
            destination: form.destination,
            time_slot: combinedSlot,
            car_plate: cars.find((c) => c.id == form.car_id)?.plate || "",
            date: date?.toLocaleDateString("sv-SE"),
          }),
        });

        // Telegram Notify
        await fetch("/api/telegram/notify-booking", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_name: user.email,
            driver_name: form.driver_name,
            destination: form.destination,
            time_slot: combinedSlot,
            car_plate: cars.find((c) => c.id == form.car_id)?.plate || "",
            date: date?.toLocaleDateString("sv-SE"),
            reason: form.reason,
          }),
        });

        alert(`จองรถสำเร็จ (ช่วงเวลา: ${combinedSlot})`);
        router.push("/");
      }
    } catch (err) {
      console.error(err);
      alert("เกิดข้อผิดพลาดในระบบขัดข้อง โปรดลองอีกครั้ง");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) {
    return (
      <main className="flex flex-col items-center justify-center h-screen bg-slate-50 p-4">
        <div className="p-8 bg-white rounded-3xl shadow-xl flex flex-col items-center w-full max-w-sm text-center">
          <Clock className="w-12 h-12 text-blue-500 animate-pulse mb-4" />
          <p className="text-slate-600 font-medium text-lg">กำลังตรวจสอบสิทธิ์ผู้ใช้...</p>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 pb-12">
      <Navbar />
      <main className="p-3 sm:p-6 max-w-3xl mx-auto mt-2 sm:mt-4">
        
        {/* Header Title */}
        <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
              <CalendarCheck className="w-7 h-7 sm:w-8 sm:h-8 text-blue-600 shrink-0" /> ทำรายการจองรถ
            </h1>
            <p className="text-slate-500 mt-1 text-sm sm:text-base">กรุณากรอกข้อมูลให้ครบถ้วนเพื่อดำเนินการจองรถส่วนกลาง</p>
          </div>
        </div>

        <Card className="border-none shadow-xl rounded-2xl bg-white overflow-visible sm:overflow-hidden">
          {/* ✨ แก้ Padding ให้เล็กลงบนมือถือ */}
          <CardContent className="p-4 sm:p-6 md:p-8">
            <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
              
              {/* Row 1: วันที่ & เลือกรถ */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">วันที่จอง</label>
                  <div className="relative w-full">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                      <CalendarDays className="h-5 w-5 text-slate-400" />
                    </div>
                    {/* ✨ ใส่ wrapperClassName="w-full" เพื่อแก้บั๊ก DatePicker บนมือถือ */}
                    <DatePicker
                      selected={date}
                      onChange={setDate}
                      wrapperClassName="w-full" 
                      className="w-full pl-10 pr-4 h-12 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-slate-700 font-medium"
                      dateFormat="dd/MM/yyyy"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">ทะเบียนรถ</label>
                  <div className="relative w-full">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <CarFront className="h-5 w-5 text-slate-400" />
                    </div>
                    <select
                      className="w-full pl-10 pr-10 h-12 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-slate-700 font-medium appearance-none"
                      value={form.car_id}
                      onChange={(e) => setForm({ ...form, car_id: e.target.value })}
                      required
                    >
                      <option value="" disabled>-- เลือกรถที่ต้องการ --</option>
                      {cars.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.plate} {c.brand ? `(${c.brand})` : ''}
                        </option>
                      ))}
                    </select>
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">▼</div>
                  </div>
                </div>
              </div>

              {/* ชื่อผู้ขับ */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">ชื่อผู้ขับ</label>
                <div className="relative w-full">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-slate-400" />
                  </div>
                  
                  <input
                    list="past-drivers"
                    autoComplete="off"
                    placeholder="ระบุชื่อ-นามสกุล หรือเลือกจากประวัติ"
                    className="w-full pl-10 pr-4 h-12 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-slate-700"
                    value={form.driver_name}
                    onChange={(e) => setForm({ ...form, driver_name: e.target.value })}
                    required
                  />
                  <datalist id="past-drivers">
                    {pastDrivers.map((name, index) => (
                      <option key={index} value={name} />
                    ))}
                  </datalist>
                </div>
              </div>

              {/* เลือกช่วงเวลา */}
              <div className="space-y-3 pt-2">
                <label className="text-sm font-semibold text-slate-700 flex flex-wrap items-center gap-2">
                  <Clock className="h-4 w-4 text-blue-600" /> 
                  เลือกช่วงเวลา 
                  <span className="text-slate-400 font-normal text-[11px] sm:text-xs">
                    (เลือกได้มากกว่า 1 ช่วง)
                  </span>
                </label>
                
                {!form.car_id ? (
                  <div className="p-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 text-center text-slate-500 text-sm">
                    กรุณาเลือกรถเพื่อดูช่วงเวลาที่ว่าง
                  </div>
                ) : (
                  // ✨ ปรับ Grid ให้รองรับจอมือถือเล็กมากๆ (เหลือ 1 คอลัมน์ถ้าจอเล็กจัด)
                  <div className="grid grid-cols-1 min-[380px]:grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
                    {TIME_SLOTS.map((slot) => {
                      const isBooked = bookingStatus[slot] && bookingStatus[slot] !== "ว่าง";
                      const isSelected = selectedTimes.includes(slot);

                      return (
                        <button
                          key={slot}
                          type="button"
                          onClick={() => toggleTimeSlot(slot)}
                          disabled={isBooked}
                          className={`
                            relative p-3 rounded-xl border text-sm font-medium transition-all duration-200 flex flex-col items-center justify-center gap-1 min-h-[60px]
                            ${isBooked 
                              ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed opacity-70' 
                              : isSelected 
                                ? 'bg-blue-600 border-blue-600 text-white shadow-md transform scale-[1.02]' 
                                : 'bg-white border-slate-200 text-slate-700 hover:border-blue-300 hover:bg-blue-50'
                            }
                          `}
                        >
                          <span className="whitespace-nowrap">{slot}</span>
                          {isBooked ? (
                            <span className="text-[10px] text-red-500 font-bold bg-red-50 px-2 py-0.5 rounded-full mt-1 w-full text-center truncate">
                              จองแล้ว: {bookingStatus[slot]}
                            </span>
                          ) : isSelected ? (
                            <CheckCircle2 className="w-4 h-4 absolute top-2 right-2 opacity-80" />
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* สถานที่ & เหตุผล */}
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">สถานที่ไป</label>
                  <div className="relative w-full">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <MapPin className="h-5 w-5 text-slate-400" />
                    </div>
                    <input
                      placeholder="ระบุสถานที่ปลายทาง"
                      className="w-full pl-10 pr-4 h-12 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-slate-700"
                      value={form.destination}
                      onChange={(e) => setForm({ ...form, destination: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">เหตุผลการจอง</label>
                  <div className="relative w-full">
                    <div className="absolute top-3 left-3 pointer-events-none">
                      <AlignLeft className="h-5 w-5 text-slate-400" />
                    </div>
                    <textarea
                      placeholder="ระบุรายละเอียดหรือเหตุผลการใช้งาน"
                      rows={3}
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-slate-700 resize-none"
                      value={form.reason}
                      onChange={(e) => setForm({ ...form, reason: e.target.value })}
                      required
                    ></textarea>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 space-y-3">
                <Button
                  type="submit"
                  className="w-full h-12 sm:h-14 text-base font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-lg rounded-xl transition-all active:scale-[0.98]"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <div className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                      </svg>
                      กำลังประมวลผล...
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-2">
                      <CheckCircle2 className="w-5 h-5" /> ยืนยันการจองรถ
                    </div>
                  )}
                </Button>
                
                <Link href="/" className="block">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full h-12 text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-900 rounded-xl transition-all"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" /> ยกเลิกและกลับหน้าหลัก
                  </Button>
                </Link>
              </div>

            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}