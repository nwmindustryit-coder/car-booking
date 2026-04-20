import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { user_name, driver_name, car_plate, date, destination } = body
    const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
    const CHAT_ID = process.env.TELEGRAM_CHAT_ID

    const requestor = user_name ? user_name.split('@')[0] : 'ไม่ระบุ';
    const timestamp = new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' });

    const message = `
🗑️ <b>แจ้งเตือน: มีการยกเลิกการจองรถ</b>
━━━━━━━━━━━━━━━━━━━━
👤 <b>ผู้ลบรายการ:</b> <code>${requestor}</code>
⏱️ <b>เวลาที่ลบ:</b> <code>${timestamp}</code>
━━━━━━━━━━━━━━━━━━━━
❌ <b>รายการที่ถูกยกเลิก:</b>
🚘 รถทะเบียน: <code>${car_plate}</code>
📅 วันที่เคยจอง: <code>${date}</code>
👨‍✈️ ผู้ขับเดิม: <code>${driver_name}</code>
📍 สถานที่เดิม: <code>${destination}</code>
━━━━━━━━━━━━━━━━━━━━
⚠️ <i>รายการนี้ถูกนำออกจากระบบแล้ว</i>`;

    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: CHAT_ID, text: message, parse_mode: 'HTML' })
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ success: false }, { status: 500 })
  }
}