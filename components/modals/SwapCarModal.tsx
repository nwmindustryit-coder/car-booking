"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRightLeft, AlertCircle } from "lucide-react";
import { useAlert } from "@/components/ui/alert-provider";

interface SwapCarModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: any;
  isAdmin: boolean;
  onSuccess: () => Promise<void>;
}

export default function SwapCarModal({
  isOpen,
  onClose,
  booking,
  isAdmin,
  onSuccess,
}: SwapCarModalProps) {
  const [swapOptions, setSwapOptions] = useState<any[]>([]);
  const [selectedNewCar, setSelectedNewCar] = useState<string>("");
  const [isSwapping, setIsSwapping] = useState(false);
  const { showAlert } = useAlert();

  useEffect(() => {
    if (isOpen && booking) {
      loadSwapOptions();
    }
  }, [isOpen, booking]);

  const loadSwapOptions = async () => {
    if (!booking) return;

    const { data: allCars } = await supabase.from("cars").select("*");
    const { data: bookingsOnDate } = await supabase
      .from("bookings")
      .select("id, car_id, time_slot, driver_name")
      .eq("date", booking.date);

    const swapSlots = booking.time_slot
      .split(",")
      .map((s: string) => s.trim());

    const options = allCars
      ?.filter((car) => car.id !== booking.car_id)
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

  const handleSwapSubmit = async () => {
    if (!selectedNewCar) {
      return showAlert({
        title: "แจ้งเตือน",
        description: "กรุณาเลือกรถที่ต้องการสลับ",
        type: "error",
      });
    }
    setIsSwapping(true);

    const targetCar = swapOptions.find((c) => c.id === selectedNewCar);

    try {
      if (targetCar?.isBooked) {
        const conflictIds = targetCar.conflictingBookings.map((b: any) => b.id);
        const { error: moveOtherError } = await supabase
          .from("bookings")
          .update({ car_id: booking.car_id })
          .in("id", conflictIds);
        if (moveOtherError) throw moveOtherError;
      }

      const { error: moveOurError } = await supabase
        .from("bookings")
        .update({ car_id: selectedNewCar })
        .eq("id", booking.id);

      if (moveOurError) throw moveOurError;

      showAlert({
        title: "สำเร็จ!",
        description: targetCar?.isBooked
          ? "สลับรถระหว่างคิวสำเร็จแล้ว!"
          : "เปลี่ยนรถเรียบร้อยแล้ว!",
        type: "success",
      });
      await onSuccess();
      onClose();
    } catch (err: any) {
      showAlert({
        title: "เกิดข้อผิดพลาด",
        description: err.message,
        type: "error",
      });
    } finally {
      setIsSwapping(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] sm:max-w-md dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-indigo-700 dark:text-indigo-400">
            <ArrowRightLeft className="w-5 h-5" /> สลับรถ / สลับคิว{" "}
            {isAdmin && (
              <Badge className="bg-indigo-600 text-xs ml-2">Admin Mode</Badge>
            )}
          </DialogTitle>
          <DialogDescription className="sr-only">
            เลือกเพื่อสลับรถหรือสลับคิว
          </DialogDescription>
        </DialogHeader>

        {booking && (
          <div className="space-y-4 pt-4">
            <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-100 dark:border-slate-700 text-sm space-y-1">
              <p>
                <span className="text-slate-500 dark:text-slate-400">
                  ผู้ขับ:
                </span>{" "}
                <b className="dark:text-white">{booking.driver_name}</b>
              </p>
              <p>
                <span className="text-slate-500 dark:text-slate-400">
                  วันที่:
                </span>{" "}
                <b className="dark:text-white">{booking.date}</b>
              </p>
              <p>
                <span className="text-slate-500 dark:text-slate-400">
                  ช่วงเวลา:
                </span>{" "}
                <b className="dark:text-white">{booking.time_slot}</b>
              </p>
              <p>
                <span className="text-slate-500 dark:text-slate-400">
                  รถคันเดิม:
                </span>{" "}
                <Badge
                  variant="outline"
                  className="ml-1 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 dark:border-slate-600"
                >
                  {booking.cars?.plate}
                </Badge>
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300">
                เลือกรถคันใหม่ที่ต้องการสลับ
              </label>
              {swapOptions.length > 0 ? (
                <>
                  <select
                    className="w-full h-11 px-3 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-slate-700 dark:text-white"
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
                          ? `(สลับคิวกับ: ${car.conflictingBookings
                              .map((b: any) => b.driver_name)
                              .join(", ")})`
                          : "(ว่างไม่มีคิว)"}
                      </option>
                    ))}
                  </select>

                  {selectedNewCar &&
                    swapOptions.find((c) => c.id === selectedNewCar)
                      ?.isBooked && (
                      <div className="p-3 mt-2 bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-xl border border-amber-200 dark:border-amber-800/50 text-sm flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                        <span>
                          <b>ระบบจะทำการสลับคิว:</b> ผู้ขับรถคันนี้
                          จะถูกย้ายมาขับรถ{" "}
                          <b className="dark:text-white">
                            {booking.cars?.plate}
                          </b>{" "}
                          แทนอัตโนมัติ
                        </span>
                      </div>
                    )}
                </>
              ) : (
                <div className="p-4 text-center text-slate-400 text-sm border border-dashed rounded-xl">
                  ไม่พบรถคันอื่นในระบบ
                </div>
              )}
            </div>

            <Button
              disabled={isSwapping || !selectedNewCar}
              onClick={handleSwapSubmit}
              className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white rounded-xl font-bold flex items-center justify-center gap-2"
            >
              {isSwapping ? (
                "กำลังประมวลผล..."
              ) : (
                <>
                  <ArrowRightLeft className="w-5 h-5" /> ยืนยันการสลับรถ
                </>
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
