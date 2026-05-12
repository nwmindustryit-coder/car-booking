"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  isSameMonth, 
  isSameDay, 
  eachDayOfInterval,
  isToday
} from "date-fns";
import { th } from "date-fns/locale";
import { 
  ChevronLeft, 
  ChevronRight, 
  CalendarDays, 
  Moon,
  Sun,
  CarFront,
  Route,
  Users,
  CalendarCheck,
  User,
  MapPin,
  Clock,
  AlignLeft,
  AlertCircle
} from "lucide-react";

// ⏱️ ฟังก์ชันเทพ รวบช่วงเวลา (Merge Time Slots)
const TIME_SLOTS = [
  "ก่อนเวลางาน", "08:00-09:00", "09:01-10:00", "10:01-11:00",
  "11:01-12:00", "13:00-14:00", "14:01-15:00", "15:01-16:00",
  "16:01-17:00", "หลังเวลางาน",
];

function mergeTimeSlots(timeSlotString: string): string {
  if (!timeSlotString) return '';
  const slots = timeSlotString.split(',').map(s => s.trim());
  if (slots.length === 1) return slots[0];

  const indexes = slots
    .map(s => TIME_SLOTS.indexOf(s))
    .filter(i => i !== -1)
    .sort((a, b) => a - b);

  if (indexes.length === 0) return timeSlotString;

  const groups: number[][] = [];
  let currentGroup: number[] = [indexes[0]];

  for (let i = 1; i < indexes.length; i++) {
    if (indexes[i] === indexes[i - 1] + 1) {
      currentGroup.push(indexes[i]);
    } else {
      groups.push(currentGroup);
      currentGroup = [indexes[i]];
    }
  }
  groups.push(currentGroup);

  const formattedGroups = groups.map(group => {
    const first = TIME_SLOTS[group[0]];
    const last = TIME_SLOTS[group[group.length - 1]];
    if (group.length === 1) return first;

    let start = first.split('-')[0];
    if (first === 'ก่อนเวลางาน') start = 'ก่อนเวลางาน';
    if (first === 'หลังเวลางาน') start = '17:00';

    let end = last.split('-')[1];
    if (last === 'หลังเวลางาน') end = 'หลังเวลางาน';
    if (last === 'ก่อนเวลางาน') end = '08:00';

    if (start === 'ก่อนเวลางาน' && end === 'หลังเวลางาน') return 'ตลอดวัน';
    return `${start}-${end}`;
  });

  return formattedGroups.join(', ');
}

// 🎨 สีประจำรถ
const CAR_COLORS = [
  { bg: "bg-blue-100 dark:bg-blue-900/40", text: "text-blue-700 dark:text-blue-300", border: "border-blue-200 dark:border-blue-800", dot: "bg-blue-600 dark:bg-blue-400" },
  { bg: "bg-emerald-100 dark:bg-emerald-900/40", text: "text-emerald-700 dark:text-emerald-300", border: "border-emerald-200 dark:border-emerald-800", dot: "bg-emerald-600 dark:bg-emerald-400" },
  { bg: "bg-indigo-100 dark:bg-indigo-900/40", text: "text-indigo-700 dark:text-indigo-300", border: "border-indigo-200 dark:border-indigo-800", dot: "bg-indigo-600 dark:bg-indigo-400" },
  { bg: "bg-amber-100 dark:bg-amber-900/40", text: "text-amber-700 dark:text-amber-300", border: "border-amber-200 dark:border-amber-800", dot: "bg-amber-600 dark:bg-amber-400" },
  { bg: "bg-rose-100 dark:bg-rose-900/40", text: "text-rose-700 dark:text-rose-300", border: "border-rose-200 dark:border-rose-800", dot: "bg-rose-600 dark:bg-rose-400" },
  { bg: "bg-cyan-100 dark:bg-cyan-900/40", text: "text-cyan-700 dark:text-cyan-300", border: "border-cyan-200 dark:border-cyan-800", dot: "bg-cyan-600 dark:bg-cyan-400" },
];

const TH_DAYS = ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."];

export default function FleetCalendar() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedCar, setSelectedCar] = useState("all");
  const [cars, setCars] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // ✨ State สำหรับ Modal
  const [selectedDateData, setSelectedDateData] = useState<{ date: Date, bookings: any[] } | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<any | null>(null);

  // 🚀 โหลด Dark Mode
  useEffect(() => {
    const savedTheme = localStorage.getItem("dashboardTheme");
    if (savedTheme === "dark") {
      setIsDarkMode(true);
      document.documentElement.classList.add("dark");
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

  // 🛰️ โหลดข้อมูล (แก้บั๊กกันค้างแบบ Bulletproof)
  const monthIndex = currentMonth.getMonth();
  const yearIndex = currentMonth.getFullYear();

  useEffect(() => {
    let isMounted = true; 

    const loadData = async () => {
      try {
        setLoading(true);
        setErrorMsg(null);
        
        const start = format(startOfWeek(startOfMonth(currentMonth)), "yyyy-MM-dd");
        const end = format(endOfWeek(endOfMonth(currentMonth)), "yyyy-MM-dd");

        const [carsRes, bookingsRes] = await Promise.all([
          supabase.from("cars").select("id, plate, brand").order("id"),
          supabase.from("bookings").select("*").gte("date", start).lte("date", end)
        ]);

        if (carsRes.error) throw carsRes.error;
        if (bookingsRes.error) throw bookingsRes.error;

        if (isMounted) {
          setCars(carsRes.data || []);
          
          const mergedBookings = (bookingsRes.data || []).map((b: any) => {
             const carDetails = (carsRes.data || []).find((c: any) => c.id === b.car_id);
             return { ...b, cars: carDetails || { plate: "ไม่ทราบทะเบียน" } };
          });
          
          setBookings(mergedBookings);
        }
      } catch (err: any) {
        console.error("Error loading calendar data:", err);
        if (isMounted) setErrorMsg(err.message || "เกิดข้อผิดพลาดในการโหลดข้อมูล");
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [monthIndex, yearIndex]); 

  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth));
    const end = endOfWeek(endOfMonth(currentMonth));
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const filteredBookings = useMemo(() => {
    if (selectedCar === "all") return bookings;
    return bookings.filter(b => String(b.car_id) === selectedCar);
  }, [bookings, selectedCar]);

  const totalThisMonth = useMemo(() => {
    return bookings.filter(b => isSameMonth(new Date(b.date), currentMonth));
  }, [bookings, currentMonth]);

  const uniqueDrivers = new Set(totalThisMonth.map(b => b.driver_name)).size;
  const uniqueDays = new Set(totalThisMonth.map(b => b.date)).size;

  // ✨ หน้า Loading
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-300 pb-12 flex flex-col">
        <Navbar />
        <main className="flex-1 flex flex-col items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-xl flex flex-col items-center border border-slate-200 dark:border-slate-700">
            <div className="animate-spin h-10 w-10 border-4 border-blue-500 border-t-transparent rounded-full mb-4"></div>
            <p className="text-slate-600 dark:text-slate-300 font-bold text-lg">กำลังโหลดตารางคิวรถ...</p>
            <p className="text-slate-400 dark:text-slate-500 text-sm mt-1">โปรดรอสักครู่ครับ</p>
          </div>
        </main>
      </div>
    );
  }

  // ✨ หน้าโชว์ Error
  if (errorMsg) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-300 pb-12 flex flex-col">
        <Navbar />
        <main className="flex-1 flex flex-col items-center justify-center p-4">
          <div className="bg-red-50 dark:bg-red-900/20 p-8 rounded-3xl shadow-lg border border-red-200 dark:border-red-800/50 flex flex-col items-center text-center max-w-md">
            <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
            <p className="text-red-700 dark:text-red-400 font-bold text-lg mb-2">ไม่สามารถโหลดข้อมูลปฏิทินได้</p>
            <p className="text-red-500 dark:text-red-300 text-sm">{errorMsg}</p>
            <Button onClick={() => window.location.reload()} className="mt-6 bg-red-600 hover:bg-red-700 text-white rounded-xl">ลองใหม่อีกครั้ง</Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    // 🔴 แก้จุดที่ 1: เพิ่ม overflow-x-hidden และ w-full เพื่อกัน Scrollbar แนวนอน
    <div className="min-h-screen w-full overflow-x-hidden bg-slate-50 dark:bg-slate-900 pb-12 transition-colors duration-300">
      <Navbar />

      <style dangerouslySetInnerHTML={{ __html: `
        /* 🔴 แก้จุดที่ 2: ล็อก Scrollbar Layout Shift ไม่ให้หน้ากระตุกเวลาเปิด Modal */
        html {
          scrollbar-gutter: stable;
        }
        body[data-scroll-locked] {
          padding-right: 0 !important;
          margin-right: 0 !important;
        }
        .dark [role="dialog"] > button {
          color: #ffffff !important;
          background-color: #334155 !important;
          border-radius: 50% !important;
          opacity: 1 !important;
          padding: 6px !important;
          transition: all 0.2s ease-in-out !important;
          right: 16px !important;
          top: 16px !important;
        }
        .dark [role="dialog"] > button:hover {
          background-color: #475569 !important;
          transform: scale(1.1) !important;
        }
        .dark [role="dialog"] > button svg {
          stroke: #ffffff !important;
        }
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        /* 🔴 แก้จุดที่ 3: ทำให้ .custom-scrollbar เล็กและสวยงามขึ้น ป้องกัน Scrollbar เดิมที่หนาเตอะ */
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: #cbd5e1;
          border-radius: 20px;
        }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: #475569;
        }
      `}} />

      <main className="max-w-[1400px] mx-auto p-3 sm:p-6 mt-2 sm:mt-4">
        
        {/* ✨ Header Mobile-Friendly */}
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-blue-600 dark:bg-blue-500 flex items-center justify-center text-white shadow-md">
                <CalendarDays className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-white leading-tight">ปฏิทินคิวรถ</h1>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                  {format(currentMonth, "MMMM yyyy", { locale: th })}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button onClick={toggleTheme} variant="outline" size="icon" className="h-9 w-9 rounded-full bg-white dark:bg-slate-800 dark:border-slate-700 shadow-sm">
                {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-1.5 shadow-sm">
            <Button variant="ghost" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="h-10 px-3 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl">
              <ChevronLeft className="w-5 h-5 text-slate-600 dark:text-slate-300" />
            </Button>
            <Button variant="ghost" onClick={() => setCurrentMonth(new Date())} className="h-10 px-4 font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl">
              วันนี้
            </Button>
            <Button variant="ghost" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="h-10 px-3 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl">
              <ChevronRight className="w-5 h-5 text-slate-600 dark:text-slate-300" />
            </Button>
          </div>
        </div>

        {/* ✨ UI แถบเลือกคันรถแบบ "Pill Switcher" ลากซ้ายขวาได้ */}
        <div className="flex overflow-x-auto hide-scrollbar gap-2 mb-6 pb-2 px-1 snap-x">
          <button
            onClick={() => setSelectedCar("all")}
            className={`shrink-0 px-4 py-2 rounded-full text-[13px] font-bold border transition-all duration-200 snap-start
              ${selectedCar === "all" 
                ? 'bg-slate-800 text-white border-slate-800 dark:bg-slate-200 dark:text-slate-900 shadow-md transform scale-105' 
                : 'bg-white text-slate-600 border-slate-200 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
              }`}
          >
            รถทั้งหมด
          </button>
          {cars.map((car, idx) => {
            const ramp = CAR_COLORS[idx % CAR_COLORS.length];
            const isActive = selectedCar === String(car.id);
            return (
              <button
                key={car.id}
                onClick={() => setSelectedCar(String(car.id))}
                className={`shrink-0 flex items-center gap-2 px-3 py-2 rounded-full text-[13px] font-semibold border transition-all duration-200 snap-start
                  ${isActive 
                    ? `${ramp.bg} ${ramp.text} ${ramp.border} shadow-md transform scale-105 ring-1 ring-offset-1 ring-${ramp.text.split('-')[1]}-500 dark:ring-offset-slate-900` 
                    : 'bg-white text-slate-600 border-slate-200 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
                  }`}
              >
                <div className={`w-2 h-2 rounded-full ${isActive ? ramp.dot : 'bg-slate-300 dark:bg-slate-600'}`}></div>
                {car.plate}
              </button>
            );
          })}
        </div>

        {/* Calendar Grid */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl overflow-hidden shadow-sm">
          {/* Header วันในสัปดาห์ */}
          <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
            {TH_DAYS.map((day, i) => (
              <div key={day} className={`py-3 text-center text-[11px] sm:text-xs font-bold uppercase tracking-wider ${i === 0 ? 'text-red-500 dark:text-red-400' : i === 6 ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'}`}>
                {day}
              </div>
            ))}
          </div>

          {/* ตารางปฏิทิน */}
          <div className="grid grid-cols-7 auto-rows-[minmax(80px,auto)] sm:auto-rows-[minmax(110px,auto)]">
            {calendarDays.map((day, idx) => {
              const inMonth = isSameMonth(day, currentMonth);
              const isTodayDate = isToday(day);
              const isSun = day.getDay() === 0;
              const isSat = day.getDay() === 6;
              const dayBookings = filteredBookings.filter(b => isSameDay(new Date(b.date), day));

              return (
                <div
                  key={idx}
                  onClick={() => dayBookings.length > 0 && setSelectedDateData({ date: day, bookings: dayBookings })}
                  className={`
                    group border-r border-b p-1 sm:p-2 transition-all duration-200 relative flex flex-col
                    ${(idx + 1) % 7 === 0 ? 'border-r-0' : ''}
                    ${idx >= calendarDays.length - 7 ? 'border-b-0' : ''}
                    ${isTodayDate 
                        ? 'bg-blue-50/60 dark:bg-blue-900/20 border-slate-100 dark:border-slate-700/50 shadow-[inset_0_0_0_2px_#3b82f6] dark:shadow-[inset_0_0_0_2px_#3b82f6] z-10' 
                        : !inMonth 
                          ? 'border-slate-100 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-900/20' 
                          : (isSun || isSat) 
                            ? 'border-slate-100 dark:border-slate-700/50 bg-slate-50/30 dark:bg-slate-900/40' 
                            : 'border-slate-100 dark:border-slate-700/50 bg-white dark:bg-slate-800'
                    }
                    ${dayBookings.length > 0 ? 'cursor-pointer hover:bg-blue-50/80 dark:hover:bg-slate-700/60' : ''}
                  `}
                >
                  {/* ตัวเลขวันที่ */}
                  <div className="flex justify-between items-start mb-1 sm:mb-2">
                    <span className={`
                      w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center rounded-full text-[13px] sm:text-base font-bold transition-transform duration-300
                      ${isTodayDate 
                          ? 'bg-blue-600 text-white shadow-md ring-2 ring-blue-500/20 dark:ring-blue-500/30 scale-110' 
                          : !inMonth 
                            ? 'text-slate-300 dark:text-slate-600' 
                            : isSun 
                              ? 'text-red-500 dark:text-red-400' 
                              : isSat 
                                ? 'text-blue-600 dark:text-blue-400' 
                                : 'text-slate-700 dark:text-slate-200'
                      }
                    `}>
                      {format(day, "d")}
                    </span>

                    {isTodayDate && (
                      <span className="hidden sm:inline-block text-[10px] font-bold text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/60 px-1.5 py-0.5 rounded-md animate-pulse mt-1">
                        วันนี้
                      </span>
                    )}
                  </div>

                  {/* ก้อนรายการจอง (Chips) */}
                  <div className="space-y-1 flex flex-col relative z-20 flex-1">
                    {dayBookings.slice(0, 3).map((b) => {
                      const carIdx = cars.findIndex(c => c.id === b.car_id);
                      const ramp = CAR_COLORS[carIdx % CAR_COLORS.length] || CAR_COLORS[0];
                      const mergedTime = mergeTimeSlots(b.time_slot); 
                      
                      return (
                        <div
                          key={b.id}
                          onClick={(e) => { e.stopPropagation(); setSelectedBooking(b); }}
                          title={`${b.cars?.plate} · ${mergedTime} · ${b.driver_name}`}
                          className={`
                            px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-[6px] sm:rounded-md text-[9px] sm:text-[11px] font-semibold cursor-pointer
                            flex items-center gap-1 border ${ramp.bg} ${ramp.text} ${ramp.border}
                            transform transition-all duration-200 hover:scale-105 active:scale-95 truncate
                          `}
                        >
                          <span className="truncate w-full leading-tight">
                            {mergedTime} | {b.cars?.plate?.split(' ')[0]}
                          </span>
                        </div>
                      );
                    })}
                    {dayBookings.length > 3 && (
                      <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 pl-1 mt-auto pt-1">
                        +{dayBookings.length - 3}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* สรุปสถิติด้านล่าง */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mt-6">
          <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col">
            <div className="flex items-center gap-2 mb-1 sm:mb-2 text-blue-600 dark:text-blue-400">
              <CarFront className="w-4 h-4" />
              <span className="text-[11px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400">รถพร้อมใช้งาน</span>
            </div>
            <div className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white">{cars.length} <span className="text-sm font-medium text-slate-500">คัน</span></div>
          </div>

          <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col">
            <div className="flex items-center gap-2 mb-1 sm:mb-2 text-emerald-600 dark:text-emerald-400">
              <Route className="w-4 h-4" />
              <span className="text-[11px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400">ทริปเดือนนี้</span>
            </div>
            <div className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white">{totalThisMonth.length} <span className="text-sm font-medium text-slate-500">ทริป</span></div>
          </div>

          <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col">
            <div className="flex items-center gap-2 mb-1 sm:mb-2 text-purple-600 dark:text-purple-400">
              <Users className="w-4 h-4" />
              <span className="text-[11px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400">พนักงานที่ใช้</span>
            </div>
            <div className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white">{uniqueDrivers} <span className="text-sm font-medium text-slate-500">ท่าน</span></div>
          </div>

          <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col">
            <div className="flex items-center gap-2 mb-1 sm:mb-2 text-amber-600 dark:text-amber-400">
              <CalendarCheck className="w-4 h-4" />
              <span className="text-[11px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400">วันที่มีการจอง</span>
            </div>
            <div className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white">{uniqueDays} <span className="text-sm font-medium text-slate-500">วัน</span></div>
          </div>
        </div>

      </main>

      {/* ✨ Modal 1: ดูรายการจองทั้งหมดของวันที่ถูกคลิก */}
      <Dialog open={!!selectedDateData} onOpenChange={() => setSelectedDateData(null)}>
        <DialogContent className="max-w-[95vw] sm:max-w-lg dark:bg-slate-800/95 dark:backdrop-blur-xl dark:border-slate-700 rounded-3xl animate-in zoom-in-95 duration-200 p-5">
          <DialogHeader className="border-b dark:border-slate-700 pb-4">
            <DialogTitle className="text-lg sm:text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              วันที่ {selectedDateData && format(selectedDateData.date, "d MMMM yyyy", { locale: th })}
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto pr-2 space-y-3 pt-4 custom-scrollbar">
            {selectedDateData?.bookings.map((b, i) => {
               const carIdx = cars.findIndex(c => c.id === b.car_id);
               const ramp = CAR_COLORS[carIdx % CAR_COLORS.length] || CAR_COLORS[0];
               const mergedTime = mergeTimeSlots(b.time_slot);

               return (
                <div key={b.id} onClick={() => { setSelectedDateData(null); setTimeout(() => setSelectedBooking(b), 150); }} className={`p-4 rounded-2xl border cursor-pointer transform transition-all duration-200 hover:scale-[1.02] active:scale-95 ${ramp.bg} ${ramp.border} ${ramp.text}`}>
                  <div className="flex justify-between items-start mb-3">
                    <div className="font-bold text-base flex items-center gap-2"><CarFront className="w-5 h-5 opacity-80" /> {b.cars?.plate}</div>
                    <div className="text-xs font-bold bg-white/60 dark:bg-black/20 px-2.5 py-1 rounded-lg border border-white/20 dark:border-white/10">{mergedTime}</div>
                  </div>
                  <div className="grid grid-cols-1 gap-2 text-sm font-medium opacity-90">
                    <div className="flex items-center gap-2"><User className="w-4 h-4 opacity-70" /> {b.driver_name}</div>
                    <div className="flex items-center gap-2"><MapPin className="w-4 h-4 opacity-70" /> <span className="truncate">{b.destination}</span></div>
                  </div>
                </div>
               )
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* ✨ Modal 2: ดูรายละเอียดแบบเต็มของ 1 คิว */}
      <Dialog open={!!selectedBooking} onOpenChange={() => setSelectedBooking(null)}>
        <DialogContent className="max-w-[95vw] sm:max-w-sm dark:bg-slate-800/95 dark:backdrop-blur-xl dark:border-slate-700 rounded-3xl animate-in fade-in slide-in-from-bottom-8 duration-300 p-0 overflow-hidden">
          
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-800 dark:to-indigo-900 p-6 text-white">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold flex items-center gap-2 text-white">
                <CarFront className="w-6 h-6 text-blue-200" /> รายละเอียดคิวรถ
              </DialogTitle>
            </DialogHeader>
          </div>

          {selectedBooking && (
             <div className="p-6 space-y-5 bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-300">
               
               <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border dark:border-slate-700">
                 <span className="text-slate-500 dark:text-slate-400 font-medium">ทะเบียนรถ</span>
                 <span className="font-black text-xl text-slate-800 dark:text-white">{selectedBooking.cars?.plate}</span>
               </div>
               
               <div className="space-y-4 px-1">
                 <div className="flex gap-4">
                   <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center shrink-0"><User className="w-4 h-4 text-blue-600 dark:text-blue-400" /></div>
                   <div><p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">ผู้ขับขี่</p><p className="font-bold text-base text-slate-800 dark:text-slate-200">{selectedBooking.driver_name}</p></div>
                 </div>
                 <div className="flex gap-4">
                   <div className="w-8 h-8 rounded-full bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center shrink-0"><Clock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /></div>
                   <div><p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">เวลาใช้งาน</p><p className="font-bold text-base text-slate-800 dark:text-slate-200">{mergeTimeSlots(selectedBooking.time_slot)}</p></div>
                 </div>
                 <div className="flex gap-4">
                   <div className="w-8 h-8 rounded-full bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center shrink-0"><MapPin className="w-4 h-4 text-amber-600 dark:text-amber-400" /></div>
                   <div><p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">สถานที่</p><p className="font-medium text-slate-800 dark:text-slate-200 leading-snug">{selectedBooking.destination}</p></div>
                 </div>
                 <div className="flex gap-4">
                   <div className="w-8 h-8 rounded-full bg-rose-50 dark:bg-rose-900/30 flex items-center justify-center shrink-0"><AlignLeft className="w-4 h-4 text-rose-600 dark:text-rose-400" /></div>
                   <div><p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">เหตุผล</p><p className="font-medium text-slate-800 dark:text-slate-200 leading-snug">{selectedBooking.reason || '-'}</p></div>
                 </div>
               </div>
               
               <div className="pt-2">
                 <Button onClick={() => setSelectedBooking(null)} className="w-full h-12 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-white rounded-xl font-bold text-base transition-colors">
                   ตกลง
                 </Button>
               </div>
             </div>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}