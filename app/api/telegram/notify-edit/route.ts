import { NextResponse } from 'next/server'

// ฟังก์ชันรวมเวลา (ใส่ไว้เพื่อให้แสดงผลแบบช่วงเวลาสวยๆ)
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
    const body = await req.json()
    const { user_name, driver_name, destination, time_slot, car_plate, date, reason } = body
    const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
    const CHAT_ID = process.env.TELEGRAM_CHAT_ID

    const requestor = user_name ? user_name.split('@')[0] : 'ไม่ระบุ';
    const timestamp = new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' });

    const message = `
📝 <b>แจ้งเตือน: มีการแก้ไขข้อมูลการจอง</b>
━━━━━━━━━━━━━━━━━━━━
👤 <b>ผู้แก้ไขรายการ:</b> <code>${requestor}</code>
⏱️ <b>เวลาที่แก้ไข:</b> <code>${timestamp}</code>
━━━━━━━━━━━━━━━━━━━━
🚘 <b>รถทะเบียน:</b> <code>${car_plate}</code>
👨‍✈️ <b>ผู้ขับขี่:</b> <code>${driver_name}</code>
📅 <b>วันที่ใช้งาน:</b> <code>${date}</code>
⏰ <b>เวลาใหม่:</b> <code>${formatMergedTime(time_slot)}</code>

📍 <b>สถานที่:</b> <code>${destination}</code>
📝 <b>เหตุผลใหม่:</b> <i>${reason || '-'}</i>
━━━━━━━━━━━━━━━━━━━━
🏢 <i>Nawamit Industry Co., Ltd.</i>`;

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