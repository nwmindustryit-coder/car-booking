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
  Trash2,
  CarIcon,
  ArrowRightLeft,
  ShieldCheck,
  MapPin,
  Clock,
  User,
} from "lucide-react";
import { useAuthRedirect } from "@/hooks/useAuthRedirect";
import { format, isToday } from "date-fns";
import { th } from "date-fns/locale";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

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
  const [carStatuses, setCarStatuses] = useState<any[]>([]);
  const [selectedMonthFilter, setSelectedMonthFilter] = useState<string>("all");
  const [hasAutoSelected, setHasAutoSelected] = useState(false);

  // 👑 State โหมดผู้ดูแลระบบ (Admin) จากฐานข้อมูล
  const [isAdmin, setIsAdmin] = useState(false);

  // State สำหรับระบบสลับรถ (Swap Car)
  const [swapBooking, setSwapBooking] = useState<any | null>(null);
  const [swapOptions, setSwapOptions] = useState<any[]>([]);
  const [selectedNewCar, setSelectedNewCar] = useState<string>("");
  const [isSwapping, setIsSwapping] = useState(false);

  const [editForm, setEditForm] = useState({
    driver_name: "",
    destination: "",
    reason: "",
    date: new Date(),
  });

  const router = useRouter();

  // 1. ระบบดึงสถานะรถ Real-time
  const fetchCarStatus = async () => {
    const today = new Date().toLocaleDateString("sv-SE");
    const currentSlot = getCurrentTimeSlot();

    const { data: cars } = await supabase.from("cars").select("*");
    const { data: todaysBookings } = await supabase
      .from("bookings")
      .select("car_id, time_slot, driver_name")
      .eq("date", today);

    if (cars) {
      const statusList = cars.map((car) => {
        const activeBooking = todaysBookings?.find(
          (b) => b.car_id === car.id && b.time_slot.includes(currentSlot),
        );
        return {
          ...car,
          isBusy: !!activeBooking,
          currentDriver: activeBooking?.driver_name || null,
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

  // 3. โหลดแจ้งเตือนการบำรุงรักษารถ & พ.ร.บ./ภาษี
  useEffect(() => {
    const loadAlerts = async () => {
      const { data: cars } = await supabase.from("cars").select("*");
      const { data: maintenance } = await supabase
        .from("car_maintenance")
        .select("*");
      const { data: log } = await supabase.from("car_mileage_log").select("*");

      const result: any[] = [];
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      cars?.forEach((car) => {
        // 🔴 1. เช็กระยะไมล์เข้าศูนย์
        const m = maintenance?.find((x) => x.car_id === car.id);
        const mg = log?.find((x) => x.car_id === car.id);

        if (m && mg) {
          const remain = m.next_service_mileage - mg.current_mileage;
          if (remain <= m.alert_before_mileage) {
            result.push({
              id: `${car.id}-maint`,
              plate: car.plate,
              title: "แจ้งเตือนเข้าศูนย์",
              message:
                remain <= 0
                  ? "ถึงกำหนดเข้าศูนย์แล้ว!"
                  : `เหลืออีก ${remain} กม. ถึงกำหนดเข้าศูนย์`,
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
          const diffTime = exp.getTime() - today.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          if (diffDays <= alertDays) {
            result.push({
              id: `${car.id}-${docName}`,
              plate: car.plate,
              title: `แจ้งเตือนต่อ${docName}`,
              message:
                diffDays < 0
                  ? `หมดอายุมาแล้ว ${Math.abs(diffDays)} วัน! ❌`
                  : diffDays === 0
                    ? "หมดอายุวันนี้! ⚠️"
                    : `กำลังจะหมดอายุในอีก ${diffDays} วัน`,
              type: "document",
            });
          }
        };

        const alertDays = car.alert_before_days ?? 30;

        checkExpire(car.tax_expire, "ภาษี", alertDays);
        checkExpire(car.act_expire, "พ.ร.บ.", alertDays);
        checkExpire(car.insurance_expire, "ประกันภัย", alertDays);
      });

      setAlerts(result);
    };

    loadAlerts();
  }, []);

  // 4. โหลดข้อมูลเลขไมล์สำหรับหน้าแก้ไข
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

  // เช็กว่าช่วงเวลานี้มีคนจองไหม (สำหรับตอนกดแก้ไข)
  useEffect(() => {
    const checkBookingAvailability = async () => {
      if (!editBooking?.car_id || !editForm.date) return;

      const { data, error } = await supabase
        .from("bookings")
        .select("time_slot, driver_name")
        .eq("car_id", editBooking.car_id)
        .eq("date", editForm.date.toISOString().split("T")[0]);

      if (error) return;

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

  // 💾 ฟังก์ชันบันทึกเลขไมล์
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

  // 🗑️ ฟังก์ชันลบรายการจอง (รองรับ Admin)
  const handleDeleteBooking = async (booking: any) => {
    if (!confirm("ต้องการลบรายการจองนี้หรือไม่?")) return;

    // ยิง API แจ้งเตือน
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

    // 🔒 ระบบจัดการสิทธิ์การลบ
    let deleteQuery = supabase.from("bookings").delete().eq("id", booking.id);

    // ถ้าไม่ใช่แอดมิน ให้ลบได้เฉพาะของ User ตัวเองเท่านั้น
    if (!isAdmin) {
      deleteQuery = deleteQuery.eq("user_id", user.id);
    }

    const { error } = await deleteQuery;

    if (error) alert("ลบไม่สำเร็จ: " + error.message);
    else {
      alert("ลบรายการสำเร็จ");
      loadBookings();
    }
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
      setSelectedMonthFilter(availableMonths[0]);
      setHasAutoSelected(true);
    }
  }, [availableMonths, hasAutoSelected]);

  // 🔄 ระบบสลับรถ (ดึงข้อมูล)
  useEffect(() => {
    const loadSwapOptions = async () => {
      if (!swapBooking) return;

      const { data: allCars } = await supabase.from("cars").select("*");
      const { data: bookingsOnDate } = await supabase
        .from("bookings")
        .select("id, car_id, time_slot, driver_name")
        .eq("date", swapBooking.date);

      const swapSlots = swapBooking.time_slot
        .split(",")
        .map((s: string) => s.trim());

      const options = allCars
        ?.filter((car) => car.id !== swapBooking.car_id)
        .map((car) => {
          const carBookings =
            bookingsOnDate?.filter((b) => b.car_id === car.id) || [];
          const conflicts = carBookings.filter((b) => {
            const bookedSlots = b.time_slot
              .split(",")
              .map((s: string) => s.trim());
            return bookedSlots.some((slot) => swapSlots.includes(slot));
          });

          return {
            ...car,
            isBooked: conflicts.length > 0,
            conflictingBookings: conflicts,
          };
        });

      setSwapOptions(options || []);
      setSelectedNewCar("");
    };

    loadSwapOptions();
  }, [swapBooking]);

  // 🔄 ระบบสลับรถ (บันทึกข้อมูล)
  const handleSwapSubmit = async () => {
    if (!selectedNewCar) return alert("กรุณาเลือกรถที่ต้องการสลับ");
    setIsSwapping(true);

    const targetCar = swapOptions.find((c) => c.id === selectedNewCar);

    try {
      if (targetCar?.isBooked) {
        const conflictIds = targetCar.conflictingBookings.map((b: any) => b.id);
        const { error: moveOtherError } = await supabase
          .from("bookings")
          .update({ car_id: swapBooking.car_id })
          .in("id", conflictIds);
        if (moveOtherError) throw moveOtherError;
      }

      const { error: moveOurError } = await supabase
        .from("bookings")
        .update({ car_id: selectedNewCar })
        .eq("id", swapBooking.id);

      if (moveOurError) throw moveOurError;

      alert(
        targetCar?.isBooked
          ? "สลับรถระหว่างคิวสำเร็จแล้ว! 🔄🚗"
          : "เปลี่ยนรถเรียบร้อยแล้ว! 🚗✅",
      );
      setSwapBooking(null);
      await loadBookings();
      fetchCarStatus();
    } catch (err: any) {
      alert("เกิดข้อผิดพลาด: " + err.message);
    } finally {
      setIsSwapping(false);
    }
  };

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

      <style jsx>{`
        @keyframes slideInDown {
          from { transform: translateY(-100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes fadeOut {
          from { opacity: 1; transform: scale(1); }
          to { opacity: 0; transform: scale(0.95); }
        }
        @keyframes pulseGlow {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.1); }
        }
        @keyframes ringPulse {
          0%, 100% { stroke-dasharray: 0 100; opacity: 0.6; }
          50% { stroke-dasharray: 50 100; opacity: 1; }
        }
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
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
      `}</style>

      <Navbar />
      <AnnouncementPopup />
      <div className="p-4 md:p-6 bg-slate-50 min-h-screen">
        <main className="max-w-6xl mx-auto">
          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg sm:text-xl font-bold text-slate-800 flex items-center gap-2">
                <CarIcon className="w-5 h-5 text-blue-600" />
                สถานะรถ (Real-time)
              </h2>
              {/* ✨ แสดงป้ายแอดมิน เพื่อความมั่นใจว่าระบบเห็นสิทธิ์แล้ว */}
              {isAdmin && (
                <Badge className="bg-indigo-100 text-indigo-700 border-indigo-200">
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
                    className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between transition-hover hover:border-blue-200 hover:shadow-md"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                        <CarIcon className="w-5 h-5 text-slate-600" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-800 text-sm sm:text-base">
                          {car.plate}
                        </p>
                        <p className="text-[11px] sm:text-xs text-slate-500">
                          {car.brand || "รถส่วนกลาง"}
                        </p>
                      </div>
                    </div>
                    {car.isBusy ? (
                      <Badge className="bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100 gap-1.5 py-1 px-2.5 font-medium whitespace-nowrap">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                        </span>
                        ไม่ว่าง ({car.currentDriver})
                      </Badge>
                    ) : (
                      <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100 gap-1.5 py-1 px-2.5 font-medium whitespace-nowrap">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        ว่าง
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-slate-400 p-4 border border-dashed rounded-xl text-center">
                กำลังตรวจสอบสถานะรถ...
              </div>
            )}
          </div>

          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-3">
            <h1 className="text-xl sm:text-2xl font-bold text-blue-700">
              รายการจองรถ
            </h1>

            <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
              <div className="relative w-full md:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="ค้นหาชื่อผู้จอง / ผู้ขับ / ทะเบียนรถ"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 bg-white"
                />
              </div>
              <Button
                onClick={() => (location.href = "/booking")}
                className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto"
              >
                + จองรถ
              </Button>
            </div>
          </div>

          {availableMonths.length > 0 && (
            <div className="flex overflow-x-auto pb-2 mb-4 gap-2 scrollbar-hide">
              <Button
                variant={selectedMonthFilter === "all" ? "default" : "outline"}
                className={
                  selectedMonthFilter === "all"
                    ? "bg-blue-700 text-white"
                    : "text-gray-600 bg-white"
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
                      isSelected
                        ? "bg-blue-700 text-white"
                        : "text-gray-600 bg-white whitespace-nowrap"
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

                // ✨ ตรวจสอบว่ามีสิทธิ์จัดการของวันนี้ไหม (แอดมินดูได้หมด หรือมีคิวของตัวเอง)
                const canManageDay =
                  isAdmin || group.some((b) => b.user_id === user.id);
                const bgColor = isToday(d)
                  ? "bg-green-600"
                  : isEvenMonth
                    ? "bg-gray-700"
                    : "bg-gray-600";

                return (
                  <div key={date} className="border-b last:border-none">
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

                    {/* ============================================================== */}
                    {/* 📱 1. สำหรับหน้าจอมือถือ (Mobile View - Card Layout) */}
                    {/* ============================================================== */}
                    <div className="block lg:hidden bg-slate-50/50 p-2 space-y-3">
                      {group.map((b: any) => (
                        <div key={b.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
                          {/* แถบสถานะด้านบนของการ์ด */}
                          <div className={`absolute top-0 left-0 w-1 h-full ${b.miles_status === "recorded" ? "bg-emerald-500" : "bg-amber-500"}`}></div>
                          
                          <div className="pl-2">
                            {/* บรรทัดแรก: ชื่อคนขับ และ ทะเบียน */}
                            <div className="flex justify-between items-start mb-2">
                              <div className="flex items-center gap-2 text-slate-800 font-bold text-base">
                                <User className="w-4 h-4 text-slate-400" />
                                {b.driver_name}
                              </div>
                              <Badge variant="outline" className="bg-slate-50 border-slate-200 text-slate-700 shadow-sm">
                                {b.cars?.plate}
                              </Badge>
                            </div>

                            {/* บรรทัดสอง: เวลา และ สถานที่ */}
                            <div className="space-y-1 mb-3">
                              <div className="flex items-start gap-2 text-sm text-slate-600">
                                <Clock className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                                <span>{mergeTimeSlots(b.time_slot)}</span>
                              </div>
                              <div className="flex items-start gap-2 text-sm text-slate-700 font-medium">
                                <MapPin className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                                <span className="line-clamp-2">{b.destination}</span>
                              </div>
                              {b.reason && (
                                <div className="pl-6 text-xs text-slate-400">
                                  เหตุผล: {b.reason}
                                </div>
                              )}
                            </div>

                            {/* บรรทัดล่างสุด: สถานะไมล์ และ ปุ่มต่างๆ */}
                            <div className="flex flex-col sm:flex-row justify-between items-center pt-3 border-t border-slate-100 gap-3">
                              
                              <div className="w-full sm:w-auto flex justify-center sm:justify-start">
                                {b.miles_status === "recorded" ? (
                                  <span className="text-emerald-600 font-semibold text-xs bg-emerald-50 px-2.5 py-1.5 rounded-full flex items-center gap-1">
                                    ✅ ลงไมล์แล้ว ({b.total_mile} กม.)
                                  </span>
                                ) : (
                                  <span className="text-amber-600 font-semibold text-xs bg-amber-50 px-2.5 py-1.5 rounded-full flex items-center gap-1">
                                    ⚠️ รอลงเลขไมล์
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-1 w-full sm:w-auto justify-end">
                                <Button
                                  size="sm" variant="outline"
                                  className="h-9 px-3 rounded-lg border-slate-200 bg-white text-slate-600 shadow-sm"
                                  onClick={async () => {
                                    const { data: milesData } = await supabase.from("miles").select("start_mile, end_mile, total_mile").eq("booking_id", b.id).limit(1).maybeSingle();
                                    setShowDetail({ ...b, miles: milesData || null });
                                  }}
                                >
                                  <EyeIcon className="w-4 h-4" />
                                </Button>
                                
                                {/* ✨ ปุ่มไมล์ปลดล็อกให้ทุกคนกดได้ในมือถือ ✨ */}
                                <Button
                                  size="sm"
                                  disabled={b.miles_status === "recorded"}
                                  onClick={() => setSelectedBooking(b)}
                                  className={`h-9 px-3 rounded-lg shadow-sm ${
                                    b.miles_status === "recorded" 
                                      ? "bg-slate-100 text-slate-400 opacity-80" 
                                      : "bg-blue-600 text-white hover:bg-blue-700"
                                  }`}
                                >
                                  <GaugeIcon className="w-4 h-4 mr-1" /> ไมล์
                                </Button>

                                {canManageDay && (b.user_id === user.id || isAdmin) && (
                                  <>
                                    <Button
                                      size="sm" variant="ghost"
                                      className="h-9 px-2 text-amber-600 bg-amber-50 hover:bg-amber-100 rounded-lg ml-1"
                                      onClick={() => {
                                        setEditForm({ driver_name: b.driver_name, destination: b.destination, reason: b.reason, date: new Date(b.date) });
                                        setSelectedEditTimes(b.time_slot.split(",").map((s: string) => s.trim()));
                                        setEditBooking(b);
                                      }}
                                    >
                                      <SquarePen className="w-4 h-4" />
                                    </Button>
                                    
                                    {isAdmin && (
                                      <Button
                                        size="sm" variant="ghost"
                                        className="h-9 px-2 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg"
                                        onClick={() => setSwapBooking(b)}
                                      >
                                        <ArrowRightLeft className="w-4 h-4" />
                                      </Button>
                                    )}

                                    <Button
                                      size="sm" variant="ghost"
                                      className="h-9 px-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg"
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

                    {/* ============================================================== */}
                    {/* 💻 2. สำหรับหน้าจอคอมพิวเตอร์/แท็บเล็ต (Desktop View - Table Layout) */}
                    {/* ============================================================== */}
                    <div className="hidden lg:block overflow-x-auto">
                      <table className="w-full text-xs sm:text-sm min-w-[700px]">
                        <thead className="bg-blue-100 text-blue-800">
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
                        <tbody>
                          {group.map((b: any) => (
                            <tr
                              key={b.id}
                              className="border-b hover:bg-blue-50 transition-colors"
                            >
                              <td className="p-2 sm:p-3 text-center font-medium">
                                {b.driver_name}
                              </td>
                              <td className="p-2 sm:p-3 text-center">
                                <Badge variant="outline" className="bg-white">
                                  {b.cars?.plate}
                                </Badge>
                              </td>
                              <td className="p-2 sm:p-3 text-center">
                                {b.date}
                              </td>
                              <td className="p-2 sm:p-3 text-center text-slate-600">
                                {mergeTimeSlots(b.time_slot)}
                              </td>
                              <td className="p-2 sm:p-3 text-slate-700">
                                {b.destination}
                              </td>
                              <td className="p-2 sm:p-3 text-slate-500 text-xs">
                                {b.reason}
                              </td>
                              <td className="p-2 sm:p-3 text-center">
                                {b.miles_status === "recorded" ? (
                                  <span className="text-emerald-600 font-semibold text-xs bg-emerald-50 px-2 py-1 rounded-full">
                                    ✅ บันทึกแล้ว ({b.total_mile} กม.)
                                  </span>
                                ) : (
                                  <span className="text-amber-600 font-semibold text-xs bg-amber-50 px-2 py-1 rounded-full">
                                    ⚠️ รอลงไมล์
                                  </span>
                                )}
                              </td>
                              <td className="p-2 sm:p-3 text-center">
                                <div className="flex items-center justify-center gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={async () => {
                                      const { data: milesData } = await supabase
                                        .from("miles")
                                        .select(
                                          "start_mile, end_mile, total_mile",
                                        )
                                        .eq("booking_id", b.id)
                                        .limit(1)
                                        .maybeSingle();
                                      setShowDetail({
                                        ...b,
                                        miles: milesData || null,
                                      });
                                    }}
                                    className="h-8 px-3 rounded-lg border-slate-200 text-slate-600 bg-white hover:text-blue-700 hover:border-blue-300 hover:bg-blue-50 transition-all duration-200 shadow-sm flex items-center"
                                  >
                                    <EyeIcon className="w-4 h-4 mr-1.5 text-blue-500" />{" "}
                                    ดู
                                  </Button>
                                  {/* ✨ ปุ่มไมล์ปลดล็อกให้ทุกคนกดได้ในคอมพิวเตอร์ ✨ */}
                                  <Button
                                    size="sm"
                                    disabled={b.miles_status === "recorded"}
                                    onClick={() => setSelectedBooking(b)}
                                    className={`h-8 px-3 rounded-lg flex items-center transition-all duration-200 ${
                                      b.miles_status === "recorded"
                                        ? "bg-slate-100 text-slate-400 border border-slate-200 shadow-none opacity-80 cursor-not-allowed hover:bg-slate-100"
                                        : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md hover:shadow-lg active:scale-95 border-none"
                                    }`}
                                  >
                                    <GaugeIcon
                                      className={`w-4 h-4 mr-1.5 ${b.miles_status === "recorded" ? "text-slate-400" : "text-blue-100"}`}
                                    />
                                    ไมล์
                                  </Button>
                                </div>
                              </td>

                              {/* ✨ แสดงปุ่มจัดการ */}
                              {canManageDay && (
                                <td className="p-2 sm:p-3 text-center">
                                  {(b.user_id === user.id || isAdmin) && (
                                    <div className="flex items-center justify-center gap-1">
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        title="แก้ไขข้อมูล"
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
                                        className="text-amber-600 hover:bg-amber-50 h-8 px-2"
                                      >
                                        <SquarePen className="w-4 h-4" />
                                      </Button>

                                      {/* ✨ ปุ่มสลับรถ ซ่อนไว้เฉพาะแอดมินเท่านั้น */}
                                      {isAdmin && (
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          title="สลับรถยนต์ / สลับคิว"
                                          onClick={() => setSwapBooking(b)}
                                          className="text-indigo-600 hover:bg-indigo-50 h-8 px-2"
                                        >
                                          <ArrowRightLeft className="w-4 h-4" />
                                        </Button>
                                      )}

                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        title="ลบรายการ"
                                        onClick={() => handleDeleteBooking(b)}
                                        className="text-red-600 hover:bg-red-50 h-8 px-2"
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

          {/* 🌟 Modal 1: Dialog แสดงรายละเอียด */}
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

          {/* 🌟 Modal 2: Dialog บันทึกเลขไมล์ */}
          <Dialog
            open={!!selectedBooking}
            onOpenChange={() => setSelectedBooking(null)}
          >
            <DialogContent className="w-[95vw] sm:max-w-md rounded-2xl">
              <DialogHeader>
                <DialogTitle className="text-xl text-blue-700 flex items-center gap-2">
                  <GaugeIcon className="w-5 h-5"/>
                  บันทึกเลขไมล์
                </DialogTitle>
              </DialogHeader>
              {selectedBooking && (
                <div className="space-y-4 pt-2">
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-sm">
                    <p>รถทะเบียน: <b className="text-blue-600">{selectedBooking.cars?.plate}</b></p>
                    <p>ผู้ขับ: <b className="text-slate-700">{selectedBooking.driver_name}</b></p>
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-bold text-slate-500 mb-1 block">เลขไมล์เริ่มต้น</label>
                      <Input
                        type="number"
                        className="h-12 text-lg font-medium"
                        placeholder="กรอกเลขไมล์ตอนเริ่ม..."
                        value={startMile}
                        onChange={(e) => setStartMile(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-500 mb-1 block">เลขไมล์สิ้นสุด</label>
                      <Input
                        type="number"
                        className="h-12 text-lg font-medium"
                        placeholder="กรอกเลขไมล์ตอนจบ..."
                        value={endMile}
                        onChange={(e) => setEndMile(e.target.value)}
                      />
                    </div>
                  </div>

                  {usedMile !== null && (
                    <div className={`p-3 rounded-xl border text-center ${usedMile < 0 ? 'bg-red-50 border-red-200' : 'bg-emerald-50 border-emerald-200'}`}>
                      <p className={`text-sm ${usedMile < 0 ? 'text-red-600' : 'text-emerald-700'}`}>
                        ระยะทางที่ขับขี่รวม: <span className="text-xl font-bold">{usedMile}</span> กม.
                      </p>
                    </div>
                  )}

                  <Button className="w-full h-12 text-base font-bold bg-blue-600 hover:bg-blue-700 rounded-xl" onClick={handleSaveMiles}>
                    💾 ยืนยันการบันทึก
                  </Button>
                </div>
              )}
            </DialogContent>
          </Dialog>

          {/* 🌟 Modal 3: Dialog แก้ไขการจอง */}
          <Dialog
            open={!!editBooking}
            onOpenChange={() => setEditBooking(null)}
          >
            <DialogContent className="w-[95vw] sm:max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  แก้ไขการจอง{" "}
                  {isAdmin && (
                    <Badge className="ml-2 bg-indigo-600">Admin Mode</Badge>
                  )}
                </DialogTitle>
              </DialogHeader>

              {editBooking && (
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const newTimeSlots = TIME_SLOTS.filter((slot) =>
                      selectedEditTimes.includes(slot),
                    ).join(", ");
                    if (!newTimeSlots)
                      return alert("กรุณาเลือกช่วงเวลาอย่างน้อย 1 ช่วง");

                    const { data: checkData, error: checkError } =
                      await supabase
                        .from("bookings")
                        .select("id, time_slot")
                        .eq("car_id", editBooking.car_id)
                        .eq("date", editForm.date.toISOString().split("T")[0]);

                    if (checkError) return alert("ไม่สามารถตรวจสอบเวลาว่างได้");

                    const conflict = checkData?.some((b) => {
                      if (b.id === editBooking.id) return false;
                      const booked = b.time_slot
                        .split(",")
                        .map((s: string) => s.trim());
                      return booked.some((slot: string) =>
                        selectedEditTimes.includes(slot),
                      );
                    });

                    if (conflict)
                      return alert(
                        "บางช่วงเวลาที่เลือกถูกจองแล้ว กรุณาเลือกเวลาใหม่",
                      );

                    // 🔒 Security Check: ตอนอัปเดต ถ้าไม่ใช่แอดมิน ให้แก้ได้แค่ของตัวเอง
                    let updateQuery = supabase
                      .from("bookings")
                      .update({
                        driver_name: editForm.driver_name,
                        destination: editForm.destination,
                        reason: editForm.reason,
                        time_slot: newTimeSlots,
                        date: editForm.date.toLocaleDateString("sv-SE"),
                      })
                      .eq("id", editBooking.id);

                    if (!isAdmin) {
                      updateQuery = updateQuery.eq("user_id", user.id);
                    }

                    const { error: bookingError } = await updateQuery;
                    if (bookingError)
                      return alert("อัปเดตไม่สำเร็จ: " + bookingError.message);

                    if (editStartMile && editEndMile) {
                      const { error: milesError } = await supabase
                        .from("miles")
                        .upsert(
                          {
                            booking_id: editBooking.id,
                            start_mile: Number(editStartMile),
                            end_mile: Number(editEndMile),
                          },
                          { onConflict: "booking_id" },
                        );
                      if (milesError)
                        return alert(
                          "ไม่สามารถอัปเดตเลขไมล์ได้: " + milesError.message,
                        );
                    }

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

                  <div className="border-t pt-3">
                    <label className="block text-sm font-medium">
                      เลขไมล์เริ่มต้น
                    </label>
                    <Input
                      type="number"
                      value={editStartMile}
                      onChange={(e) => setEditStartMile(e.target.value)}
                    />
                    <label className="block text-sm font-medium mt-2">
                      เลขไมล์สิ้นสุด
                    </label>
                    <Input
                      type="number"
                      value={editEndMile}
                      onChange={(e) => setEditEndMile(e.target.value)}
                    />
                  </div>

                  <label className="block text-sm font-medium">วันที่</label>
                  <DatePicker
                    selected={editForm.date}
                    onChange={(d: Date | null) =>
                      d && setEditForm({ ...editForm, date: d })
                    }
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

          {/* 🌟 Modal 4: Dialog สลับรถยนต์ (Swap Car) */}
          <Dialog
            open={!!swapBooking}
            onOpenChange={() => setSwapBooking(null)}
          >
            <DialogContent className="w-[95vw] sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-indigo-700">
                  <ArrowRightLeft className="w-5 h-5" /> สลับรถ / สลับคิว{" "}
                  {isAdmin && (
                    <Badge className="bg-indigo-600 text-xs ml-2">
                      Admin Mode
                    </Badge>
                  )}
                </DialogTitle>
              </DialogHeader>

              {swapBooking && (
                <div className="space-y-4 pt-4">
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-sm space-y-1">
                    <p>
                      <span className="text-slate-500">ผู้ขับ:</span>{" "}
                      <b>{swapBooking.driver_name}</b>
                    </p>
                    <p>
                      <span className="text-slate-500">วันที่:</span>{" "}
                      <b>{swapBooking.date}</b>
                    </p>
                    <p>
                      <span className="text-slate-500">ช่วงเวลา:</span>{" "}
                      <b>{mergeTimeSlots(swapBooking.time_slot)}</b>
                    </p>
                    <p>
                      <span className="text-slate-500">รถคันเดิม:</span>{" "}
                      <Badge
                        variant="outline"
                        className="ml-1 bg-white text-slate-700"
                      >
                        {swapBooking.cars?.plate}
                      </Badge>
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">
                      เลือกรถคันใหม่ที่ต้องการสลับ
                    </label>
                    {swapOptions.length > 0 ? (
                      <>
                        <select
                          className="w-full h-11 px-3 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-slate-700"
                          value={selectedNewCar}
                          onChange={(e) => setSelectedNewCar(e.target.value)}
                        >
                          <option value="" disabled>
                            -- คลิกลูกศรเพื่อเลือกรถ --
                          </option>
                          {swapOptions.map((car) => (
                            <option key={car.id} value={car.id}>
                              {car.plate}{" "}
                              {car.isBooked
                                ? `(สลับคิวกับ: ${car.conflictingBookings.map((b: any) => b.driver_name).join(", ")})`
                                : "(ว่างไม่มีคิว)"}
                            </option>
                          ))}
                        </select>

                        {selectedNewCar &&
                          swapOptions.find((c) => c.id === selectedNewCar)
                            ?.isBooked && (
                            <div className="p-3 mt-2 bg-amber-50 text-amber-700 rounded-xl border border-amber-200 text-sm">
                              ⚠️ <b>ระบบจะทำการสลับคิว:</b> ผู้ขับรถคันนี้
                              จะถูกย้ายมาขับรถ <b>{swapBooking.cars?.plate}</b>{" "}
                              แทนอัตโนมัติ
                            </div>
                          )}
                      </>
                    ) : (
                      <div className="p-3 bg-slate-50 text-slate-500 rounded-xl border border-slate-200 text-sm text-center">
                        ไม่มีรถในระบบให้สลับ
                      </div>
                    )}
                  </div>

                  <Button
                    onClick={handleSwapSubmit}
                    disabled={!selectedNewCar || isSwapping}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl h-11 shadow-sm transition-all active:scale-95 disabled:opacity-50"
                  >
                    {isSwapping ? "กำลังดำเนินการ..." : "ยืนยันการสลับรถ"}
                  </Button>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </main>
      </div>
    </>
  );
}