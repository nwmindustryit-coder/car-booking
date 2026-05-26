import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CardContent } from "@/components/ui/card";
import { User, Briefcase, CalendarDays, MapPin, Sun, Moon, Calculator, Clock, Banknote, Save } from "lucide-react";
import { calculateWorkoutStats } from "@/hooks/useWorkouts";
import { Workout } from "@/types/workout";
import { supabase } from "@/lib/supabaseClient";

interface WorkOutFormProps {
  userId: string;
  initialData?: Workout | null;
  department: string;
  employeeName: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export function WorkOutForm({ userId, initialData, department, employeeName: initialEmployeeName, onSuccess, onCancel }: WorkOutFormProps) {
  const [date, setDate] = useState("");
  const [place, setPlace] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [stayOver, setStayOver] = useState(false);
  const [employeeName, setEmployeeName] = useState(initialEmployeeName);

  useEffect(() => {
    if (initialData) {
      setDate(initialData.date);
      setPlace(initialData.location);
      setStartTime(initialData.start_time);
      setEndTime(initialData.end_time);
      setStayOver(initialData.stay_over);
      setEmployeeName(initialData.employee_name);
    } else {
      setDate("");
      setPlace("");
      setStartTime("");
      setEndTime("");
      setStayOver(false);
      setEmployeeName(initialEmployeeName);
    }
  }, [initialData, initialEmployeeName]);

  const { hours, amount } = calculateWorkoutStats(startTime, endTime, stayOver);

  const save = async () => {
    if (!date || !place || !startTime || !endTime || !employeeName) {
      return alert("กรุณากรอกข้อมูลให้ครบถ้วน");
    }

    const payload = {
      user_id: userId,
      employee_name: employeeName,
      date,
      location: place,
      start_time: startTime,
      end_time: endTime,
      hours,
      stay_over: stayOver,
      amount,
    };

    let error;
    if (initialData) {
      const res = await supabase
        .from("workouts")
        .update(payload)
        .eq("id", initialData.id);
      error = res.error;
    } else {
      const res = await supabase.from("workouts").insert(payload);
      error = res.error;
    }

    if (!error) {
      alert(initialData ? "อัปเดตข้อมูลสำเร็จ ✅" : "บันทึกข้อมูลสำเร็จ ✅");
      onSuccess();
    } else {
      alert("เกิดข้อผิดพลาด: " + error.message);
    }
  };

  return (
    <CardContent className="pt-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <User className="w-4 h-4 text-slate-400 dark:text-slate-500" /> ชื่อพนักงาน
              </label>
              <Input
                type="text"
                value={employeeName}
                onChange={(e) => setEmployeeName(e.target.value)}
                className="bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                placeholder="ระบุชื่อพนักงาน"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Briefcase className="w-4 h-4 text-slate-400 dark:text-slate-500" /> แผนก
              </label>
              <Input
                type="text"
                value={department}
                disabled
                className="bg-slate-50 dark:bg-slate-800 dark:border-slate-700 text-slate-500 dark:text-slate-400 cursor-not-allowed"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <CalendarDays className="w-4 h-4 text-slate-400 dark:text-slate-500" /> วันที่ปฏิบัติงาน
              </label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-slate-400 dark:text-slate-500" /> สถานที่
              </label>
              <Input
                value={place}
                onChange={(e) => setPlace(e.target.value)}
                className="bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                placeholder="ระบุสถานที่ทำงาน"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 p-5 bg-slate-50/50 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-700 rounded-xl">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Sun className="w-4 h-4 text-orange-400" /> เวลาเริ่ม
              </label>
              <Input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Moon className="w-4 h-4 text-indigo-400" /> เวลากลับ
              </label>
              <Input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white"
              />
            </div>
            <div className="flex flex-col justify-end pb-0.5">
              <label
                className={`flex items-center justify-center gap-2 h-10 border rounded-lg cursor-pointer transition-all select-none ${stayOver ? "bg-indigo-50 dark:bg-indigo-900/30 border-indigo-200 dark:border-indigo-700/50 text-indigo-700 dark:text-indigo-400 font-medium" : "bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600"}`}
              >
                <input
                  type="checkbox"
                  checked={stayOver}
                  onChange={() => setStayOver(!stayOver)}
                  className="w-4 h-4 text-indigo-600 rounded border-slate-300 dark:border-slate-600 dark:bg-slate-800 focus:ring-indigo-500"
                />
                <span className="text-sm">ค้างคืน (Overnight)</span>
              </label>
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 flex flex-col gap-4">
          <div className="bg-blue-600 dark:bg-blue-700 text-white rounded-2xl p-6 shadow-lg shadow-blue-200 dark:shadow-none flex flex-col justify-between h-full min-h-[200px] transition-all">
            <div className="flex justify-between items-start">
              <div className="bg-white/20 p-2.5 rounded-xl backdrop-blur-md">
                <Calculator className="w-6 h-6 text-white" />
              </div>
              <Badge className="bg-white/20 text-white border-none backdrop-blur-md">
                สรุปผลการคำนวณ
              </Badge>
            </div>
            
            <div className="space-y-4">
              <div>
                <p className="text-blue-100 text-sm font-medium opacity-80 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" /> รวมเวลาปฏิบัติงาน
                </p>
                <p className="text-3xl font-extrabold tracking-tight">
                  {hours} <span className="text-lg font-normal opacity-80">ชม.</span>
                </p>
              </div>
              
              <div className="pt-4 border-t border-white/10">
                <p className="text-blue-100 text-sm font-medium opacity-80 flex items-center gap-1.5">
                  <Banknote className="w-3.5 h-3.5" /> เบี้ยเลี้ยงสุทธิ
                </p>
                <p className="text-4xl font-black text-yellow-300 drop-shadow-sm">
                  {amount.toLocaleString()} <span className="text-xl font-normal opacity-80">฿</span>
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            {initialData && (
              <Button
                variant="outline"
                onClick={onCancel}
                className="flex-1 h-12 rounded-xl text-slate-600 dark:text-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:hover:bg-slate-700"
              >
                ยกเลิก
              </Button>
            )}
            <Button
              onClick={save}
              className={`flex-[2] h-12 rounded-xl text-base font-bold shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 ${
                initialData
                  ? "bg-amber-500 hover:bg-amber-600 text-white"
                  : "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200 dark:shadow-none"
              }`}
            >
              <Save className="w-5 h-5" />
              {initialData ? "บันทึกการแก้ไข" : "บันทึกข้อมูล"}
            </Button>
          </div>
        </div>
      </div>
    </CardContent>
  );
}
