import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CardContent } from "@/components/ui/card";
import { User, Briefcase, CalendarDays, MapPin, Sun, Moon, Calculator, Clock, Banknote, Save } from "lucide-react";
import { calculateWorkoutStats } from "@/hooks/useWorkouts";
import { Workout } from "@/types/index";
import { supabase } from "@/lib/supabaseClient";
import { useAlert } from "@/components/ui/alert-provider";

const workoutSchema = z.object({
  employee_name: z.string().min(1, "กรุณากรอกชื่อพนักงาน"),
  date: z.string().min(1, "กรุณาเลือกวันที่"),
  location: z.string().min(1, "กรุณากรอกสถานที่"),
  start_time: z.string().min(1, "กรุณาเลือกเวลาเริ่ม"),
  end_time: z.string().min(1, "กรุณาเลือกเวลากลับ"),
  stay_over: z.boolean(),
});

type WorkoutFormValues = z.infer<typeof workoutSchema>;

interface WorkOutFormProps {
  userId: string;
  initialData?: Workout | null;
  department: string;
  employeeName: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export function WorkOutForm({ userId, initialData, department, employeeName, onSuccess, onCancel }: WorkOutFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { showAlert } = useAlert();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<WorkoutFormValues>({
    resolver: zodResolver(workoutSchema),
    defaultValues: {
      employee_name: employeeName,
      stay_over: false,
    },
  });

  useEffect(() => {
    if (initialData) {
      reset({
        employee_name: initialData.employee_name,
        date: initialData.date,
        location: initialData.location,
        start_time: initialData.start_time,
        end_time: initialData.end_time,
        stay_over: !!initialData.stay_over,
      });
    } else {
      reset({
        employee_name: employeeName,
        date: "",
        location: "",
        start_time: "",
        end_time: "",
        stay_over: false,
      });
    }
  }, [initialData, employeeName, reset]);

  const startTime = watch("start_time");
  const endTime = watch("end_time");
  const stayOver = watch("stay_over");

  const { hours, amount } = calculateWorkoutStats(startTime, endTime, stayOver);

  const onSubmit = async (data: WorkoutFormValues) => {
    setIsSubmitting(true);
    const payload = {
      user_id: userId,
      ...data,
      hours,
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

    setIsSubmitting(false);
    if (!error) {
      showAlert({
        title: "สำเร็จ!",
        description: initialData ? "อัปเดตข้อมูลการปฏิบัติงานเรียบร้อยแล้ว" : "บันทึกข้อมูลการปฏิบัติงานเรียบร้อยแล้ว",
        type: "success",
        onConfirm: onSuccess
      });
    } else {
      showAlert({
        title: "เกิดข้อผิดพลาด",
        description: error.message,
        type: "error"
      });
    }
  };

  return (
    <CardContent className="pt-6">
      <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <User className="w-4 h-4 text-slate-400 dark:text-slate-500" /> ชื่อพนักงาน
              </label>
              <Input
                {...register("employee_name")}
                className={errors.employee_name ? "border-red-500 focus-visible:ring-red-500" : ""}
                placeholder="ระบุชื่อพนักงาน"
              />
              {errors.employee_name && <p className="text-xs text-red-500">{errors.employee_name.message}</p>}
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Briefcase className="w-4 h-4 text-slate-400 dark:text-slate-500" /> แผนก
              </label>
              <Input value={department} disabled className="bg-slate-50 dark:bg-slate-800 cursor-not-allowed" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <CalendarDays className="w-4 h-4 text-slate-400 dark:text-slate-500" /> วันที่ปฏิบัติงาน
              </label>
              <Input
                type="date"
                {...register("date")}
                className={errors.date ? "border-red-500 focus-visible:ring-red-500" : ""}
              />
              {errors.date && <p className="text-xs text-red-500">{errors.date.message}</p>}
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-slate-400 dark:text-slate-500" /> สถานที่
              </label>
              <Input
                {...register("location")}
                className={errors.location ? "border-red-500 focus-visible:ring-red-500" : ""}
                placeholder="ระบุสถานที่ทำงาน"
              />
              {errors.location && <p className="text-xs text-red-500">{errors.location.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 p-5 bg-slate-50/50 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-700 rounded-xl">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Sun className="w-4 h-4 text-orange-400" /> เวลาเริ่ม
              </label>
              <Input
                type="time"
                {...register("start_time")}
                className={errors.start_time ? "border-red-500 focus-visible:ring-red-500" : ""}
              />
              {errors.start_time && <p className="text-xs text-red-500">{errors.start_time.message}</p>}
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Moon className="w-4 h-4 text-indigo-400" /> เวลากลับ
              </label>
              <Input
                type="time"
                {...register("end_time")}
                className={errors.end_time ? "border-red-500 focus-visible:ring-red-500" : ""}
              />
              {errors.end_time && <p className="text-xs text-red-500">{errors.end_time.message}</p>}
            </div>
            <div className="flex flex-col justify-end pb-0.5">
              <label
                className={`flex items-center justify-center gap-2 h-10 border rounded-lg cursor-pointer transition-all select-none ${stayOver ? "bg-indigo-50 dark:bg-indigo-900/30 border-indigo-200 dark:border-indigo-700/50 text-indigo-700 dark:text-indigo-400 font-medium" : "bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600"}`}
              >
                <input
                  type="checkbox"
                  checked={stayOver}
                  onChange={(e) => setValue("stay_over", e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                />
                <span className="text-sm">ค้างคืน (Overnight)</span>
              </label>
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 flex flex-col gap-4">
          <div className="bg-blue-600 dark:bg-blue-700 text-white rounded-2xl p-6 shadow-lg flex flex-col justify-between h-full min-h-[200px]">
            <div className="flex justify-between items-start">
              <div className="bg-white/20 p-2.5 rounded-xl backdrop-blur-md">
                <Calculator className="w-6 h-6 text-white" />
              </div>
              <Badge className="bg-white/20 text-white border-none backdrop-blur-md">สรุปผลการคำนวณ</Badge>
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-blue-100 text-sm font-medium opacity-80 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" /> รวมเวลาปฏิบัติงาน
                </p>
                <p className="text-3xl font-extrabold">{hours} <span className="text-lg font-normal opacity-80">ชม.</span></p>
              </div>
              <div className="pt-4 border-t border-white/10">
                <p className="text-blue-100 text-sm font-medium opacity-80 flex items-center gap-1.5">
                  <Banknote className="w-3.5 h-3.5" /> เบี้ยเลี้ยงสุทธิ
                </p>
                <p className="text-4xl font-black text-yellow-300">{amount.toLocaleString()} <span className="text-xl font-normal opacity-80">฿</span></p>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            {initialData && (
              <Button type="button" variant="outline" onClick={onCancel} className="flex-1 h-12 rounded-xl">ยกเลิก</Button>
            )}
            <Button
              type="submit"
              disabled={isSubmitting}
              className={`flex-[2] h-12 rounded-xl text-base font-bold shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 ${
                initialData ? "bg-amber-500 hover:bg-amber-600 text-white" : "bg-blue-600 hover:bg-blue-700 text-white"
              }`}
            >
              {isSubmitting ? <Clock className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              {initialData ? "บันทึกการแก้ไข" : "บันทึกข้อมูล"}
            </Button>
          </div>
        </div>
      </form>
    </CardContent>
  );
}
