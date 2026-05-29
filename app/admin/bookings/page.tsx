"use client";
import { useEffect, useState, useMemo } from "react";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  EyeIcon,
  Search,
  SquarePen,
  Trash2,
  CalendarDays,
  Filter,
  CheckCircle2,
  AlertTriangle,
  History,
  Moon,
  Sun,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { format, isToday } from "date-fns";
import { th } from "date-fns/locale";
import "react-datepicker/dist/react-datepicker.css";
import { useAlert } from "@/components/ui/alert-provider";

// Import Modals
import DetailModal from "@/components/modals/DetailModal";
import MileageModal from "@/components/modals/MileageModal";
import EditBookingModal from "@/components/modals/EditBookingModal";

export default function AdminBookings() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [selectedMonthFilter, setSelectedMonthFilter] = useState<string>("all");
  const [hasAutoSelected, setHasAutoSelected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  // Modal States
  const [showDetail, setShowDetail] = useState<any | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<any | null>(null);
  const [editBooking, setEditBooking] = useState<any | null>(null);

  // 🌙 Dark Mode State
  const [isDarkMode, setIsDarkMode] = useState(false);

  const { showAlert } = useAlert();

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

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data.user);
      loadBookings();
    };
    init();
  }, []);

  const loadBookings = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("bookings")
      .select(
        `*, miles:miles!miles_booking_id_fkey(id, start_mile, end_mile, total_mile), cars(plate)`
      )
      .order("date", { ascending: false });

    if (error) console.error(error);
    else {
      const mapped = (data || []).map((b: any) => ({
        ...b,
        miles_status: b.miles ? "recorded" : "missing",
        total_mile: b.miles?.total_mile ?? null,
      }));
      setBookings(mapped);
    }
    setIsLoading(false);
  };

  const filteredBookings = useMemo(() => {
    let result = bookings;
    if (search.trim()) {
      const term = search.toLowerCase();
      result = result.filter(
        (b) =>
          b.user_name?.toLowerCase().includes(term) ||
          b.driver_name?.toLowerCase().includes(term) ||
          b.cars?.plate?.toLowerCase().includes(term)
      );
    }
    if (selectedMonthFilter !== "all") {
      result = result.filter((b) => b.date.startsWith(selectedMonthFilter));
    }
    return result;
  }, [search, bookings, selectedMonthFilter]);

  const availableMonths = useMemo(() => {
    if (bookings.length === 0) return [];
    const monthsSet = new Set(bookings.map((b) => b.date.substring(0, 7)));
    return Array.from(monthsSet).sort().reverse();
  }, [bookings]);

  useEffect(() => {
    if (availableMonths.length > 0 && !hasAutoSelected) {
      const currentMonth = new Date().toISOString().substring(0, 7);
      if (availableMonths.includes(currentMonth)) {
        setSelectedMonthFilter(currentMonth);
      } else {
        setSelectedMonthFilter(availableMonths[0]);
      }
      setHasAutoSelected(true);
    }
  }, [availableMonths, hasAutoSelected]);

  const deleteBooking = async (booking: any) => {
    showAlert({
      title: "ยืนยันการลบ",
      description: `คุณต้องการลบรายการจองของรถ ${booking.cars?.plate} หรือไม่?`,
      type: "confirm",
      onConfirm: async () => {
        const { error } = await supabase
          .from("bookings")
          .delete()
          .eq("id", booking.id);
        if (error) {
          showAlert({
            title: "ลบไม่สำเร็จ",
            description: error.message,
            type: "error",
          });
        } else {
          showAlert({
            title: "สำเร็จ",
            description: "ลบรายการสำเร็จ",
            type: "success",
          });
          loadBookings();
        }
      },
    });
  };

  const TIME_SLOTS = [
    "ก่อนเวลางาน", "08:00-09:00", "09:01-10:00", "10:01-11:00",
    "11:01-12:00", "13:00-14:00", "14:01-15:00", "15:01-16:00",
    "16:01-17:00", "หลังเวลางาน",
  ];

  function mergeTimeSlots(timeSlotString: string): string {
    if (!timeSlotString) return "";
    const slots = timeSlotString.split(",").map((s) => s.trim());
    if (slots.length === 1) return slots[0];
    const indexes = slots
      .map((s) => TIME_SLOTS.indexOf(s))
      .filter((i) => i !== -1)
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

    return groups.map((group) => {
      const first = TIME_SLOTS[group[0]];
      const last = TIME_SLOTS[group[group.length - 1]];
      if (group.length === 1) return first;
      return `${first.split("-")[0]}-${last.split("-").pop()}`;
    }).join(" และ ");
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-12 transition-colors duration-300">
      <Navbar />
      <main className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6 mt-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b dark:border-slate-700 pb-4">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 dark:bg-indigo-500 p-3 rounded-xl shadow-md">
              <History className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-white">ประวัติการจองทั้งหมด</h1>
              <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Admin Dashboard สำหรับตรวจสอบและจัดการรายการจอง</p>
            </div>
          </div>
          <Button onClick={toggleTheme} variant="outline" className="dark:bg-slate-800 dark:text-white dark:border-slate-700">
            {isDarkMode ? <Sun className="w-4 h-4 mr-2 text-amber-400" /> : <Moon className="w-4 h-4 mr-2 text-indigo-500" />}
            {isDarkMode ? "Light Mode" : "Dark Mode"}
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input placeholder="ค้นหาชื่อผู้จอง, ผู้ขับ หรือทะเบียนรถ..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 h-11 bg-white dark:bg-slate-800 dark:text-white dark:border-slate-700" />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <select value={selectedMonthFilter} onChange={(e) => setSelectedMonthFilter(e.target.value)} className="w-full h-11 pl-10 pr-4 bg-white dark:bg-slate-800 dark:text-white border dark:border-slate-700 rounded-md outline-none focus:ring-2 focus:ring-indigo-500 appearance-none">
              <option value="all">แสดงข้อมูลทุกเดือน</option>
              {availableMonths.map((m) => (
                <option key={m} value={m}>{format(new Date(m), "MMMM yyyy", { locale: th })}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border dark:border-slate-700 overflow-hidden">
          {isLoading ? (
            <div className="p-20 text-center"><div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full mx-auto mb-4"></div><p className="text-slate-500">กำลังโหลดข้อมูล...</p></div>
          ) : filteredBookings.length === 0 ? (
            <div className="p-20 text-center text-slate-400">ไม่พบข้อมูลที่ค้นหา</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs sm:text-sm">
                <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-600 dark:text-slate-400 border-b dark:border-slate-700">
                  <tr>
                    <th className="p-3 text-left">อีเมลผู้จอง</th>
                    <th className="p-3">ชื่อผู้ขับ</th>
                    <th className="p-3">ทะเบียนรถ</th>
                    <th className="p-3">วันที่</th>
                    <th className="p-3">ช่วงเวลา</th>
                    <th className="p-3 text-left">สถานที่</th>
                    <th className="p-3">สถานะไมล์</th>
                    <th className="p-3">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y dark:divide-slate-700">
                  {filteredBookings.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 dark:text-slate-200">
                      <td className="p-3 max-w-[150px] truncate">{b.user_name}</td>
                      <td className="p-3 text-center">{b.driver_name}</td>
                      <td className="p-3 text-center"><Badge variant="outline" className="dark:text-slate-300 dark:border-slate-600">{b.cars?.plate}</Badge></td>
                      <td className="p-3 text-center">{b.date}</td>
                      <td className="p-3 text-center text-slate-500 dark:text-slate-400">{mergeTimeSlots(b.time_slot)}</td>
                      <td className="p-3 truncate max-w-[150px]">{b.destination}</td>
                      <td className="p-3 text-center">
                        {b.miles_status === "recorded" ? (
                          <span className="text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> {b.total_mile} กม.</span>
                        ) : (
                          <Button size="sm" variant="ghost" className="text-orange-500 h-7" onClick={() => setSelectedBooking(b)}><AlertTriangle className="w-3.5 h-3.5 mr-1" /> ลงไมล์</Button>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex justify-center gap-1">
                          <Button size="sm" variant="ghost" onClick={() => setShowDetail(b)} className="h-8 w-8 p-0 text-blue-600 dark:text-blue-400"><EyeIcon className="w-4 h-4" /></Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditBooking(b)} className="h-8 w-8 p-0 text-amber-600 dark:text-amber-400"><SquarePen className="w-4 h-4" /></Button>
                          <Button size="sm" variant="ghost" onClick={() => deleteBooking(b)} className="h-8 w-8 p-0 text-red-600 dark:text-red-400"><Trash2 className="w-4 h-4" /></Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modals */}
        <DetailModal isOpen={!!showDetail} onClose={() => setShowDetail(null)} booking={showDetail} />
        <MileageModal isOpen={!!selectedBooking} onClose={() => setSelectedBooking(null)} booking={selectedBooking} onSuccess={loadBookings} />
        <EditBookingModal isOpen={!!editBooking} onClose={() => setEditBooking(null)} booking={editBooking} isAdmin={true} user={user} onSuccess={loadBookings} />
      </main>
    </div>
  );
}
