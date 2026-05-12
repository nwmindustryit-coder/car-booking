"use client";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns"; 
import { th } from "date-fns/locale";
import { 
  ArrowLeft, CalendarDays, CarFront, User, MapPin, 
  AlignLeft, CheckCircle2, Clock, CalendarCheck , ChevronDown
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
  const [showDriverDropdown, setShowDriverDropdown] = useState(false);

  const [form, setForm] = useState({
    driver_name: "",
    car_id: "",
    destination: "",
    reason: "",
  });
  const [bookingStatus, setBookingStatus] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  // 🚀 โหลดสถานะ Dark Mode ตอนเข้าเว็บ
  useEffect(() => {
    const savedTheme = localStorage.getItem("dashboardTheme");
    if (savedTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

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

  const fetchBookingStatus = useCallback(async () => {
    if (!form.car_id || !date) return;
    const formattedDate = format(date, "yyyy-MM-dd");

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
      const bookedSlots = booking.time_slot?.split(",").map((s: string) => s.trim()) || [];
      for (const slot of TIME_SLOTS) {
        if (bookedSlots.includes(slot)) {
          status[slot] = booking.driver_name;
        }
      }
    }
    setBookingStatus(status);
  }, [form.car_id, date]);

  useEffect(() => {
    fetchBookingStatus();
  }, [fetchBookingStatus]);

  useEffect(() => {
    setSelectedTimes([]);
  }, [form.car_id, date]);

  const toggleTimeSlot = (slot: string) => {
    setSelectedTimes((prev) =>
      prev.includes(slot) ? prev.filter((s) => s !== slot) : [...prev, slot],
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!date) return alert("กรุณาเลือกวันที่ก่อนทำรายการ");
    if (!form.car_id || selectedTimes.length === 0)
      return alert("กรุณาเลือกรถและช่วงเวลาอย่างน้อย 1 ช่วง");

    setIsSubmitting(true);

    try {
      const formattedDate = format(date, "yyyy-MM-dd");
      
      const { data: checkData, error: checkError } = await supabase
        .from("bookings")
        .select("time_slot")
        .eq("car_id", form.car_id)
        .eq("date", formattedDate);

      if (!checkError && checkData) {
        const conflict = checkData.some((b) => {
          const booked = b.time_slot?.split(",").map((s: string) => s.trim()) || [];
          return booked.some((slot: string) => selectedTimes.includes(slot));
        });

        if (conflict) {
          setIsSubmitting(false);
          fetchBookingStatus(); 
          return alert("⚠️ ขออภัยครับ บางช่วงเวลาที่คุณเลือกเพิ่งถูกผู้อื่นจองไปเมื่อสักครู่นี้ กรุณาเลือกเวลาใหม่ครับ");
        }
      }

      const sortedTimes = [...selectedTimes].sort(
        (a, b) => TIME_SLOTS.indexOf(a) - TIME_SLOTS.indexOf(b),
      );
      const combinedSlot = sortedTimes.join(", ");

      const { error } = await supabase.from("bookings").insert({
        user_id: user.id,
        user_name: user.email,
        car_id: form.car_id,
        driver_name: form.driver_name,
        date: formattedDate,
        time_slot: combinedSlot,
        destination: form.destination,
        reason: form.reason,
      });

      if (error) {
        console.error(error);
      } else {
        await fetch("/api/line/notify-booking", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            driver_name: form.driver_name,
            destination: form.destination,
            time_slot: combinedSlot,
            car_plate: cars.find((c) => String(c.id) === String(form.car_id))?.plate || "",
            date: formattedDate,
          }),
        });

        await fetch("/api/telegram/notify-booking", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_name: user.email,
            driver_name: form.driver_name,
            destination: form.destination,
            time_slot: combinedSlot,
            car_plate: cars.find((c) => String(c.id) === String(form.car_id))?.plate || "",
            date: formattedDate,
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
      <main className="flex flex-col items-center justify-center h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-300 p-4">
        <div className="p-8 bg-white dark:bg-slate-800 rounded-3xl shadow-xl flex flex-col items-center w-full max-w-sm text-center border dark:border-slate-700">
          <Clock className="w-12 h-12 text-blue-500 animate-pulse mb-4" />
          <p className="text-slate-600 dark:text-slate-300 font-medium text-lg">กำลังตรวจสอบสิทธิ์ผู้ใช้...</p>
        </div>
      </main>
    );
  }

  return (
    // ✨ แก้ไขสีพื้นหลังให้เป็นทึบเหมือนหน้าอื่น (ลบ /50 ออกจากฝั่ง dark)
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-12 transition-colors duration-300">
      <Navbar />
      <main className="p-3 sm:p-6 max-w-3xl mx-auto mt-2 sm:mt-4">
        
        {/* Header Title */}
        <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 dark:text-white tracking-tight flex items-center gap-2">
              <CalendarCheck className="w-7 h-7 sm:w-8 sm:h-8 text-blue-600 dark:text-blue-400 shrink-0" /> ทำรายการจองรถ
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm sm:text-base">กรุณากรอกข้อมูลให้ครบถ้วนเพื่อดำเนินการจองรถส่วนกลาง</p>
          </div>
        </div>

        <Card className="border-none shadow-xl rounded-2xl bg-white dark:bg-slate-800 dark:border dark:border-slate-700 overflow-visible transition-colors duration-300">
          <CardContent className="p-4 sm:p-6 md:p-8 overflow-visible">
            <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
              
              {/* Row 1: วันที่ & เลือกรถ */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                
                <div className="space-y-2 relative z-[60]">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">วันที่จอง</label>
                  <div className="relative w-full">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                      <CalendarDays className="h-5 w-5 text-slate-400 dark:text-slate-500" />
                    </div>
                    <DatePicker
                      selected={date}
                      onChange={setDate}
                      wrapperClassName="w-full" 
                      className="w-full pl-10 pr-4 h-12 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-slate-700 dark:text-white font-medium relative z-20"
                      dateFormat="dd/MM/yyyy"
                    />
                  </div>
                </div>

                <div className="space-y-2 relative z-50">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">ทะเบียนรถ</label>
                  <div className="relative w-full">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <CarFront className="h-5 w-5 text-slate-400 dark:text-slate-500" />
                    </div>
                    <select
                      className="w-full pl-10 pr-10 h-12 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-slate-700 dark:text-white font-medium appearance-none"
                      value={form.car_id}
                      onChange={(e) => setForm({ ...form, car_id: e.target.value })}
                      required
                    >
                      <option value="" disabled className="dark:text-slate-400">-- เลือกรถที่ต้องการ --</option>
                      {cars.map((c) => (
                        <option key={c.id} value={c.id} className="dark:bg-slate-800 dark:text-white">
                          {c.plate} {c.brand ? `(${c.brand})` : ''}
                        </option>
                      ))}
                    </select>
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">▼</div>
                  </div>
                </div>
              </div>

              {/* ชื่อผู้ขับ */}
              <div className="space-y-2 relative z-40">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">ชื่อผู้ขับ</label>
                <div className="relative w-full">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                    <User className="h-5 w-5 text-slate-400 dark:text-slate-500" />
                  </div>
                  
                  <input
                    autoComplete="off"
                    placeholder="ระบุชื่อ-นามสกุล หรือคลิกเพื่อเลือกประวัติ"
                    className="w-full pl-10 pr-10 h-12 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-slate-700 dark:text-white dark:placeholder-slate-400 relative z-10"
                    value={form.driver_name}
                    onChange={(e) => {
                      setForm({ ...form, driver_name: e.target.value });
                      setShowDriverDropdown(true);
                    }}
                    onFocus={() => setShowDriverDropdown(true)}
                    onBlur={() => setTimeout(() => setShowDriverDropdown(false), 200)}
                    required
                  />

                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none z-10">
                    <ChevronDown className={`w-4 h-4 text-slate-400 dark:text-slate-500 transition-transform duration-200 ${showDriverDropdown ? 'rotate-180 text-blue-500 dark:text-blue-400' : ''}`} />
                  </div>

                  {showDriverDropdown && (
                    <div className="absolute top-full left-0 right-0 mt-1 max-h-52 overflow-y-auto bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg z-50 py-1 transition-colors">
                      {pastDrivers
                        .filter((name) => name.toLowerCase().includes(form.driver_name.toLowerCase()))
                        .map((name, index) => (
                          <div
                            key={index}
                            className="px-4 py-3 text-slate-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-slate-700/50 hover:text-blue-700 dark:hover:text-blue-400 cursor-pointer transition-colors border-b border-slate-50 dark:border-slate-700/50 last:border-none flex items-center gap-2"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              setForm({ ...form, driver_name: name });
                              setShowDriverDropdown(false);
                            }}
                          >
                            <User className="w-4 h-4 text-slate-300 dark:text-slate-500" />
                            {name}
                          </div>
                      ))}
                      
                      {pastDrivers.filter((name) => name.toLowerCase().includes(form.driver_name.toLowerCase())).length === 0 && (
                        <div className="px-4 py-3 text-slate-500 dark:text-slate-400 text-sm flex items-center gap-2 bg-slate-50/50 dark:bg-slate-900/50 italic">
                            ✨ กดบันทึกเพื่อใช้ชื่อ "{form.driver_name}" เป็นชื่อใหม่
                        </div>
                      )}
                      
                      {pastDrivers.length === 0 && !form.driver_name && (
                         <div className="px-4 py-3 text-slate-400 dark:text-slate-500 text-sm italic text-center">
                           ยังไม่มีประวัติรายชื่อ พิมพ์ชื่อใหม่ได้เลยครับ
                         </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* เลือกช่วงเวลา */}
              <div className="space-y-3 pt-2 relative z-30">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex flex-wrap items-center gap-2">
                  <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" /> 
                  เลือกช่วงเวลา 
                  <span className="text-slate-400 dark:text-slate-500 font-normal text-[11px] sm:text-xs">
                    (เลือกได้มากกว่า 1 ช่วง)
                  </span>
                </label>
                
                {!form.car_id ? (
                  <div className="p-4 rounded-xl border border-dashed border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/50 text-center text-slate-500 dark:text-slate-400 text-sm transition-colors">
                    กรุณาเลือกรถเพื่อดูช่วงเวลาที่ว่าง
                  </div>
                ) : (
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
                              ? 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed opacity-70' 
                              : isSelected 
                                ? 'bg-blue-600 dark:bg-blue-500 border-blue-600 dark:border-blue-500 text-white shadow-md transform scale-[1.02]' 
                                : 'bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:border-blue-300 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-slate-600'
                            }
                          `}
                        >
                          <span className="whitespace-nowrap">{slot}</span>
                          {isBooked ? (
                            <span className="text-[10px] text-red-500 dark:text-red-400 font-bold bg-red-50 dark:bg-red-900/30 px-2 py-0.5 rounded-full mt-1 w-full text-center truncate border dark:border-red-800/50">
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
              <div className="space-y-4 pt-2 relative z-20">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">สถานที่ไป</label>
                  <div className="relative w-full">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <MapPin className="h-5 w-5 text-slate-400 dark:text-slate-500" />
                    </div>
                    <input
                      placeholder="ระบุสถานที่ปลายทาง"
                      className="w-full pl-10 pr-4 h-12 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-slate-700 dark:text-white dark:placeholder-slate-400"
                      value={form.destination}
                      onChange={(e) => setForm({ ...form, destination: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">เหตุผลการจอง</label>
                  <div className="relative w-full">
                    <div className="absolute top-3 left-3 pointer-events-none">
                      <AlignLeft className="h-5 w-5 text-slate-400 dark:text-slate-500" />
                    </div>
                    <textarea
                      placeholder="ระบุรายละเอียดหรือเหตุผลการใช้งาน"
                      rows={3}
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-slate-700 dark:text-white dark:placeholder-slate-400 resize-none"
                      value={form.reason}
                      onChange={(e) => setForm({ ...form, reason: e.target.value })}
                      required
                    ></textarea>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 space-y-3 relative z-10">
                <Button
                  type="submit"
                  className="w-full h-12 sm:h-14 text-base font-bold bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white shadow-lg rounded-xl transition-all active:scale-[0.98]"
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
                    className="w-full h-12 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white rounded-xl transition-all bg-white dark:bg-slate-800"
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