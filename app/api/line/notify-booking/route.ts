import { NextResponse } from "next/server";
import { getLineClient } from "@/line/client";
import { BookingCreatedFlex } from "@/line/flex/booking-created";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const lineClient = getLineClient();

    const message = BookingCreatedFlex(body);

    const resp = await lineClient.broadcast([message]);

    return NextResponse.json({ success: true, resp });
  } catch (err: any) {
    console.error("LINE ERROR:", err);
    return NextResponse.json(
      { success: false, error: err.message, details: err },
      { status: 500 }
    );
  }
}
console.log("TOKEN RUNTIME:", process.env.LINE_CHANNEL_ACCESS_TOKEN);
