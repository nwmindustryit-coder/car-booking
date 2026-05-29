import { z } from "zod";

export const bookingSchema = z.object({
  driver_name: z.string().min(1, "กรุณากรอกชื่อผู้ขับ"),
  destination: z.string().min(1, "กรุณากรอกสถานที่"),
  reason: z.string().min(1, "กรุณากรอกเหตุผล"),
  date: z.date({ message: "กรุณาเลือกวันที่" }),
  time_slot: z.array(z.string()).min(1, "กรุณาเลือกช่วงเวลาอย่างน้อย 1 ช่วง"),
});

export const mileSchema = z.object({
  start_mile: z.preprocess(
    (val) => (val === "" ? undefined : Number(val)),
    z.number({ message: "กรุณากรอกเลขไมล์เริ่มต้น" }).min(0, "เลขไมล์ต้องไม่ติดลบ")
  ),
  end_mile: z.preprocess(
    (val) => (val === "" ? undefined : Number(val)),
    z.number({ message: "กรุณากรอกเลขไมล์สิ้นสุด" }).min(0, "เลขไมล์ต้องไม่ติดลบ")
  ),
}).refine((data) => data.end_mile >= data.start_mile, {
  message: "เลขไมล์สิ้นสุดต้องมากกว่าหรือเท่ากับเลขไมล์เริ่มต้น",
  path: ["end_mile"],
});

export const userSchema = z.object({
  email: z.string().email("รูปแบบอีเมลไม่ถูกต้อง"),
  password: z.string().min(6, "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร").optional().or(z.literal("")),
  role: z.string().refine((val) => ["user", "admin"].includes(val), {
    message: "กรุณาเลือกสิทธิ์การใช้งาน",
  }),
  department: z.string().min(1, "กรุณากรอกแผนก"),
});

export type BookingSchema = z.infer<typeof bookingSchema>;
export type MileSchema = z.infer<typeof mileSchema>;
export type UserSchema = z.infer<typeof userSchema>;
