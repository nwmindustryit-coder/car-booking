import { NextResponse } from 'next/server';
import * as line from '@line/bot-sdk';

const lineConfig = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || '',
  channelSecret: process.env.LINE_CHANNEL_SECRET || '',
};
const lineClient = new line.Client(lineConfig);

// ฟังก์ชันยุบรวมเวลา
function formatMergedTime(timeStr: string) {
  if (!timeStr) return '-';
  const slots = timeStr.split(',').map(s => s.trim());
  if (slots.length === 1) return slots[0];
  let start = slots[0].split('-')[0];
  let end = slots[slots.length - 1].split('-')[1];
  return `${start} - ${end}`;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const ADMIN_GROUP_ID = process.env.LINE_ADMIN_GROUP_ID; // ✅ ดึง ID กลุ่มจาก .env

    if (!ADMIN_GROUP_ID) {
      throw new Error("Missing LINE_ADMIN_GROUP_ID");
    }

    const requestor = body.user_name ? body.user_name.split('@')[0] : 'ไม่ระบุ';
    const mergedTime = formatMergedTime(body.time_slot);

    // 🎨 สร้าง Flex Message สไตล์พรีเมียม
    const flexMessage: line.FlexMessage = {
      type: "flex",
      altText: "📝 มีการแก้ไขการจองรถ",
      contents: {
        type: "bubble",
        header: {
          type: "box",
          layout: "vertical",
          backgroundColor: "#FFB300", // สีส้มทอง บ่งบอกถึงการแก้ไข
          contents: [
            { type: "text", text: "📝 มีการแก้ไขการจองรถ", weight: "bold", color: "#FFFFFF", size: "md" }
          ]
        },
        body: {
          type: "box",
          layout: "vertical",
          spacing: "sm",
          contents: [
            { type: "text", text: `🚘 ทะเบียน: ${body.car_plate}`, weight: "bold", size: "lg" },
            { type: "text", text: `👨‍✈️ ผู้ขับ: ${body.driver_name}` },
            { type: "text", text: `📅 วันที่: ${body.date}` },
            { type: "text", text: `⏰ เวลาใหม่: ${mergedTime}`, color: "#1976D2", weight: "bold" },
            { type: "text", text: `📍 สถานที่: ${body.destination}` },
            { type: "separator", margin: "md" },
            { type: "text", text: `👤 ผู้แก้ไข: ${requestor}`, size: "xs", color: "#aaaaaa", margin: "sm" }
          ]
        }
      }
    };

    // ✅ ใช้ pushMessage ส่งเข้ากลุ่มโดยตรง (ประหยัดโควต้า)
    await lineClient.pushMessage(ADMIN_GROUP_ID, [flexMessage]);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("LINE Edit Notify Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}