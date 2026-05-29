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
  EyeIcon,
  Search,
  SquarePen,
  Trash2,
  CarIcon,
  ArrowRightLeft,
  ShieldCheck,
  MapPin,
  Clock,
  User,
  Moon,
  Sun,
  CalendarDays,
  Filter,
  CheckCircle2,
  AlertCircle,
  GaugeIcon,
  Rocket,
  Star,
} from "lucide-react";
import { useAuthRedirect } from "@/hooks/useAuthRedirect";
import { format, isToday } from "date-fns";
import { th } from "date-fns/locale";
import "react-datepicker/dist/react-datepicker.css";
import { useAlert } from "@/components/ui/alert-provider";

// Import Modals
import DetailModal from "@/components/modals/DetailModal";
import MileageModal from "@/components/modals/MileageModal";
import EditBookingModal from "@/components/modals/EditBookingModal";
import SwapCarModal from "@/components/modals/SwapCarModal";

// ฟังก์ชันเช็กช่วงเวลาปัจจุบัน
const getCurrentTimeSlot = () => {
  const now = new Date();
  const time = now.getHours() * 100 + now.getMinutes();

  if (time < 800) return "ก่อนเวลางาน";
  if (time >= 800 && time <= 900) return "08:00-09:00";
  if (time > 900 && time <= 1000) return "09:01-10:00";
  if (time > 1000 && time <= 1100) return "10:01-11:00";
  if (time > 1100 && time <= 1200) return "11:01-12:00";
  if (time > 1200 && time <= 1400) return "13:00-14:00";
  if (time > 1400 && time <= 1500) return "14:01-15:00";
  if (time > 1500 && time <= 1600) return "15:01-16:00";
  if (time > 1600 && time <= 1700) return "16:01-17:00";
  return "หลังเวลางาน";
};

export default function Dashboard() {
  useAuthRedirect(true);

  const [bookings, setBookings] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [user, setUser] = useState<any>(null);
  const [filteredBookings, setFilteredBookings] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [carStatuses, setCarStatuses] = useState<any[]>([]);
  const [selectedMonthFilter, setSelectedMonthFilter] = useState<string>("all");
  const [hasAutoSelected, setHasAutoSelected] = useState(false);

  // Modal States
  const [showDetail, setShowDetail] = useState<any | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<any | null>(null);
  const [editBooking, setEditBooking] = useState<any | null>(null);
  const [swapBooking, setSwapBooking] = useState<any | null>(null);

  // 👑 State โหมดผู้ดูแลระบบ (Admin) จากฐานข้อมูล
  const [isAdmin, setIsAdmin] = useState(false);

  // 🌙 State สำหรับ Dark Mode
  const [isDarkMode, setIsDarkMode] = useState(false);

  const router = useRouter();
  const { showAlert } = useAlert();

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

  // 1. ระบบดึงสถานะรถ Real-time
  const fetchCarStatus = async () => {
    const today = new Date().toLocaleDateString("sv-SE");
    const currentSlot = getCurrentTimeSlot();

    const { data: cars } = await supabase.from("cars").select("*");
    const { data: todaysBookings } = await supabase
      .from("bookings")
      .select("car_id, time_slot, driver_name")
      .eq("date", today);

    // ✨ ดึงข้อมูลการบำรุงรักษา
    const { data: maintenance } = await supabase.from("car_maintenance").select("*");
    const { data: milesData } = await supabase.from("miles").select("end_mile, bookings!inner(car_id)");

    const maxMilesMap: Record<number, number> = {};
    if (milesData) {
      milesData.forEach((m: any) => {
        const carId = m.bookings?.car_id;
        if (carId && m.end_mile) {
          if (!maxMilesMap[carId] || m.end_mile > maxMilesMap[carId]) {
            maxMilesMap[carId] = m.end_mile;
          }
        }
      });
    }

    if (cars) {
      const currentSlotIndex = TIME_SLOTS.indexOf(currentSlot);

      const statusList = cars.map((car) => {
        const activeBooking = todaysBookings?.find(
          (b) => b.car_id === car.id && b.time_slot.includes(currentSlot),
        );

        // ✨ ค้นหาคิวถัดไปของรถคันนี้
        const nextCarBooking = todaysBookings
          ?.filter((b) => b.car_id === car.id)
          .map((b) => ({ ...b, firstSlotIndex: TIME_SLOTS.indexOf(b.time_slot.split(",")[0].trim()) }))
          .filter((b) => b.firstSlotIndex > currentSlotIndex)
          .sort((a, b) => a.firstSlotIndex - b.firstSlotIndex)[0];

        // 🛠️ คำนวณสุขภาพรถ (ปรับให้หลอดตอบสนองตามระยะทางที่เหลือจริง)
        const m = maintenance?.find((x) => x.car_id === car.id);
        const currentMile = maxMilesMap[car.id] || 0;
        let healthPercent = 100;
        let remainingMile = null;

        if (m && m.next_service_mileage) {
          const nextService = Number(m.next_service_mileage) || 0;
          remainingMile = nextService - currentMile;
          
          // ใช้เกณฑ์ 10,000 กม. เป็นตัวตั้งฐานของหลอด (มาตรฐานการเข้าศูนย์ทั่วไป)
          // เพื่อให้ 8,000 กม. ดูเยอะ และ 1,000 กม. ดูน้อยลงตามจริง
          const SERVICE_WINDOW = 10000; 
          healthPercent = Math.max(0, Math.min(100, (remainingMile / SERVICE_WINDOW) * 100));
        }

        return {
          ...car,
          isBusy: !!activeBooking,
          currentDriver: activeBooking?.driver_name || null,
          nextBooking: nextCarBooking || null,
          healthPercent,
          remainingMile,
        };
      });
      setCarStatuses(statusList);
    }
  };

  useEffect(() => {
    fetchCarStatus();
    const interval = setInterval(fetchCarStatus, 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // 2. ระบบ Real-time Subscription (Socket)
  useEffect(() => {
    const bookingChannel = supabase
      .channel("realtime-booking-channel")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bookings" },
        () => {
          fetchCarStatus();
          loadBookings();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(bookingChannel);
    };
  }, []);

  // 3. โหลดแจ้งเตือนการบำรุงรักษารถ & พ.ร.บ./ภาษี (✨ Wording ระดับ Premium)
  useEffect(() => {
    const loadAlerts = async () => {
      try {
        const { data: cars } = await supabase.from("cars").select("*");
        const { data: maintenance } = await supabase
          .from("car_maintenance")
          .select("*");
        const { data: log } = await supabase
          .from("car_mileage_log")
          .select("*");

        // ✨ ดึงข้อมูลเลขไมล์จากที่ User กรอกตอนคืนรถมาด้วย
        const { data: milesData } = await supabase
          .from("miles")
          .select("end_mile, bookings!inner(car_id)");

        const maxMilesMap: Record<number, number> = {};
        if (milesData) {
          milesData.forEach((m: any) => {
            const carId = m.bookings?.car_id;
            if (carId && m.end_mile) {
              if (!maxMilesMap[carId] || m.end_mile > maxMilesMap[carId]) {
                maxMilesMap[carId] = m.end_mile;
              }
            }
          });
        }

        const result: any[] = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        cars?.forEach((car) => {
          // 🔴 1. เช็กระยะไมล์เข้าศูนย์
          const m = maintenance?.find((x) => x.car_id === car.id);

          const carLogs = log?.filter((x) => x.car_id === car.id) || [];
          const adminLog = carLogs.sort(
            (a, b) => Number(b.current_mileage) - Number(a.current_mileage),
          )[0];

          const adminMile = adminLog ? Number(adminLog.current_mileage) : 0;
          const userMile = maxMilesMap[car.id] || 0;

          // ✨ คำนวณหาไมล์ล่าสุด
          const currentMile = Math.max(userMile, adminMile);

          if (m && m.next_service_mileage) {
            const nextService = Number(m.next_service_mileage) || 0;
            const alertLimit = Number(m.alert_before_mileage) || 1000;

            const remain = nextService - currentMile;

            if (remain <= alertLimit) {
              result.push({
                id: `${car.id}-maint`,
                plate: car.plate,
                title: "แจ้งเตือนกำหนดการซ่อมบำรุง",
                message:
                  remain < 0
                    ? `เกินระยะที่กำหนดมาแล้ว ${Math.abs(remain).toLocaleString("th-TH")} กิโลเมตร`
                    : remain === 0
                      ? "รถยนต์ถึงระยะกำหนดเข้าซ่อมบำรุงแล้ว"
                      : `ระยะทางคงเหลืออีก ${remain.toLocaleString("th-TH")} กิโลเมตร ก่อนถึงกำหนด`,
                type: "maintenance",
              });
            }
          }

          // 🔵 2. เช็กวันหมดอายุ ภาษี / พ.ร.บ. / ประกัน
          const checkExpire = (
            expireDate: string | null,
            docName: string,
            alertDays: number,
          ) => {
            if (!expireDate) return;
            const exp = new Date(expireDate);
            if (isNaN(exp.getTime())) return;
            const diffTime = exp.getTime() - today.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays <= alertDays) {
              result.push({
                id: `${car.id}-${docName}`,
                plate: car.plate,
                title: `แจ้งเตือนครบกำหนดต่ออายุ${docName}`,
                message:
                  diffDays < 0
                    ? `เอกสารเลยกำหนดต่ออายุมาแล้ว ${Math.abs(diffDays)} วัน`
                    : diffDays === 0
                      ? "เอกสารจะสิ้นสุดความคุ้มครองภายในวันนี้"
                      : `เอกสารจะครบกำหนดต่ออายุในอีก ${diffDays} วัน`,
                type: "document",
              });
            }
          };

          const alertDays = Number(car.alert_before_days) || 30;

          checkExpire(car.tax_expire, "ภาษี", alertDays);
          checkExpire(car.act_expire, "พ.ร.บ.", alertDays);
          checkExpire(car.insurance_expire, "ประกันภัย", alertDays);
        });

        setAlerts(result);
      } catch (error) {
        console.error("Error loading alerts:", error);
      }
    };

    loadAlerts();
  }, []);

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
      if (firstSlot === "ก่อนเวลางาน")
        return `ก่อนเวลางาน-${lastSlot.split("-").pop()}`;
      if (lastSlot === "หลังเวลางาน")
        return `${firstSlot.split("-")[0]}-หลังเวลางาน`;
      return `${firstSlot.split("-")[0]}-${lastSlot.split("-").pop()}`;
    });

    return formattedGroups.join(" และ ");
  }

  // 👑 5. ตรวจสอบสิทธิ์ Admin และโหลด User
  useEffect(() => {
    const getUserAndLoad = async () => {
      const { data, error } = await supabase.auth.getUser();

      if (data.user) {
        setUser(data.user);

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", data.user.id)
          .maybeSingle();

        if (profile && profile.role && profile.role.toLowerCase() === "admin") {
          setIsAdmin(true);
        } else {
          setIsAdmin(false);
        }

        loadBookings();
      }
    };
    getUserAndLoad();
  }, []);

  const loadBookings = async () => {
    const { data, error } = await supabase
      .from("bookings")
      .select(
        `*, miles:miles!miles_booking_id_fkey(id, start_mile, end_mile, total_mile), cars(plate)`,
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

  // 🗑️ ฟังก์ชันลบรายการจอง (รองรับ Admin)
  const handleDeleteBooking = async (booking: any) => {
    showAlert({
      title: "ยืนยันการลบ",
      description: `คุณต้องการลบรายการจองของรถ ${booking.cars?.plate} หรือไม่?`,
      type: "confirm",
      onConfirm: async () => {
        // ยิง API แจ้งเตือนแบบขนาน
        await Promise.allSettled([
          fetch("/api/line/notify-delete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              user_name: user.email,
              driver_name: booking.driver_name,
              car_plate: booking.cars?.plate || "",
              date: booking.date,
              destination: booking.destination,
            }),
          }),
          fetch("/api/telegram/notify-delete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              user_name: user.email,
              driver_name: booking.driver_name,
              car_plate: booking.cars?.plate || "",
              date: booking.date,
              destination: booking.destination,
            }),
          }),
        ]);

        // 🔒 ระบบจัดการสิทธิ์การลบ
        let deleteQuery = supabase.from("bookings").delete().eq("id", booking.id);

        // ถ้าไม่ใช่แอดมิน ให้ลบได้เฉพาะของ User ตัวเองเท่านั้น
        if (!isAdmin) {
          deleteQuery = deleteQuery.eq("user_id", user.id);
        }

        const { error } = await deleteQuery;

        if (error) {
          showAlert({
            title: "ลบไม่สำเร็จ",
            description: "ลบไม่สำเร็จ: " + error.message,
            type: "error"
          });
        } else {
          showAlert({
            title: "สำเร็จ",
            description: "ลบรายการสำเร็จ",
            type: "success"
          });
          loadBookings();
        }
      }
    });
  };

  const availableMonths = useMemo(() => {
    if (filteredBookings.length === 0) return [];
    const monthsSet = new Set(
      filteredBookings.map((b) => b.date.substring(0, 7)),
    );
    return Array.from(monthsSet).sort().reverse();
  }, [filteredBookings]);

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

  if (!user) {
    return (
      <main className="flex flex-col items-center justify-center h-screen text-blue-600 bg-slate-50 dark:bg-slate-900 transition-colors duration-300">
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
        <p className="text-gray-500 dark:text-gray-400 animate-pulse">
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
              key={a.id || idx}
              className={`premium-alert ${a.type === "document" ? "bg-gradient-to-br from-amber-500 to-orange-600" : ""}`}
              style={{ animationDelay: `${idx * 0.1}s` }}
            >
              <div className="alert-content">
                <div className="alert-icon">
                  {a.type === "document" ? (
                    <span className="text-xl">📄</span>
                  ) : (
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
                  )}
                </div>
                <div className="alert-text">
                  <span className="alert-plate">รถทะเบียน {a.plate}</span>
                  <span className="alert-message font-bold">{a.title}</span>
                  <span className="alert-message text-xs opacity-90">
                    {a.message}
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
                    setAlerts((prev) =>
                      prev.filter((item) => item.id !== a.id),
                    );
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

      <style
        dangerouslySetInnerHTML={{
          __html: `
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
          position: fixed;
          top: 90px;
          right: 20px;
          z-index: 9999;
          width: calc(100% - 40px);
          max-width: 400px;
          display: flex;
          flex-direction: column;
          pointer-events: none;
        }
        .premium-alert {
          pointer-events: auto;
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
      `,
        }}
      />

      <Navbar />
      <AnnouncementPopup />
      <div className="pt-20 p-4 md:p-6 md:pt-24 pb-28 md:pb-6 bg-slate-50 dark:bg-slate-900 min-h-screen transition-colors duration-300">
        <main className="max-w-6xl mx-auto">
          {/* 🏎️ Quick-View Availability Summary & Personalized Next Trip */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
            {/* 1. สรุปความพร้อม (เดิม) */}
            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 dark:from-blue-700 dark:to-indigo-900 p-5 rounded-2xl shadow-lg border border-blue-400/20 text-white flex items-center justify-between overflow-hidden relative group">
              <div className="relative z-10">
                <p className="text-blue-100 text-sm font-medium mb-1">ความพร้อมใช้งานตอนนี้</p>
                <h3 className="text-3xl font-extrabold flex items-baseline gap-2">
                  ว่าง {carStatuses.filter(c => !c.isBusy).length} <span className="text-lg font-normal opacity-80">จาก {carStatuses.length} คัน</span>
                </h3>
              </div>
              <div className="bg-white/10 p-3 rounded-xl backdrop-blur-md relative z-10">
                <Rocket className="w-8 h-8 text-white animate-pulse" />
              </div>
              <div className="absolute -right-4 -bottom-4 opacity-10 transform rotate-12 transition-transform group-hover:scale-110">
                <CarIcon size={120} />
              </div>
            </div>

            {/* 2. คิวของคุณ (⭐ Personalized Card) */}
            {(() => {
              const myNextTrip = bookings.find(b => 
                b.user_id === user.id && 
                b.date === new Date().toLocaleDateString("sv-SE") &&
                (b.miles_status !== "recorded")
              );
              
              if (myNextTrip) {
                return (
                  <div className="bg-emerald-50 dark:bg-emerald-900/20 p-5 rounded-2xl shadow-md border border-emerald-200 dark:border-emerald-800/50 flex items-center justify-between overflow-hidden relative group animate-in fade-in slide-in-from-top-4 duration-500">
                    <div className="relative z-10 w-full">
                      <p className="text-emerald-600 dark:text-emerald-400 text-sm font-bold mb-1 flex items-center gap-1.5">
                        <Star className="w-3.5 h-3.5 fill-current" /> คิวของคุณวันนี้
                      </p>
                      <h3 className="text-xl font-bold text-slate-800 dark:text-white truncate">
                        รถทะเบียน: {myNextTrip.cars?.plate}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 text-[10px]">
                          {myNextTrip.time_slot.split(",")[0]}
                        </Badge>
                        <span className="text-xs text-slate-500 dark:text-slate-400 truncate">ไป {myNextTrip.destination}</span>
                      </div>
                      <Button 
                        size="sm" 
                        onClick={() => setSelectedBooking(myNextTrip)}
                        className="mt-3 bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 text-white h-8 px-4 rounded-full text-xs font-bold shadow-sm flex items-center gap-1.5"
                      >
                        <GaugeIcon className="w-3.5 h-3.5" /> บันทึกเลขไมล์ด่วน
                      </Button>
                    </div>
                    <div className="absolute -right-6 -bottom-6 opacity-10 transform rotate-12">
                      <User size={120} className="text-emerald-600" />
                    </div>
                  </div>
                );
              }

              // ถ้าไม่มีคิวของตัวเอง ให้แสดง "คิวถัดไปของทุกคน" แทน (เหมือนเดิม)
              return (
                <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-md border border-slate-200 dark:border-slate-700 flex items-center justify-between overflow-hidden relative group">
                  <div className="relative z-10 w-full">
                    <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-1 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" /> คิวถัดไปที่กำลังจะมาถึง
                    </p>
                    {carStatuses.some(c => c.nextBooking) ? (
                      <div className="flex flex-col">
                        {(() => {
                          const nextB = carStatuses
                            .filter(c => c.nextBooking)
                            .map(c => ({ ...c.nextBooking, carPlate: c.plate }))
                            .sort((a, b) => a.firstSlotIndex - b.firstSlotIndex)[0];
                          return (
                            <>
                              <h3 className="text-xl font-bold text-slate-800 dark:text-white truncate">
                                {nextB.driver_name} <span className="text-sm font-normal text-slate-500 ml-1">({nextB.carPlate})</span>
                              </h3>
                              <p className="text-blue-600 dark:text-blue-400 font-bold text-sm mt-0.5">
                                {nextB.time_slot.split(",")[0]} 
                                <span className="text-slate-400 font-normal ml-2">ไป {nextB.destination}</span>
                              </p>
                            </>
                          );
                        })()}
                      </div>
                    ) : (
                      <h3 className="text-xl font-bold text-slate-400 dark:text-slate-600 italic">ไม่มีรายการจองถัดไป</h3>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* 3. ปุ่มนำทางด่วน / หรือสถิติเล็กๆ */}
            <div className="hidden lg:flex bg-slate-50 dark:bg-slate-900/50 p-5 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 items-center justify-center group hover:bg-white dark:hover:bg-slate-800 transition-colors cursor-pointer"
                 onClick={() => router.push("/calendar")}>
              <div className="text-center">
                <CalendarDays className="w-8 h-8 text-blue-500 mx-auto mb-2 group-hover:scale-110 transition-transform" />
                <p className="text-sm font-bold text-slate-700 dark:text-slate-300">ดูตารางคิวทั้งเดือน</p>
                <p className="text-[10px] text-slate-400">ตรวจสอบความว่างของรถล่วงหน้า</p>
              </div>
            </div>
          </div>

          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg sm:text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <CarIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                สถานะรถ (Real-time)
              </h2>
              {isAdmin && (
                <Badge className="bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-900/50 dark:text-indigo-300 dark:border-indigo-700">
                  <ShieldCheck className="w-4 h-4 mr-1" />
                  สิทธิ์ผู้ดูแลระบบ (Admin)
                </Badge>
              )}
            </div>

            {carStatuses.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {carStatuses.map((car) => (
                  <div
                    key={car.id}
                    className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col transition-hover hover:border-blue-200 dark:hover:border-blue-500 hover:shadow-md"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-slate-50 dark:bg-slate-700 rounded-lg border border-slate-100 dark:border-slate-600">
                          <CarIcon className="w-5 h-5 text-slate-600 dark:text-slate-300" />
                        </div>
                        <div>
                          <p className="font-bold text-slate-800 dark:text-white text-sm sm:text-base">
                            {car.plate}
                          </p>
                          <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">
                            {car.brand || "รถส่วนกลาง"}
                          </p>
                        </div>
                      </div>
                      {car.isBusy ? (
                        <Badge className="bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/40 dark:text-amber-400 dark:border-amber-800 hover:bg-amber-100 gap-1.5 py-1 px-2.5 font-medium whitespace-nowrap">
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                          </span>
                          ไม่ว่าง ({car.currentDriver})
                        </Badge>
                      ) : (
                        <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-400 dark:border-emerald-800 hover:bg-emerald-100 gap-1.5 py-1 px-2.5 font-medium whitespace-nowrap">
                          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                          ว่าง
                        </Badge>
                      )}
                    </div>

                    {/* 🛠️ Maintenance Health Indicator */}
                    <div className="mt-1 pt-3 border-t border-slate-50 dark:border-slate-700/50">
                      <div className="flex justify-between items-end mb-1.5">
                        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">สุขภาพรถยนต์</span>
                        <span className={`text-xs font-bold ${
                          car.healthPercent > 20 ? 'text-emerald-600 dark:text-emerald-400' : 
                          car.healthPercent > 5 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'
                        }`}>
                          {car.remainingMile !== null ? `อีก ${car.remainingMile.toLocaleString()} กม.` : 'พร้อมใช้งาน'}
                        </span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all duration-1000 ${
                            car.healthPercent > 20 ? 'bg-emerald-500' : 
                            car.healthPercent > 5 ? 'bg-amber-500' : 'bg-red-500 animate-pulse'
                          }`}
                          style={{ width: `${car.healthPercent}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-slate-400 dark:text-slate-500 p-4 border border-dashed border-slate-300 dark:border-slate-700 rounded-xl text-center">
                กำลังตรวจสอบสถานะรถ...
              </div>
            )}
          </div>

          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-3">
            <h1 className="text-xl sm:text-2xl font-bold text-blue-700 dark:text-blue-400">
              รายการจองรถ
            </h1>

            <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
              <Button
                onClick={toggleTheme}
                variant="outline"
                className="w-full sm:w-auto bg-white dark:bg-slate-800 dark:text-white dark:border-slate-700 dark:hover:bg-slate-700 transition-colors"
              >
                {isDarkMode ? (
                  <Sun className="w-4 h-4 mr-2 text-amber-400" />
                ) : (
                  <Moon className="w-4 h-4 mr-2 text-indigo-500" />
                )}
                {isDarkMode ? "Light Mode" : "Dark Mode"}
              </Button>

              <div className="relative w-full md:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
                <Input
                  placeholder="ค้นหาชื่อ / ทะเบียนรถ"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 bg-white dark:bg-slate-800 dark:text-white dark:border-slate-700 dark:placeholder-slate-400 transition-colors"
                />
              </div>
              <Button
                onClick={() => (location.href = "/booking")}
                className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:text-white dark:hover:bg-blue-600 w-full sm:w-auto"
              >
                + จองรถ
              </Button>
            </div>
          </div>

          {availableMonths.length > 0 && (
            <div className="bg-white dark:bg-slate-800 p-3 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 mb-6 flex flex-col sm:flex-row items-center justify-between gap-4 transition-colors">
              <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-medium">
                <CalendarDays className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <span>แสดงข้อมูลตามเดือน:</span>
              </div>
              
              <div className="relative w-full sm:w-64">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500 pointer-events-none" />
                <select
                  value={selectedMonthFilter}
                  onChange={(e) => setSelectedMonthFilter(e.target.value)}
                  className="pl-10 pr-10 w-full h-10 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-sm text-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600 appearance-none transition-all cursor-pointer hover:border-blue-400 dark:hover:border-blue-500"
                >
                  <option value="all">ดูรายการทั้งหมด</option>
                  {availableMonths.map((monthStr) => {
                    const [year, month] = monthStr.split("-");
                    const monthName = format(
                      new Date(Number(year), Number(month) - 1),
                      "MMMM yyyy",
                      { locale: th },
                    );
                    return (
                      <option key={monthStr} value={monthStr}>
                        {monthName}
                      </option>
                    );
                  })}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>
          )}

          <div className="bg-white dark:bg-slate-800 rounded-xl shadow overflow-hidden dark:border dark:border-slate-700 transition-colors">
            {Object.entries(
              filteredBookings
                .filter((booking) => {
                  if (selectedMonthFilter === "all") return true;
                  return booking.date.startsWith(selectedMonthFilter);
                })
                .reduce(
                  (groups, booking) => {
                    const date = new Date(booking.date)
                      .toISOString()
                      .split("T")[0];
                    if (!groups[date]) groups[date] = [];
                    groups[date].push(booking);
                    return groups;
                  },
                  {} as Record<string, any[]>,
                ),
            )
              .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
              .map(([date, group]: [string, any[]]) => {
                const d = new Date(date);
                const isEvenMonth = d.getMonth() % 2 === 0;

                const canManageDay =
                  isAdmin || group.some((b) => b.user_id === user.id);

                const bgColor = isToday(d)
                  ? "bg-green-600 dark:bg-emerald-600"
                  : isEvenMonth
                    ? "bg-gray-700 dark:bg-slate-600"
                    : "bg-gray-600 dark:bg-slate-500";

                return (
                  <div
                    key={date}
                    className="border-b dark:border-slate-700 last:border-none"
                  >
                    <div
                      className={`px-4 py-2 text-sm sm:text-base font-semibold text-white flex justify-between items-center ${bgColor} transition-colors`}
                    >
                      <div className="flex items-center gap-2">
                        <CalendarDays className="w-5 h-5 text-white/90" />
                        <span>
                          {format(d, "dd MMMM yyyy", { locale: th })}{" "}
                          {isToday(d) && "(วันนี้)"}
                        </span>
                      </div>
                      <div className="text-sm text-gray-200 dark:text-slate-100">
                        ({group.length.toLocaleString("th-TH")} รายการ)
                      </div>
                    </div>

                    <div className="block lg:hidden bg-slate-50/50 dark:bg-slate-900/50 p-2 space-y-3 transition-colors">
                      {group.map((b: any) => (
                        <div
                          key={b.id}
                          className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden transition-colors"
                        >
                          <div
                            className={`absolute top-0 left-0 w-1 h-full ${b.miles_status === "recorded" ? "bg-emerald-500" : "bg-amber-500"}`}
                          ></div>

                          <div className="pl-2">
                            <div className="flex justify-between items-start mb-2">
                              <div className="flex items-center gap-2 text-slate-800 dark:text-white font-bold text-base">
                                <User className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                                {b.driver_name}
                              </div>
                              <Badge
                                variant="outline"
                                className="bg-slate-50 dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 shadow-sm"
                              >
                                {b.cars?.plate}
                              </Badge>
                            </div>

                            <div className="space-y-1 mb-3">
                              <div className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
                                <Clock className="w-4 h-4 text-blue-500 dark:text-blue-400 shrink-0 mt-0.5" />
                                <span>{mergeTimeSlots(b.time_slot)}</span>
                              </div>
                              <div className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-200 font-medium">
                                <MapPin className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                                <span className="line-clamp-2">
                                  {b.destination}
                                </span>
                              </div>
                            </div>

                            <div className="flex flex-col sm:flex-row justify-between items-center pt-3 border-t border-slate-100 dark:border-slate-700 gap-3">
                              <div className="w-full sm:w-auto flex justify-center sm:justify-start">
                                {b.miles_status === "recorded" ? (
                                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold text-xs bg-emerald-50 dark:bg-emerald-900/30 px-2.5 py-1.5 rounded-full flex items-center gap-1 border dark:border-emerald-800/50">
                                    <CheckCircle2 className="w-3.5 h-3.5" /> ลงไมล์แล้ว ({b.total_mile} กม.)
                                  </span>
                                ) : (
                                  <span className="text-amber-600 dark:text-amber-400 font-semibold text-xs bg-amber-50 dark:bg-amber-900/30 px-2.5 py-1.5 rounded-full flex items-center gap-1 border dark:border-amber-800/50">
                                    <AlertCircle className="w-3.5 h-3.5" /> รอลงเลขไมล์
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-1 w-full sm:w-auto justify-end">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-9 px-3 rounded-lg border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 shadow-sm"
                                  onClick={() => setShowDetail(b)}
                                >
                                  <EyeIcon className="w-4 h-4" />
                                </Button>

                                <Button
                                  size="sm"
                                  disabled={b.miles_status === "recorded"}
                                  onClick={() => setSelectedBooking(b)}
                                  className={`h-9 px-3 rounded-lg shadow-sm ${
                                    b.miles_status === "recorded"
                                      ? "bg-slate-100 dark:bg-slate-700/50 text-slate-400 dark:text-slate-500 opacity-80"
                                      : "bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
                                  }`}
                                >
                                  <GaugeIcon className="w-4 h-4 mr-1" /> ไมล์
                                </Button>

                                {canManageDay &&
                                  (b.user_id === user.id || isAdmin) && (
                                    <>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-9 px-2 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 hover:bg-amber-100 dark:hover:bg-amber-900/50 rounded-lg ml-1"
                                        onClick={() => setEditBooking(b)}
                                      >
                                        <SquarePen className="w-4 h-4" />
                                      </Button>

                                      {isAdmin && (
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          className="h-9 px-2 text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 rounded-lg"
                                          onClick={() => setSwapBooking(b)}
                                        >
                                          <ArrowRightLeft className="w-4 h-4" />
                                        </Button>
                                      )}

                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-9 px-2 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-lg"
                                        onClick={() => handleDeleteBooking(b)}
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </Button>
                                    </>
                                  )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="hidden lg:block overflow-x-auto">
                      <table className="w-full text-xs sm:text-sm min-w-[700px]">
                        <thead className="bg-blue-100 dark:bg-slate-700 text-blue-800 dark:text-blue-200 border-b dark:border-slate-600 transition-colors">
                          <tr>
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
                            {canManageDay && (
                              <th className="p-2 sm:p-3 text-center">จัดการ</th>
                            )}
                          </tr>
                        </thead>
                        <tbody className="dark:bg-slate-800">
                          {group.map((b: any) => (
                            <tr
                              key={b.id}
                              className="border-b dark:border-slate-700 hover:bg-blue-50 dark:hover:bg-slate-700/50 transition-colors"
                            >
                              <td className="p-2 sm:p-3 text-center font-medium dark:text-slate-200">
                                {b.driver_name}
                              </td>
                              <td className="p-2 sm:p-3 text-center">
                                <Badge
                                  variant="outline"
                                  className="bg-white dark:bg-slate-800 dark:text-slate-300 dark:border-slate-600"
                                >
                                  {b.cars?.plate}
                                </Badge>
                              </td>
                              <td className="p-2 sm:p-3 text-center dark:text-slate-300">
                                {b.date}
                              </td>
                              <td className="p-2 sm:p-3 text-center text-slate-600 dark:text-slate-400">
                                {mergeTimeSlots(b.time_slot)}
                              </td>
                              <td className="p-2 sm:p-3 text-slate-700 dark:text-slate-300">
                                {b.destination}
                              </td>
                              <td className="p-2 sm:p-3 text-slate-500 dark:text-slate-400 text-xs">
                                {b.reason}
                              </td>
                              <td className="p-2 sm:p-3 text-center">
                                {b.miles_status === "recorded" ? (
                                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold text-xs bg-emerald-50 dark:bg-emerald-900/30 border dark:border-emerald-800/50 px-2 py-1 rounded-full inline-flex items-center gap-1">
                                    <CheckCircle2 className="w-3.5 h-3.5" /> บันทึกแล้ว ({b.total_mile} กม.)
                                  </span>
                                ) : (
                                  <span className="text-amber-600 dark:text-amber-400 font-semibold text-xs bg-amber-50 dark:bg-amber-900/30 border dark:border-amber-800/50 px-2 py-1 rounded-full inline-flex items-center gap-1">
                                    <AlertCircle className="w-3.5 h-3.5" /> รอลงไมล์
                                  </span>
                                )}
                              </td>
                              <td className="p-2 sm:p-3 text-center">
                                <div className="flex items-center justify-center gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setShowDetail(b)}
                                    className="h-8 px-3 rounded-lg border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-700 hover:text-blue-700 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-600 transition-all duration-200 shadow-sm flex items-center"
                                  >
                                    <EyeIcon className="w-4 h-4 mr-1.5 text-blue-500 dark:text-blue-400" />{" "}
                                    ดู
                                  </Button>
                                  <Button
                                    size="sm"
                                    disabled={b.miles_status === "recorded"}
                                    onClick={() => setSelectedBooking(b)}
                                    className={`h-8 px-3 rounded-lg flex items-center transition-all duration-200 ${
                                      b.miles_status === "recorded"
                                        ? "bg-slate-100 dark:bg-slate-700/50 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-600 shadow-none opacity-80 cursor-not-allowed"
                                        : "bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-500 dark:to-indigo-500 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md hover:shadow-lg active:scale-95 border-none"
                                    }`}
                                  >
                                    <GaugeIcon
                                      className={`w-4 h-4 mr-1.5 ${b.miles_status === "recorded" ? "text-slate-400 dark:text-slate-500" : "text-blue-100"}`}
                                    />
                                    ไมล์
                                  </Button>
                                </div>
                              </td>

                              {canManageDay && (
                                <td className="p-2 sm:p-3 text-center">
                                  {(b.user_id === user.id || isAdmin) && (
                                    <div className="flex items-center justify-center gap-1">
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        title="แก้ไขข้อมูล"
                                        onClick={() => setEditBooking(b)}
                                        className="text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/30 h-8 px-2"
                                      >
                                        <SquarePen className="w-4 h-4" />
                                      </Button>

                                      {isAdmin && (
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          title="สลับรถยนต์ / สลับคิว"
                                          onClick={() => setSwapBooking(b)}
                                          className="text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 h-8 px-2"
                                        >
                                          <ArrowRightLeft className="w-4 h-4" />
                                        </Button>
                                      )}

                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        title="ลบรายการ"
                                        onClick={() => handleDeleteBooking(b)}
                                        className="text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 h-8 px-2"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </Button>
                                    </div>
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

          {/* Modals */}
          <DetailModal
            isOpen={!!showDetail}
            onClose={() => setShowDetail(null)}
            booking={showDetail}
          />

          <MileageModal
            isOpen={!!selectedBooking}
            onClose={() => setSelectedBooking(null)}
            booking={selectedBooking}
            onSuccess={async () => {
              await loadBookings();
              fetchCarStatus();
            }}
          />

          <EditBookingModal
            isOpen={!!editBooking}
            onClose={() => setEditBooking(null)}
            booking={editBooking}
            isAdmin={isAdmin}
            user={user}
            onSuccess={async () => {
              await loadBookings();
              fetchCarStatus();
            }}
          />

          <SwapCarModal
            isOpen={!!swapBooking}
            onClose={() => setSwapBooking(null)}
            booking={swapBooking}
            isAdmin={isAdmin}
            onSuccess={async () => {
              await loadBookings();
              fetchCarStatus();
            }}
          />
        </main>
      </div>
    </>
  );
}
