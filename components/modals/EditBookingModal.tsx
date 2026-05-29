"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Save, SquarePen } from "lucide-react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { useAlert } from "@/components/ui/alert-provider";
import { bookingSchema } from "@/lib/schemas";

const TIME_SLOTS = [
  "ก่อนเวลางาน", "08:00-09:00", "09:01-10:00", "10:01-11:00",
  "11:01-12:00", "13:00-14:00", "14:01-15:00", "15:01-16:00",
  "16:01-17:00", "หลังเวลางาน",
];

interface EditBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: any;
  isAdmin: boolean;
  user: any;
  onSuccess: () => Promise<void>;
}

export default function EditBookingModal({
  isOpen,
  onClose,
  booking,
  isAdmin,
  user,
  onSuccess,
}: EditBookingModalProps) {
  const [form, setForm] = useState({
    driver_name: "",
    destination: "",
    reason: "",
    date: new Date(),
  });
  const [selectedTimes, setSelectedTimes] = useState<string[]>([]);
  const [editStartMile, setEditStartMile] = useState("");
  const [editEndMile, setEditEndMile] = useState("");
  const [bookingStatus, setBookingStatus] = useState<Record<string, string>>({});
  const { showAlert } = useAlert();

  useEffect(() => {
    if (isOpen && booking) {
      setForm({
        driver_name: booking.driver_name,
        destination: booking.destination,
        reason: booking.reason,
        date: new Date(booking.date),
      });
      setSelectedTimes(
        booking.time_slot.split(",").map((s: string) => s.trim())
      );
      loadMiles();
      checkBookingAvailability();
    }
  }, [isOpen, booking]);

  const loadMiles = async () => {
    if (!booking) return;
    const { data } = await supabase
      .from("miles")
      .select("start_mile, end_mile")
      .eq("booking_id", booking.id)
      .maybeSingle();

    if (data) {
      setEditStartMile(data.start_mile?.toString() || "");
      setEditEndMile(data.end_mile?.toString() || "");
    } else {
      setEditStartMile("");
      setEditEndMile("");
    }
  };

  const checkBookingAvailability = async () => {
    if (!booking?.car_id || !form.date) return;

    const { data, error } = await supabase
      .from("bookings")
      .select("id, time_slot, driver_name")
      .eq("car_id", booking.car_id)
      .eq("date", form.date.toISOString().split("T")[0]);

    if (error) return;

    const status: Record<string, string> = {};
    for (const slot of TIME_SLOTS) status[slot] = "ว่าง";

    for (const b of data || []) {
      if (b.id === booking.id) continue;
      const bookedSlots = b.time_slot.split(",").map((s: string) => s.trim());
      for (const slot of TIME_SLOTS) {
        if (bookedSlots.includes(slot)) status[slot] = b.driver_name;
      }
    }
    setBookingStatus(status);
  };

  useEffect(() => {
    if (isOpen) checkBookingAvailability();
  }, [form.date]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    const validation = bookingSchema.safeParse({
      ...form,
      time_slot: selectedTimes,
    });

    if (!validation.success) {
      return showAlert({
        title: "ข้อมูลไม่ถูกต้อง",
        description: validation.error.issues[0].message,
        type: "warning",
      });
    }

    // ตรวจสอบความขัดแย้งของเวลาอีกครั้ง
    const conflict = Object.entries(bookingStatus).some(([slot, status]) => 
      selectedTimes.includes(slot) && status !== "ว่าง"
    );

    if (conflict) {
      return showAlert({
        title: "เวลาไม่ว่าง",
        description: "บางช่วงเวลาที่เลือกถูกจองแล้ว กรุณาเลือกเวลาใหม่",
        type: "error",
      });
    }

    const newTimeSlotsStr = selectedTimes.join(", ");

    let updateQuery = supabase
      .from("bookings")
      .update({
        driver_name: form.driver_name,
        destination: form.destination,
        reason: form.reason,
        time_slot: newTimeSlotsStr,
        date: form.date.toLocaleDateString("sv-SE"),
      })
      .eq("id", booking.id);

    if (!isAdmin) {
      updateQuery = updateQuery.eq("user_id", user.id);
    }

    const { error: bookingError } = await updateQuery;
    if (bookingError) {
      return showAlert({
        title: "อัปเดตไม่สำเร็จ",
        description: bookingError.message,
        type: "error",
      });
    }

    if (editStartMile && editEndMile) {
      const { error: milesError } = await supabase
        .from("miles")
        .upsert(
          {
            booking_id: booking.id,
            start_mile: Number(editStartMile),
            end_mile: Number(editEndMile),
            total_mile: Number(editEndMile) - Number(editStartMile),
          },
          { onConflict: "booking_id" }
        );
      if (milesError) {
        return showAlert({
          title: "เกิดข้อผิดพลาด",
          description: "ไม่สามารถอัปเดตเลขไมล์ได้: " + milesError.message,
          type: "error",
        });
      }
    }

    // แจ้งเตือน
    await Promise.allSettled([
      fetch("/api/line/notify-edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_name: user.email,
          driver_name: form.driver_name,
          destination: form.destination,
          time_slot: newTimeSlotsStr,
          date: form.date.toLocaleDateString("sv-SE"),
          car_plate: (Array.isArray(booking.cars) ? booking.cars[0]?.plate : booking.cars?.plate) || "",
          reason: form.reason,
          old_driver_name: booking.driver_name,
          old_destination: booking.destination,
          old_time_slot: booking.time_slot,
          old_date: booking.date,
          old_reason: booking.reason,
        }),
      }),
      fetch("/api/telegram/notify-edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_name: user.email,
          driver_name: form.driver_name,
          destination: form.destination,
          time_slot: newTimeSlotsStr,
          date: form.date.toLocaleDateString("sv-SE"),
          car_plate: (Array.isArray(booking.cars) ? booking.cars[0]?.plate : booking.cars?.plate) || "",
          reason: form.reason,
          old_driver_name: booking.driver_name,
          old_destination: booking.destination,
          old_time_slot: booking.time_slot,
          old_date: booking.date,
          old_reason: booking.reason,
        }),
      }),
    ]);

    showAlert({
      title: "สำเร็จ!",
      description: "อัปเดตข้อมูลการจองเรียบร้อยแล้ว",
      type: "success",
    });
    await onSuccess();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] sm:max-w-md max-h-[90vh] overflow-y-auto dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 transition-colors">
        <DialogHeader>
          <DialogTitle className="dark:text-white flex items-center">
            แก้ไขการจอง{" "}
            {isAdmin && (
              <Badge className="ml-2 bg-indigo-600 dark:bg-indigo-500">
                Admin Mode
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        {booking && (
          <form onSubmit={handleSave} className="space-y-3 pt-2">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium dark:text-slate-300">
                ชื่อผู้ขับ
              </label>
              <Input
                className="dark:bg-slate-700 dark:border-slate-600 dark:text-white dark:placeholder-slate-400"
                value={form.driver_name}
                onChange={(e) =>
                  setForm({ ...form, driver_name: e.target.value })
                }
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium dark:text-slate-300">
                สถานที่
              </label>
              <Input
                className="dark:bg-slate-700 dark:border-slate-600 dark:text-white dark:placeholder-slate-400"
                value={form.destination}
                onChange={(e) =>
                  setForm({ ...form, destination: e.target.value })
                }
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium dark:text-slate-300">
                เหตุผล
              </label>
              <Input
                className="dark:bg-slate-700 dark:border-slate-600 dark:text-white dark:placeholder-slate-400"
                value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
              />
            </div>

            <div className="border-t dark:border-slate-700 pt-3 space-y-3">
              <div className="space-y-1.5">
                <label className="block text-sm font-medium dark:text-slate-300">
                  เลขไมล์เริ่มต้น
                </label>
                <Input
                  type="number"
                  className="font-mono dark:bg-slate-700 dark:border-slate-600 dark:text-white dark:placeholder-slate-400"
                  value={editStartMile}
                  onChange={(e) => setEditStartMile(e.target.value)}
                  placeholder="เลขไมล์เริ่มต้น"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-sm font-medium dark:text-slate-300">
                  เลขไมล์สิ้นสุด
                </label>
                <Input
                  type="number"
                  className="font-mono dark:bg-slate-700 dark:border-slate-600 dark:text-white dark:placeholder-slate-400"
                  value={editEndMile}
                  onChange={(e) => setEditEndMile(e.target.value)}
                  placeholder="เลขไมล์สิ้นสุด"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium dark:text-slate-300">
                วันที่
              </label>
              <DatePicker
                selected={form.date}
                onChange={(d: Date | null) =>
                  d && setForm({ ...form, date: d })
                }
                dateFormat="dd/MM/yyyy"
                className="border border-slate-200 dark:border-slate-600 rounded-md p-2 w-full bg-white dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium dark:text-slate-300">
                ช่วงเวลาที่ต้องการแก้ไข
              </label>
              <div className="grid grid-cols-2 gap-2">
                {TIME_SLOTS.map((slot) => {
                  const status = bookingStatus[slot];
                  const isBooked = status && status !== "ว่าง";
                  const isSelected = selectedTimes.includes(slot);
                  return (
                    <Button
                      key={slot}
                      type="button"
                      variant={isSelected ? "default" : "outline"}
                      onClick={() => {
                        if (!isBooked) {
                          setSelectedTimes((prev) =>
                            prev.includes(slot)
                              ? prev.filter((s) => s !== slot)
                              : [...prev, slot]
                          );
                        }
                      }}
                      disabled={isBooked}
                      className={`flex items-center justify-center gap-1 text-xs sm:text-sm ${
                        isSelected
                          ? "bg-blue-600 hover:bg-blue-700 text-white border-blue-600 dark:bg-blue-500"
                          : "bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600"
                      }`}
                    >
                      <span className="truncate">{slot}</span>
                      {isBooked ? (
                        <Badge className="ml-1 bg-red-500 dark:bg-red-900/80 text-white">
                          {status}
                        </Badge>
                      ) : (
                        <Badge className="ml-1 bg-emerald-500 dark:bg-emerald-900/80 text-white">
                          ว่าง
                        </Badge>
                      )}
                    </Button>
                  );
                })}
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-11 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white mt-4 flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" /> บันทึกการแก้ไข
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
