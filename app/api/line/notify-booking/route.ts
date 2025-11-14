import { NextResponse } from "next/server";
import { lineClient } from "@/line/client";
import { BookingCreatedFlex } from "@/line/flex/booking-created";

export async function POST(req: Request) {
  const body = await req.json();

  await lineClient.broadcast([
    BookingCreatedFlex(body)
  ]);

  return NextResponse.json({ success: true });
}
