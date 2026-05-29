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
import { GaugeIcon, Save } from "lucide-react";
import { useAlert } from "@/components/ui/alert-provider";
import { mileSchema } from "@/lib/schemas";

interface MileageModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: any;
  onSuccess: () => Promise<void>;
}

export default function MileageModal({
  isOpen,
  onClose,
  booking,
  onSuccess,
}: MileageModalProps) {
  const [startMile, setStartMile] = useState("");
  const [endMile, setEndMile] = useState("");
  const [usedMile, setUsedMile] = useState<number | null>(null);
  const { showAlert } = useAlert();

  useEffect(() => {
    if (!isOpen) {
      setStartMile("");
      setEndMile("");
      setUsedMile(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (startMile && endMile) {
      const total = Number(endMile) - Number(startMile);
      setUsedMile(total >= 0 ? total : 0);
    } else {
      setUsedMile(null);
    }
  }, [startMile, endMile]);

  const handleSave = async () => {
    const result = mileSchema.safeParse({
      start_mile: startMile,
      end_mile: endMile,
    });

    if (!result.success) {
      return showAlert({
        title: "ข้อมูลไม่ถูกต้อง",
        description: result.error.issues[0].message,
        type: "warning",
      });
    }

    const { error } = await supabase.from("miles").insert({
      booking_id: booking.id,
      start_mile: Number(startMile),
      end_mile: Number(endMile),
      total_mile: Number(endMile) - Number(startMile),
    });

    if (error) {
      showAlert({
        title: "เกิดข้อผิดพลาด",
        description: error.message,
        type: "error",
      });
    } else {
      showAlert({
        title: "บันทึกสำเร็จ",
        description: `บันทึกเลขไมล์เรียบร้อย (ใช้ไป ${Number(endMile) - Number(startMile)} กม.)`,
        type: "success",
      });
      await onSuccess();
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] sm:max-w-md rounded-2xl dark:bg-slate-800 dark:border-slate-700">
        <DialogHeader>
          <DialogTitle className="text-xl text-blue-700 dark:text-blue-400 flex items-center gap-2">
            <GaugeIcon className="w-5 h-5" />
            บันทึกเลขไมล์
          </DialogTitle>
        </DialogHeader>
        {booking && (
          <div className="space-y-4 pt-2">
            <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-100 dark:border-slate-700 text-sm">
              <p className="dark:text-slate-300">
                รถทะเบียน:{" "}
                <b className="text-blue-600 dark:text-blue-400">
                  {Array.isArray(booking.cars) ? booking.cars[0]?.plate : booking.cars?.plate}
                </b>
              </p>
              <p className="dark:text-slate-300">
                ผู้ขับ:{" "}
                <b className="text-slate-700 dark:text-slate-200">
                  {booking.driver_name}
                </b>
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 block">
                  เลขไมล์เริ่มต้น
                </label>
                <Input
                  type="number"
                  className="h-12 text-lg font-medium dark:bg-slate-700 dark:border-slate-600 dark:text-white dark:placeholder-slate-400"
                  placeholder="กรอกเลขไมล์ตอนเริ่ม..."
                  value={startMile}
                  onChange={(e) => setStartMile(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 block">
                  เลขไมล์สิ้นสุด
                </label>
                <Input
                  type="number"
                  className="h-12 text-lg font-medium dark:bg-slate-700 dark:border-slate-600 dark:text-white dark:placeholder-slate-400"
                  placeholder="กรอกเลขไมล์ตอนจบ..."
                  value={endMile}
                  onChange={(e) => setEndMile(e.target.value)}
                />
              </div>
            </div>

            {usedMile !== null && (
              <div
                className={`p-3 rounded-xl border text-center ${
                  usedMile < 0
                    ? "bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800"
                    : "bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800"
                }`}
              >
                <p
                  className={`text-sm ${
                    usedMile < 0
                      ? "text-red-600 dark:text-red-400"
                      : "text-emerald-700 dark:text-emerald-400"
                  }`}
                >
                  ระยะทางที่ขับขี่รวม:{" "}
                  <span className="text-xl font-bold">{usedMile}</span> กม.
                </p>
              </div>
            )}

            <Button
              className="w-full h-12 text-base font-bold bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 rounded-xl text-white flex items-center justify-center gap-2"
              onClick={handleSave}
            >
              <Save className="w-5 h-5" /> ยืนยันการบันทึก
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
