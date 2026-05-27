import { NextResponse } from 'next/server';
import { getLineClient } from "@/line/client";
import { mergeTimeSlots } from "@/line/flex/booking-created";
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

    const hasChanged = (oldVal: any, newVal: any) => oldVal !== newVal;

    const changes: line.FlexComponent[] = [
      { type: "text", text: `🚘 ทะเบียน: ${body.car_plate}`, weight: "bold", size: "lg" }
    ];

    // 👨‍✈️ Driver
    if (hasChanged(body.old_driver_name, body.driver_name)) {
      changes.push({
        type: "box",
        layout: "vertical",
        contents: [
          { type: "text", text: "👨‍✈️ ผู้ขับ (เปลี่ยนเป็น):", size: "sm", color: "#888888" },
          { type: "text", text: `${body.old_driver_name} ➔ ${body.driver_name}`, weight: "bold", color: "#E65100" }
        ]
      });
    } else {
      changes.push({ type: "text", text: `👨‍✈️ ผู้ขับ: ${body.driver_name}`, size: "sm" });
    }

    // 📅 Date
    if (hasChanged(body.old_date, body.date)) {
      changes.push({
        type: "box",
        layout: "vertical",
        contents: [
          { type: "text", text: "📅 วันที่ (เปลี่ยนเป็น):", size: "sm", color: "#888888" },
          { type: "text", text: `${body.old_date} ➔ ${body.date}`, weight: "bold", color: "#E65100" }
        ]
      });
    } else {
      changes.push({ type: "text", text: `📅 วันที่: ${body.date}`, size: "sm" });
    }

    // ⏰ Time
    const oldTimeMerged = mergeTimeSlots(body.old_time_slot);
    const newTimeMerged = mergeTimeSlots(body.time_slot);
    if (hasChanged(body.old_time_slot, body.time_slot)) {
      changes.push({
        type: "box",
        layout: "vertical",
        contents: [
          { type: "text", text: "⏰ เวลา (เปลี่ยนเป็น):", size: "sm", color: "#888888" },
          { type: "text", text: `${oldTimeMerged} ➔ ${newTimeMerged}`, weight: "bold", color: "#E65100" }
        ]
      });
    } else {
      changes.push({ type: "text", text: `⏰ เวลา: ${newTimeMerged}`, size: "sm" });
    }

    // 📍 Destination
    if (hasChanged(body.old_destination, body.destination)) {
      changes.push({
        type: "box",
        layout: "vertical",
        contents: [
          { type: "text", text: "📍 สถานที่ (เปลี่ยนเป็น):", size: "sm", color: "#888888" },
          { type: "text", text: `${body.old_destination} ➔ ${body.destination}`, weight: "bold", color: "#E65100" }
        ]
      });
    } else {
      changes.push({ type: "text", text: `📍 สถานที่: ${body.destination}`, size: "sm" });
    }

    // 📝 Reason (Optional)
    if (body.reason && hasChanged(body.old_reason, body.reason)) {
      changes.push({
        type: "box",
        layout: "vertical",
        contents: [
          { type: "text", text: "📝 หมายเหตุ (แก้ไข):", size: "sm", color: "#888888" },
          { type: "text", text: body.reason, size: "sm", wrap: true }
        ]
      });
    }

    const flexMessage: line.FlexMessage = {
      type: "flex",
      altText: "📝 มีการแก้ไขการจองรถ",
      contents: {
        type: "bubble",
        header: {
          type: "box",
          layout: "vertical",
          backgroundColor: "#FFB300",
          contents: [
            { type: "text", text: "📝 แก้ไขการจองรถ", weight: "bold", color: "#FFFFFF", size: "md" }
          ]
        },
        body: {
          type: "box",
          layout: "vertical",
          spacing: "md",
          contents: [
            ...changes,
            { type: "separator", margin: "md" },
            { type: "text", text: `👤 ผู้แก้ไข: ${requestor}`, size: "xs", color: "#aaaaaa", margin: "sm" }
          ]
        }
      }
    };

    await lineClient.pushMessage(ADMIN_GROUP_ID, [flexMessage]);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("LINE Edit Notify Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}