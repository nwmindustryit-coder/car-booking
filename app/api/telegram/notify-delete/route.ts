import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { user_name, driver_name, car_plate, date, destination } = body
    const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
    const CHAT_ID = process.env.TELEGRAM_CHAT_ID

    // ดึงเฉพาะชื่อหน้า @ จากอีเมล
    const requestor = user_name ? user_name.split('@')[0] : 'ไม่ระบุ';
    const timestamp = new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' });

    // แปลงวันที่ใช้งานเดิมให้เป็นภาษาไทยแบบสวยงาม
    const dateObj = new Date(date);
    const formattedDate = dateObj.toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    });

    // จัดรูปแบบข้อความแบบ Premium (ไม่มีอีโมจิ, ทางการ)
    let message = `<b>[แจ้งยกเลิกการจองรถส่วนกลาง]</b>\n`;
    message += `กำหนดการเดิม: ${formattedDate}\n\n`;
    message += `<blockquote>`;
    message += `<b>ทะเบียนรถ:</b> ${car_plate}\n`;
    message += `<b>ผู้ขับขี่:</b> ${driver_name}\n`;
    message += `<b>ปลายทาง:</b> ${destination}\n`;
    message += `<b>ผู้ยกเลิกรายการ:</b> ${requestor}`;
    message += `</blockquote>\n\n`;
    message += `<i>* ข้อมูลถูกนำออกจากระบบแล้วเมื่อ ${timestamp}</i>\n`;
    message += `<i>Nawamit Industry Co., Ltd.</i>`;

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