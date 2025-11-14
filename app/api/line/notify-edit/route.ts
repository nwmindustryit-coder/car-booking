import { NextResponse } from "next/server";
import { lineClient } from "@/line/client";

export async function POST(req: Request) {
  const body = await req.json();

  await lineClient.broadcast([
    {
      type: "flex",
      altText: "มีการแก้ไขการจองรถ",
      contents: {
        type: "bubble",
        hero: {
          type: "image",
          url: "https://i.ibb.co/rK0zW1xR/car-wash.png",
          size: "full",
          aspectRatio: "20:13",
          aspectMode: "cover"
        },
        body: {
          type: "box",
          layout: "vertical",
          contents: [
            {
              type: "text",
              text: "🚗 การจองถูกแก้ไข",
              weight: "bold",
              size: "xl",
              color: "#1B95E0"
            },
            {
              type: "separator",
              margin: "md"
            },
            {
              type: "text",
              text: `ผู้ขับ: ${body.driver_name}`,
              margin: "md"
            },
            {
              type: "text",
              text: `รถ: ${body.car_plate}`,
            },
            {
              type: "text",
              text: `วันที่: ${body.date}`,
            },
            {
              type: "text",
              text: `เวลา: ${body.time_slot}`,
            },
            {
              type: "text",
              text: `สถานที่: ${body.destination}`,
            }
          ]
        }
      }
    }
  ]);

  return NextResponse.json({ success: true });
}
