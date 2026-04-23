"use client";
import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import AnnouncementPopup from "@/components/AnnouncementPopup";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  GaugeIcon,
  EyeIcon,
  Search,
  SquarePen,
  Edit,
  Trash2,
  CalendarIcon,
  MapPinIcon,
  CarIcon,
  UserIcon,
} from "lucide-react";
import { useAuthRedirect } from "@/hooks/useAuthRedirect";
import { format, isToday } from "date-fns";
import { th } from "date-fns/locale";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

export default function Dashboard() {
  useAuthRedirect(true); // ✅ บังคับให้ login ก่อนเข้าได้

  const [bookings, setBookings] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [selectedBooking, setSelectedBooking] = useState<any | null>(null);
  const [showDetail, setShowDetail] = useState<any | null>(null);
  const [startMile, setStartMile] = useState("");
  const [endMile, setEndMile] = useState("");
  const [usedMile, setUsedMile] = useState<number | null>(null);
  const [user, setUser] = useState<any>(null);
  const [editBooking, setEditBooking] = useState<any | null>(null);
  const [selectedEditTimes, setSelectedEditTimes] = useState<string[]>([]);
  const [editBookingStatus, setEditBookingStatus] = useState<
    Record<string, string>
  >({});
  const [filteredBookings, setFilteredBookings] = useState<any[]>([]);
  const [editStartMile, setEditStartMile] = useState("");
  const [editEndMile, setEditEndMile] = useState("");
  const [alerts, setAlerts] = useState<any[]>([]);

  // ✅ State สำหรับตัวกรองเดือน
  const [selectedMonthFilter, setSelectedMonthFilter] = useState<string>("all");
  const [hasAutoSelected, setHasAutoSelected] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data: cars } = await supabase.from("cars").select("*");
      const { data: maintenance } = await supabase
        .from("car_maintenance")
        .select("*");
      const { data: log } = await supabase.from("car_mileage_log").select("*");

      const result: any[] = [];

      cars?.forEach((car) => {
        const m = maintenance.find((x) => x.car_id === car.id);
        const mg = log.find((x) => x.car_id === car.id);

        if (!m || !mg) return;

        const remain = m.next_service_mileage - mg.current_mileage;

        if (remain <= m.alert_before_mileage) {
          result.push({
            plate: car.plate,
            remain,
          });
        }
      });

      setAlerts(result);
    };

    load();
  }, []);

  const [editForm, setEditForm] = useState({
    driver_name: "",
    destination: "",
    reason: "",
    date: new Date(),
  });

  const router = useRouter();

  useEffect(() => {
    if (editBooking) {
      const loadMiles = async () => {
        const { data } = await supabase
          .from("miles")
          .select("start_mile, end_mile")
          .eq("booking_id", editBooking.id)
          .maybeSingle();

        if (data) {
          setEditStartMile(data.start_mile?.toString() || "");
          setEditEndMile(data.end_mile?.toString() || "");
        } else {
          setEditStartMile("");
          setEditEndMile("");
        }
      };

      loadMiles();
    }
  }, [editBooking]);

  const handleDeleteBooking = async (booking: any) => {
    if (!confirm("ต้องการลบรายการจองนี้หรือไม่?")) return;

    await fetch("/api/line/notify-delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_name: user.email,
        driver_name: booking.driver_name,
        car_plate: booking.cars?.plate || "",
        date: booking.date,
        destination: booking.destination,
      }),
    });

    await fetch("/api/telegram/notify-delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_name: user.email,
        driver_name: booking.driver_name,
        car_plate: booking.cars?.plate || "",
        date: booking.date,
        destination: booking.destination,
      }),
    });

    const { error } = await supabase
      .from("bookings")
      .delete()
      .eq("id", booking.id)
      .eq("user_id", user.id);

    if (error) alert(error.message);
    else {
      alert("ลบรายการสำเร็จ");
      loadBookings();
    }
  };

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

    const formattedGroups = groups.map((group) => {
      const firstSlot = TIME_SLOTS[group[0]];
      const lastSlot = TIME_SLOTS[group[group.length - 1]];

      if (group.length === 1) return firstSlot;

      if (firstSlot === "ก่อนเวลางาน") {
        const endTime = lastSlot.split("-").pop();
        return `ก่อนเวลางาน-${endTime}`;
      }

      if (lastSlot === "หลังเวลางาน") {
        const startTime = firstSlot.split("-")[0];
        return `${startTime}-หลังเวลางาน`;
      }

      const startTime = firstSlot.split("-")[0];
      const endTime = lastSlot.split("-").pop();
      return `${startTime}-${endTime}`;
    });

    return formattedGroups.join(" และ ");
  }

  useEffect(() => {
    const getUserAndLoad = async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        setUser(data.user);
        loadBookings();
      }
    };
    getUserAndLoad();
  }, []);

  const loadBookings = async () => {
    const { data, error } = await supabase
      .from("bookings")
      .select(
        `
    *,
    miles:miles!miles_booking_id_fkey(
    id,
      start_mile,
      end_mile,
      total_mile
    ),
    cars(plate)
  `,
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
      setFilteredBookings(mapped);
    }
  };

  useEffect(() => {
    if (!search.trim()) {
      setFilteredBookings(bookings);
      return;
    }

    const term = search.toLowerCase();
    const filtered = bookings.filter(
      (b) =>
        b.user_name?.toLowerCase().includes(term) ||
        b.driver_name?.toLowerCase().includes(term) ||
        b.cars?.plate?.toLowerCase().includes(term),
    );

    setFilteredBookings(filtered);
  }, [search, bookings]);

  useEffect(() => {
    const checkBookingAvailability = async () => {
      if (!editBooking?.car_id || !editForm.date) return;

      const { data, error } = await supabase
        .from("bookings")
        .select("time_slot, driver_name")
        .eq("car_id", editBooking.car_id)
        .eq("date", editForm.date.toISOString().split("T")[0]);

      if (error) {
        console.error("Error loading booking availability:", error);
        return;
      }

      const status: Record<string, string> = {};
      for (const slot of TIME_SLOTS) status[slot] = "ว่าง";

      for (const booking of data || []) {
        const bookedSlots = booking.time_slot.split(",").map((s) => s.trim());
        for (const slot of TIME_SLOTS) {
          if (bookedSlots.includes(slot)) status[slot] = booking.driver_name;
        }
      }

      setEditBookingStatus(status);
    };

    if (editBooking) checkBookingAvailability();
  }, [editBooking, editForm.date]);

  useEffect(() => {
    if (startMile && endMile) {
      const total = Number(endMile) - Number(startMile);
      setUsedMile(total >= 0 ? total : 0);
    } else setUsedMile(null);
  }, [startMile, endMile]);

  const handleSaveMiles = async () => {
    if (!startMile || !endMile) return alert("กรุณากรอกเลขไมล์ให้ครบ");
    const total = Number(endMile) - Number(startMile);
    if (total < 0) return alert("เลขไมล์สิ้นสุดต้องมากกว่าเลขไมล์เริ่มต้น");

    const { error } = await supabase.from("miles").insert({
      booking_id: selectedBooking.id,
      start_mile: Number(startMile),
      end_mile: Number(endMile),
    });

    if (error) alert(error.message);
    else {
      alert(`บันทึกเลขไมล์เรียบร้อย (ใช้ไป ${total} กม.)`);
      setSelectedBooking(null);
      setStartMile("");
      setEndMile("");
      setUsedMile(null);
      await loadBookings();
    }
  };

  // ✅ ย้าย availableMonths ขึ้นมาอยู่ด้านบนก่อน if (!user)
  const availableMonths = useMemo(() => {
    if (filteredBookings.length === 0) return [];

    const monthsSet = new Set(
      filteredBookings.map((b) => b.date.substring(0, 7)), // ดึงแค่ YYYY-MM
    );

    return Array.from(monthsSet).sort().reverse();
  }, [filteredBookings]);

  useEffect(() => {
    if (availableMonths.length > 0 && !hasAutoSelected) {
      setSelectedMonthFilter(availableMonths[0]);
      setHasAutoSelected(true); // ล็อกไว้ว่าตั้งค่าแล้ว ครั้งต่อไปที่กด "ดูทั้งหมด" จะได้ไม่เด้งกลับ
    }
  }, [availableMonths, hasAutoSelected]);

  if (!user) {
    return (
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
    );
  }

  return (
    <>
      {/* แจ้งเตือน */}
      {alerts.length > 0 && (
        <div className="alert-container">
          {alerts.map((a, idx) => (
            <div
              key={idx}
              className="premium-alert"
              style={{ animationDelay: `${idx * 0.1}s` }}
            >
              <div className="alert-content">
                <div className="alert-icon">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 20 20"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <circle cx="10" cy="10" r="9" className="ring-pulse" />
                  </svg>
                </div>
                <div className="alert-text">
                  <span className="alert-plate">รถทะเบียน {a.plate}</span>
                  <span className="alert-message">
                    เหลืออีก {a.remain} กม. ถึงกำหนดเข้าศูนย์
                  </span>
                </div>
              </div>
              <button
                className="alert-close"
                onClick={() => {
                  const element =
                    document.querySelectorAll(".premium-alert")[idx];
                  element?.classList.add("removing");
                  setTimeout(() => {
                    setAlerts((prev) => prev.filter((_, i) => i !== idx));
                  }, 400);
                }}
                aria-label="ปิดการแจ้งเตือน"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
      <style jsx>{`
        @keyframes slideInDown {
          from {
            transform: translateY(-100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        @keyframes fadeOut {
          from {
            opacity: 1;
            transform: scale(1);
          }
          to {
            opacity: 0;
            transform: scale(0.95);
          }
        }

        @keyframes pulseGlow {
          0%,
          100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.8;
            transform: scale(1.1);
          }
        }

        @keyframes ringPulse {
          0%,
          100% {
            stroke-dasharray: 0 100;
            opacity: 0.6;
          }
          50% {
            stroke-dasharray: 50 100;
            opacity: 1;
          }
        }

        @keyframes shimmer {
          0% {
            background-position: -200% center;
          }
          100% {
            background-position: 200% center;
          }
        }

        .alert-container {
          position: relative;
        }

        .premium-alert {
          background: linear-gradient(
            135deg,
            #dc2626 0%,
            #ef4444 50%,
            #f87171 100%
          );
          border-radius: 12px;
          padding: 16px 20px;
          margin-bottom: 12px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          animation: slideInDown 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
          opacity: 0;
          box-shadow:
            0 4px 12px rgba(220, 38, 38, 0.3),
            0 2px 4px rgba(0, 0, 0, 0.1);
          position: relative;
          overflow: hidden;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .premium-alert::before {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(255, 255, 255, 0.2),
            transparent
          );
          background-size: 200% 100%;
          animation: shimmer 3s infinite;
          pointer-events: none;
        }

        .premium-alert:hover {
          transform: translateY(-2px);
          box-shadow:
            0 6px 16px rgba(220, 38, 38, 0.4),
            0 4px 8px rgba(0, 0, 0, 0.15);
        }

        .premium-alert.removing {
          animation: fadeOut 0.4s cubic-bezier(0.4, 0, 1, 1) forwards;
        }

        .alert-content {
          display: flex;
          align-items: center;
          gap: 12px;
          flex: 1;
          position: relative;
          z-index: 1;
        }

        .alert-icon {
          width: 40px;
          height: 40px;
          background: rgba(255, 255, 255, 0.25);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          animation: pulseGlow 2s ease-in-out infinite;
          backdrop-filter: blur(8px);
          color: white;
        }

        .ring-pulse {
          animation: ringPulse 2s ease-in-out infinite;
        }

        .alert-text {
          display: flex;
          flex-direction: column;
          gap: 4px;
          color: white;
        }

        .alert-plate {
          font-size: 16px;
          font-weight: 500;
          letter-spacing: 0.3px;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
        }

        .alert-message {
          font-size: 14px;
          opacity: 0.95;
          font-weight: 400;
        }

        .alert-close {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.2);
          border: none;
          color: white;
          font-size: 24px;
          line-height: 1;
          cursor: pointer;
          flex-shrink: 0;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          z-index: 1;
          backdrop-filter: blur(8px);
        }

        .alert-close:hover {
          background: rgba(255, 255, 255, 0.35);
          transform: rotate(90deg) scale(1.1);
        }

        .alert-close:active {
          transform: rotate(90deg) scale(0.95);
        }
      `}</style>
      <Navbar />
      <AnnouncementPopup />
      <div className="p-6">
        <main className="p-4 sm:p-6 max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-3">
            <h1 className="text-xl sm:text-2xl font-bold text-blue-700">
              รายการจองรถ
            </h1>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              {/* สร้าง div relative มาครอบ Input และ Icon ไว้ด้วยกัน */}
              <div className="relative w-full md:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="ค้นหาชื่อผู้จอง / ผู้ขับ / ทะเบียนรถ"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9" /* เพิ่ม pl-9 เพื่อหลบไอคอนแว่นขยาย */
                />
              </div>

              <Button onClick={() => (location.href = "/booking")}>
                + จองรถ
              </Button>
            </div>
          </div>

          {/* ✅ ส่วนเลือกเดือน (Month Filter Tabs) - ดีไซน์เรียบๆ ตามของเดิม */}
          {availableMonths.length > 0 && (
            <div className="flex overflow-x-auto pb-2 mb-4 gap-2 scrollbar-hide">
              <Button
                variant={selectedMonthFilter === "all" ? "default" : "outline"}
                className={
                  selectedMonthFilter === "all"
                    ? "bg-blue-700 text-white"
                    : "text-gray-600"
                }
                onClick={() => setSelectedMonthFilter("all")}
                size="sm"
              >
                ดูทั้งหมด
              </Button>
              {availableMonths.map((monthStr) => {
                const [year, month] = monthStr.split("-");
                const monthName = format(
                  new Date(Number(year), Number(month) - 1),
                  "MMMM yyyy",
                  { locale: th },
                );
                const isSelected = selectedMonthFilter === monthStr;

                return (
                  <Button
                    key={monthStr}
                    variant={isSelected ? "default" : "outline"}
                    className={
                      isSelected ? "bg-blue-700 text-white" : "text-gray-600"
                    }
                    onClick={() => setSelectedMonthFilter(monthStr)}
                    size="sm"
                  >
                    {monthName}
                  </Button>
                );
              })}
            </div>
          )}

          <div className="bg-white rounded-xl shadow overflow-hidden">
            {Object.entries(
              filteredBookings
                // 1. กรองเฉพาะเดือนที่ถูกเลือก (ถ้าไม่เลือก "all")
                .filter((booking) => {
                  if (selectedMonthFilter === "all") return true;
                  return booking.date.startsWith(selectedMonthFilter);
                })
                .reduce(
                  (groups, booking) => {
                    const date = new Date(booking.date)
                      .toISOString()
                      .split("T")[0]; // ✅ normalize วันที่
                    if (!groups[date]) groups[date] = [];
                    groups[date].push(booking);
                    return groups;
                  },
                  {} as Record<string, any[]>,
                ),
            )
              // ✅ เรียงจากวันใหม่ → เก่า
              .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
              .map(([date, group]: [string, any[]], index) => {
                // ✅ แปลงวันที่เพื่อใช้ใน format และเปรียบเทียบเดือน
                const d = new Date(date);
                const month = d.getMonth();
                const isEvenMonth = month % 2 === 0;
                const canManage = group.some((b) => b.user_id === user.id);

                // ✅ กำหนดสีพื้นหลังของหัวแต่ละเดือนสลับกันตาม Original
                const bgColor = isToday(d)
                  ? "bg-green-600"
                  : isEvenMonth
                    ? "bg-gray-700"
                    : "bg-gray-600";

                return (
                  <div key={date} className="border-b last:border-none">
                    {/* ✅ ส่วนหัวของแต่ละวัน */}
                    <div
                      className={`px-4 py-2 text-sm sm:text-base font-semibold text-white flex justify-between items-center ${bgColor}`}
                    >
                      <div>
                        📅 {format(d, "dd MMMM yyyy", { locale: th })}{" "}
                        {isToday(d) && "(วันนี้)"}
                      </div>
                      <div className="text-sm text-gray-200">
                        ({group.length.toLocaleString("th-TH")} รายการ)
                      </div>
                    </div>

                    {/* ✅ ตารางข้อมูลของวันนั้น */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs sm:text-sm min-w-[700px]">
                        <thead className="bg-blue-100 text-blue-800">
                          <tr>
                            {/* <th className="p-2 sm:p-3 text-left">อีเมลผู้จอง</th> */}
                            <th className="p-2 sm:p-3">ชื่อผู้ขับ</th>
                            <th className="p-2 sm:p-3">ทะเบียนรถ</th>
                            <th className="p-2 sm:p-3">วันที่</th>
                            <th className="p-2 sm:p-3">ช่วงเวลา</th>
                            <th className="p-2 sm:p-3">สถานที่</th>
                            <th className="p-2 sm:p-3">เหตุผล</th>
                            <th className="p-2 sm:p-3 text-center">
                              สถานะไมล์
                            </th>
                            <th className="p-2 sm:p-3 text-center">ดู</th>
                            {/* ✨ แสดงเฉพาะเมื่อมีสิทธิ์แก้ไข */}
                            {canManage && (
                              <th className="p-2 sm:p-3 text-center">จัดการ</th>
                            )}
                          </tr>
                        </thead>
                        <tbody>
                          {group.map((b: any) => (
                            <tr
                              key={b.id}
                              className="border-b hover:bg-blue-50"
                            >
                              {/* <td className="p-2 sm:p-3">{b.user_name}</td> */}
                              <td className="p-2 sm:p-3 text-center">
                                {b.driver_name}
                              </td>
                              <td className="p-2 sm:p-3 text-center">
                                <Badge>{b.cars?.plate}</Badge>
                              </td>
                              <td className="p-2 sm:p-3 text-center">
                                {b.date}
                              </td>
                              <td className="p-2 sm:p-3 text-center">
                                {mergeTimeSlots(b.time_slot)}
                              </td>
                              <td className="p-2 sm:p-3">{b.destination}</td>
                              <td className="p-2 sm:p-3">{b.reason}</td>
                              {/* ✅ แสดงสถานะเลขไมล์ */}
                              <td className="p-2 sm:p-3 text-center">
                                {b.miles_status === "recorded" ? (
                                  <span className="text-green-700 font-semibold">
                                    ✅ บันทึกแล้ว ({b.total_mile} กม.)
                                  </span>
                                ) : (
                                  <span className="text-orange-600 font-semibold">
                                    ⚠️ ยังไม่ได้บันทึกเลขไมล์
                                  </span>
                                )}
                              </td>
                              <td className="p-2 sm:p-3 text-center">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={async () => {
                                    const { data: milesData, error } =
                                      await supabase
                                        .from("miles")
                                        .select(
                                          "start_mile, end_mile, total_mile",
                                        )
                                        .eq("booking_id", b.id)
                                        .limit(1)
                                        .maybeSingle();

                                    if (error)
                                      console.error(
                                        "Error loading miles:",
                                        error,
                                      );
                                    setShowDetail({
                                      ...b,
                                      miles: milesData || null,
                                    });
                                  }}
                                >
                                  <EyeIcon className="w-4 h-4 mr-1" /> ดู
                                </Button>
                                <Button
                                  size="sm"
                                  variant={
                                    b.miles_status === "recorded"
                                      ? "secondary"
                                      : "outline"
                                  }
                                  disabled={b.miles_status === "recorded"}
                                  onClick={() => {
                                    if (b.miles_status === "recorded") return; // ป้องกันคลิก
                                    setSelectedBooking(b);
                                  }}
                                  className={
                                    b.miles_status === "recorded"
                                      ? "opacity-50 cursor-not-allowed"
                                      : ""
                                  }
                                >
                                  <GaugeIcon className="w-4 h-4 mr-1" /> ไมล์
                                </Button>
                              </td>
                              {/* ✨ แสดงเฉพาะเมื่อผู้ใช้มีสิทธิ์ */}
                              {canManage && (
                                <td className="p-2 sm:p-3 text-center space-x-2">
                                  {b.user_id === user.id && (
                                    <>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => {
                                          setEditForm({
                                            driver_name: b.driver_name,
                                            destination: b.destination,
                                            reason: b.reason,
                                            date: new Date(b.date),
                                          });
                                          setSelectedEditTimes(
                                            b.time_slot
                                              .split(",")
                                              .map((s: string) => s.trim()),
                                          );
                                          setEditBooking(b);
                                        }}
                                        className="text-amber-600 hover:bg-amber-50"
                                      >
                                        <SquarePen className="w-4 h-4 mr-1" /> แก้ไข
                                      </Button>

                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={
                                          () => handleDeleteBooking(b) // ✅ ส่งทั้งก้อน booking ไปยังฟังก์ชันลบ
                                        }
                                        className="text-red-600 hover:bg-red-50"
                                      >
                                        <Trash2 className="w-4 h-4 mr-1" /> ลบ
                                      </Button>
                                    </>
                                  )}
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
          </div>

          {/* ✅ Dialog แสดงรายละเอียด */}
          <Dialog open={!!showDetail} onOpenChange={() => setShowDetail(null)}>
            <DialogContent className="w-[95vw] sm:max-w-md">
              <DialogHeader>
                <DialogTitle>รายละเอียดการจอง</DialogTitle>
              </DialogHeader>
              {showDetail && (
                <div className="space-y-2 text-sm">
                  <p>
                    <b>อีเมลผู้จอง:</b> {showDetail.user_name}
                  </p>
                  <p>
                    <b>ชื่อผู้ขับ:</b> {showDetail.driver_name}
                  </p>
                  <p>
                    <b>ทะเบียนรถ:</b> {showDetail.cars?.plate}
                  </p>
                  <p>
                    <b>วันที่:</b> {showDetail.date}
                  </p>
                  <p>
                    <b>ช่วงเวลา:</b> {showDetail.time_slot}
                  </p>
                  <p>
                    <b>สถานที่:</b> {showDetail.destination}
                  </p>
                  <p>
                    <b>เหตุผล:</b> {showDetail.reason}
                  </p>

                  {/* ✅ แสดงเลขไมล์ถ้ามี */}
                  {showDetail.miles ? (
                    <div className="pt-2 border-t mt-2">
                      <p>
                        <b>เลขไมล์เริ่มต้น:</b> {showDetail.miles.start_mile}
                      </p>
                      <p>
                        <b>เลขไมล์สิ้นสุด:</b> {showDetail.miles.end_mile}
                      </p>
                      <p className="text-blue-700 font-semibold">
                        🚗 ใช้ไปทั้งหมด{" "}
                        {showDetail.miles.total_mile ??
                          showDetail.miles.end_mile -
                            showDetail.miles.start_mile}{" "}
                        กม.
                      </p>
                    </div>
                  ) : (
                    <p className="italic text-gray-400 pt-2 border-t mt-2">
                      ยังไม่ได้บันทึกเลขไมล์
                    </p>
                  )}
                </div>
              )}
            </DialogContent>
          </Dialog>

          {/* ✅ Dialog กรอกเลขไมล์ */}
          <Dialog
            open={!!selectedBooking}
            onOpenChange={() => setSelectedBooking(null)}
          >
            <DialogContent className="w-[95vw] sm:max-w-md">
              <DialogHeader>
                <DialogTitle>บันทึกเลขไมล์</DialogTitle>
              </DialogHeader>
              {selectedBooking && (
                <div className="space-y-3">
                  <p className="text-sm text-gray-600">
                    รถทะเบียน <b>{selectedBooking.cars?.plate}</b> <br />
                    ผู้ขับ: <b>{selectedBooking.driver_name}</b>
                  </p>
                  <Input
                    type="number"
                    placeholder="เลขไมล์เริ่มต้น"
                    value={startMile}
                    onChange={(e) => setStartMile(e.target.value)}
                  />
                  <Input
                    type="number"
                    placeholder="เลขไมล์สิ้นสุด"
                    value={endMile}
                    onChange={(e) => setEndMile(e.target.value)}
                  />
                  {usedMile !== null && (
                    <p className="text-center text-sm text-blue-700">
                      รวมระยะทางที่ใช้: <b>{usedMile}</b> กม.
                    </p>
                  )}
                  <Button className="w-full" onClick={handleSaveMiles}>
                    💾 บันทึกเลขไมล์
                  </Button>
                </div>
              )}
            </DialogContent>
          </Dialog>

          <Dialog
            open={!!editBooking}
            onOpenChange={() => setEditBooking(null)}
          >
            <DialogContent className="w-[95vw] sm:max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>แก้ไขการจอง</DialogTitle>
              </DialogHeader>

              {editBooking && (
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();

                    // ✅ รวมช่วงเวลาที่เลือกไว้เป็น string เดียว
                    const newTimeSlots = TIME_SLOTS.filter((slot) =>
                      selectedEditTimes.includes(slot),
                    ).join(", ");

                    // ✅ ตรวจสอบว่ามีการเลือกเวลาหรือยัง
                    if (!newTimeSlots) {
                      alert("กรุณาเลือกช่วงเวลาอย่างน้อย 1 ช่วง");
                      return;
                    }

                    // ✅ ตรวจสอบเวลาที่ซ้ำกับคนอื่น (แต่ไม่นับรายการตัวเอง)
                    const { data: checkData, error: checkError } =
                      await supabase
                        .from("bookings")
                        .select("id, time_slot")
                        .eq("car_id", editBooking.car_id)
                        .eq("date", editForm.date.toISOString().split("T")[0]);

                    if (checkError) {
                      console.error("Error checking bookings:", checkError);
                      alert("ไม่สามารถตรวจสอบเวลาว่างได้");
                      return;
                    }

                    // ✅ ตรวจสอบว่าช่วงเวลาที่เลือกไปซ้ำกับของคนอื่นไหม
                    const conflict = checkData?.some((b) => {
                      if (b.id === editBooking.id) return false; // ข้ามของตัวเอง
                      const booked = b.time_slot
                        .split(",")
                        .map((s: string) => s.trim());
                      return booked.some((slot: string) =>
                        selectedEditTimes.includes(slot),
                      );
                    });

                    if (conflict) {
                      alert("บางช่วงเวลาที่เลือกถูกจองแล้ว กรุณาเลือกเวลาใหม่");
                      return;
                    }

                    // ✅ อัปเดตข้อมูล
                    // 1) อัปเดต booking ก่อน
                    const { error: bookingError } = await supabase
                      .from("bookings")
                      .update({
                        driver_name: editForm.driver_name,
                        destination: editForm.destination,
                        reason: editForm.reason,
                        time_slot: newTimeSlots,
                        date: editForm.date.toLocaleDateString("sv-SE"),
                      })
                      .eq("id", editBooking.id)
                      .eq("user_id", user.id);

                    if (bookingError) {
                      console.error("Update booking error:", bookingError);
                      alert(bookingError.message);
                      return;
                    }

                    // 2) อัปเดตเลขไมล์ (เฉพาะถ้ากรอก)
                    if (editStartMile && editEndMile) {
                      const total = Number(editEndMile) - Number(editStartMile);

                      const { error: milesError } = await supabase
                        .from("miles")
                        .upsert(
                          {
                            booking_id: editBooking.id, // ใช้ number ตรง ๆ
                            start_mile: Number(editStartMile),
                            end_mile: Number(editEndMile),
                            // total_mile: total
                          },
                          { onConflict: "booking_id" }, // สำคัญมาก ถ้าไม่ใส่ จะไม่แก้ค่าเดิม!
                        );

                      if (milesError) {
                        console.error("Miles update error:", milesError);
                        alert(
                          "ไม่สามารถอัปเดตเลขไมล์ได้: " + milesError.message,
                        );
                        return;
                      }
                    }
                    // 3) สำเร็จ → ปิด dialog + รีโหลด
                    // 🎉 ส่งแจ้งเตือน LINE เมื่อมีการแก้ไขการจอง
                    // 🟢 ส่งแจ้งเตือน LINE เมื่อแก้ไข
                    await fetch("/api/line/notify-edit", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        user_name: user.email,
                        driver_name: editForm.driver_name,
                        destination: editForm.destination,
                        time_slot: newTimeSlots,
                        date: editForm.date.toLocaleDateString("sv-SE"),
                        car_plate: editBooking.cars?.plate || "",
                        reason: editForm.reason,
                      }),
                    });

                    // 🎉 ส่งแจ้งเตือน Telegram เมื่อแก้ไข
                    await fetch("/api/telegram/notify-edit", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        user_name: user.email,
                        driver_name: editForm.driver_name,
                        destination: editForm.destination,
                        time_slot: newTimeSlots,
                        date: editForm.date.toLocaleDateString("sv-SE"),
                        car_plate: editBooking.cars?.plate || "",
                        reason: editForm.reason,
                      }),
                    });

                    alert("อัปเดตข้อมูลเรียบร้อย ✅");
                    setEditBooking(null);
                    loadBookings();
                  }}
                  className="space-y-3"
                >
                  <label className="block text-sm font-medium">
                    ชื่อผู้ขับ
                  </label>
                  <Input
                    value={editForm.driver_name}
                    onChange={(e) =>
                      setEditForm({ ...editForm, driver_name: e.target.value })
                    }
                  />

                  <label className="block text-sm font-medium">สถานที่</label>
                  <Input
                    value={editForm.destination}
                    onChange={(e) =>
                      setEditForm({ ...editForm, destination: e.target.value })
                    }
                  />

                  <label className="block text-sm font-medium">เหตุผล</label>
                  <Input
                    value={editForm.reason}
                    onChange={(e) =>
                      setEditForm({ ...editForm, reason: e.target.value })
                    }
                  />
                  {/* แก้ไขเลขไมล์ */}
                  <div className="border-t pt-3">
                    <label className="block text-sm font-medium">
                      เลขไมล์เริ่มต้น
                    </label>
                    <Input
                      type="number"
                      value={editStartMile}
                      onChange={(e) => setEditStartMile(e.target.value)}
                      placeholder="เลขไมล์เริ่มต้น"
                    />

                    <label className="block text-sm font-medium mt-2">
                      เลขไมล์สิ้นสุด
                    </label>
                    <Input
                      type="number"
                      value={editEndMile}
                      onChange={(e) => setEditEndMile(e.target.value)}
                      placeholder="เลขไมล์สิ้นสุด"
                    />
                  </div>

                  {/* ✅ ส่วนเลือกช่วงเวลาใหม่ */}
                  {/* ✅ ส่วนเลือกวันที่ใหม่ */}
                  <label className="block text-sm font-medium">วันที่</label>
                  <DatePicker
                    selected={editForm.date}
                    onChange={(d: Date | null) => {
                      if (d) setEditForm({ ...editForm, date: d });
                    }}
                    dateFormat="dd/MM/yyyy"
                    className="border rounded-md p-2 w-full"
                  />

                  <label className="block text-sm font-medium">
                    ช่วงเวลาที่ต้องการแก้ไข
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {TIME_SLOTS.map((slot) => {
                      const isBooked =
                        editBookingStatus[slot] &&
                        editBookingStatus[slot] !== "ว่าง";
                      const bookedBy = editBookingStatus[slot];
                      const isSelected = selectedEditTimes.includes(slot);

                      return (
                        <Button
                          key={slot}
                          type="button"
                          variant={isSelected ? "default" : "outline"}
                          onClick={() => {
                            if (
                              !isBooked ||
                              bookedBy === editForm.driver_name
                            ) {
                              setSelectedEditTimes((prev) =>
                                prev.includes(slot)
                                  ? prev.filter((s) => s !== slot)
                                  : [...prev, slot],
                              );
                            }
                          }}
                          disabled={
                            isBooked && bookedBy !== editForm.driver_name
                          }
                          className="flex items-center justify-center gap-1"
                        >
                          {slot}
                          {isBooked ? (
                            <Badge className="ml-1 bg-red-500">
                              {bookedBy}
                            </Badge>
                          ) : (
                            <Badge className="ml-1 bg-green-500">ว่าง</Badge>
                          )}
                        </Button>
                      );
                    })}
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-blue-600 text-white"
                  >
                    💾 บันทึกการแก้ไข
                  </Button>
                </form>
              )}
            </DialogContent>
          </Dialog>
        </main>
      </div>
    </>
  );
}
