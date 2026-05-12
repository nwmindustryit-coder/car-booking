import { NextResponse } from 'next/server'

// ⏳ ฟังก์ชันช่วยรวมเวลา (Merge Time)
function formatMergedTime(timeStr: string) {
  if (!timeStr) return '-';
  const slots = timeStr.split(',').map(s => s.trim());
  if (slots.length === 1) return slots[0];

  let start = slots[0].split('-')[0];
  if (slots[0] === 'ก่อนเวลางาน') start = 'ก่อนเวลางาน';
  if (slots[0] === 'หลังเวลางาน') start = '17:00';

  let end = slots[slots.length - 1].split('-')[1];
  if (slots[slots.length - 1] === 'หลังเวลางาน') end = 'หลังเวลางาน';
  if (slots[slots.length - 1] === 'ก่อนเวลางาน') end = '08:00';

  if (start === 'ก่อนเวลางาน' && end === 'หลังเวลางาน') return 'ตลอดวัน (ก่อน - หลังเวลางาน)';
  if (start === 'ก่อนเวลางาน') return `ก่อนเวลางาน - ${end}`;
  if (end === 'หลังเวลางาน') return `${start} - หลังเวลางาน`;

  return `${start} - ${end}`;
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    // ✅ รับ user_name เพิ่มเข้ามา
    const { user_name, driver_name, destination, time_slot, car_plate, date, reason } = body

    const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
    const CHAT_ID = process.env.TELEGRAM_CHAT_ID

    // แปลงเวลาใช้งาน
    const mergedTime = formatMergedTime(time_slot);
    
    // ดึงเฉพาะชื่อหน้า @ จากอีเมล (เช่น beam@nawamit.com -> beam)
    const requestor = user_name ? user_name.split('@')[0] : 'ไม่ระบุ';
    
    // ✨ แปลงวันที่ที่ส่งมาให้เป็นภาษาไทยแบบสวยงาม
    const dateObj = new Date(date);
    const formattedDate = dateObj.toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    });

    // ✨ จัดรูปแบบข้อความแบบ Premium เต็มสูบ โดยใช้ <blockquote>
    let message = `🆕 <b>แจ้งเตือนจองรถใหม่!</b>\n`;
    message += `📅 <i>${formattedDate}</i>\n\n`;
    message += `<blockquote>`;
    message += `🚗 <b>ทะเบียน:</b> ${car_plate}\n`;
    message += `👨‍✈️ <b>ผู้ขับ:</b> ${driver_name}\n`;
    message += `⏰ <b>เวลา:</b> ${mergedTime}\n`;
    message += `📍 <b>ปลายทาง:</b> ${destination}\n`;
    message += `📝 <b>เหตุผล:</b> ${reason || '-'}\n`;
    message += `👤 <b>ผู้จอง:</b> ${requestor}`;
    message += `</blockquote>\n\n`;
    message += `✅ <i>บันทึกลงระบบเรียบร้อยแล้ว</i>\n`;
    message += `🏢 <i>Nawamit Industry Co., Ltd.</i>`;

    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text: message,
        parse_mode: 'HTML' // บังคับใช้ HTML Mode เสมอ
      })
    })

    if (!response.ok) throw new Error('Failed to send Telegram message')
    
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 })
  }
}