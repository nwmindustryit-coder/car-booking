import { NextResponse } from "next/server";
import { getLineClient } from "@/line/client";
import { BookingCreatedFlex } from "@/line/flex/booking-created";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const lineClient = getLineClient();
    
    // ✅ ดึง ID กลุ่ม (หรือ ID ส่วนตัวของคุณ) จาก .env เหมือนที่ทำใน notify-edit/delete
    const ADMIN_GROUP_ID = process.env.LINE_ADMIN_GROUP_ID;

    if (!ADMIN_GROUP_ID) {
      throw new Error("Missing LINE_ADMIN_GROUP_ID in environment variables");
    }

    const message = BookingCreatedFlex(body);

    // ✅ เปลี่ยนจาก broadcast เป็น pushMessage เพื่อเจาะจงเป้าหมายและประหยัดโควต้า
    const resp = await lineClient.pushMessage(ADMIN_GROUP_ID, [message]);

    return NextResponse.json({ success: true, resp });
  } catch (err: any) {
    console.error("LINE ERROR:", err);
    return NextResponse.json(
      { success: false, error: err.message, details: err },
      { status: 500 }
    );
  }
}