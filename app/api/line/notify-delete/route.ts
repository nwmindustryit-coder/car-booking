import { NextResponse } from 'next/server';
import * as line from '@line/bot-sdk';

const lineConfig = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || '',
  channelSecret: process.env.LINE_CHANNEL_SECRET || '',
};
const lineClient = new line.Client(lineConfig);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const ADMIN_GROUP_ID = process.env.LINE_ADMIN_GROUP_ID; // ✅ ดึง ID กลุ่มจาก .env

    if (!ADMIN_GROUP_ID) {
      throw new Error("Missing LINE_ADMIN_GROUP_ID");
    }

    const requestor = body.user_name ? body.user_name.split('@')[0] : 'ไม่ระบุ';

    // 🎨 สร้าง Flex Message สีแดง บ่งบอกถึงการยกเลิก
    const flexMessage: line.FlexMessage = {
      type: "flex",
      altText: "🗑️ ยกเลิกการจองรถ",
      contents: {
        type: "bubble",
        header: {
          type: "box",
          layout: "vertical",
          backgroundColor: "#E53935", // สีแดงแจ้งเตือน
          contents: [
            { type: "text", text: "🗑️ ยกเลิกการจองรถ", weight: "bold", color: "#FFFFFF", size: "md" }
          ]
        },
        body: {
          type: "box",
          layout: "vertical",
          spacing: "sm",
          contents: [
            { type: "text", text: `❌ รายการที่ถูกยกเลิก:` },
            { type: "text", text: `🚘 ทะเบียน: ${body.car_plate}`, weight: "bold" },
            { type: "text", text: `📅 วันที่จอง: ${body.date}` },
            { type: "text", text: `👨‍✈️ ผู้ขับเดิม: ${body.driver_name}` },
            { type: "separator", margin: "md" },
            { type: "text", text: `👤 ผู้ยกเลิก: ${requestor}`, size: "xs", color: "#aaaaaa", margin: "sm" }
          ]
        }
      }
    };

    // ✅ ใช้ pushMessage ส่งเข้ากลุ่ม
    await lineClient.pushMessage(ADMIN_GROUP_ID, [flexMessage]);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("LINE Delete Notify Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}