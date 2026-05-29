"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CarIcon } from "lucide-react";

interface DetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: any;
}

export default function DetailModal({
  isOpen,
  onClose,
  booking,
}: DetailModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] sm:max-w-md dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200">
        <DialogHeader>
          <DialogTitle className="dark:text-white">
            รายละเอียดการจอง
          </DialogTitle>
        </DialogHeader>
        {booking && (
          <div className="space-y-2 text-sm">
            <p>
              <b>อีเมลผู้จอง:</b> {booking.user_name}
            </p>
            <p>
              <b>ชื่อผู้ขับ:</b> {booking.driver_name}
            </p>
            <p>
              <b>ทะเบียนรถ:</b> {Array.isArray(booking.cars) ? booking.cars[0]?.plate : booking.cars?.plate}
            </p>
            <p>
              <b>วันที่:</b> {booking.date}
            </p>
            <p>
              <b>ช่วงเวลา:</b> {booking.time_slot}
            </p>
            <p>
              <b>สถานที่:</b> {booking.destination}
            </p>
            <p>
              <b>เหตุผล:</b> {booking.reason}
            </p>

            {booking.miles ? (
              <div className="pt-2 border-t dark:border-slate-700 mt-2">
                <p>
                  <b>เลขไมล์เริ่มต้น:</b> {booking.miles.start_mile}
                </p>
                <p>
                  <b>เลขไมล์สิ้นสุด:</b> {booking.miles.end_mile}
                </p>
                <p className="text-blue-700 dark:text-blue-400 font-semibold flex items-center gap-2">
                  <CarIcon className="w-4 h-4" />
                  ใช้ไปทั้งหมด{" "}
                  {booking.miles.total_mile ??
                    booking.miles.end_mile - booking.miles.start_mile}{" "}
                  กม.
                </p>
              </div>
            ) : (
              <p className="italic text-gray-400 dark:text-slate-500 pt-2 border-t dark:border-slate-700 mt-2">
                ยังไม่ได้บันทึกเลขไมล์
              </p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
