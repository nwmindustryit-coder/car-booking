import { NextResponse } from 'next/server';
import { getLineClient } from "@/line/client";
import * as line from '@line/bot-sdk';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const ADMIN_GROUP_ID = process.env.LINE_ADMIN_GROUP_ID;

    if (!ADMIN_GROUP_ID) {
      throw new Error("Missing LINE_ADMIN_GROUP_ID");
    }

    const lineClient = getLineClient();
    const requestor = body.user_name ? body.user_name.split('@')[0] : 'ไม่ระบุ';

    const flexMessage: line.FlexMessage = {
      type: "flex",
      altText: "🗑️ ยกเลิกการจองรถ",
      contents: {
        type: "bubble",
        header: {
          type: "box",
          layout: "vertical",
          backgroundColor: "#E53935",
          contents: [
            { type: "text", text: "🗑️ ยกเลิกการจองรถ", weight: "bold", color: "#FFFFFF", size: "md" }
          ]
        },
        body: {
          type: "box",
          layout: "vertical",
          spacing: "sm",
          contents: [
            { type: "text", text: `🚘 ทะเบียน: ${body.car_plate}`, weight: "bold", size: "lg" },
            { type: "text", text: `📅 วันที่: ${body.date}` },
            { type: "text", text: `👨‍✈️ ผู้ขับ: ${body.driver_name}` },
            { type: "text", text: `📍 สถานที่: ${body.destination}` },
            { type: "separator", margin: "md" },
            { type: "text", text: `👤 ผู้ยกเลิก: ${requestor}`, size: "xs", color: "#aaaaaa", margin: "sm" }
          ]
        }
      }
    };

    await lineClient.pushMessage(ADMIN_GROUP_ID, [flexMessage]);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("LINE Delete Notify Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}