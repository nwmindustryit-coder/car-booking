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
    
    // ดึงเวลาปัจจุบัน (เวลาที่กดจอง)
    const timestamp = new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' });

    // ✨ จัดรูปแบบข้อความแบบ Premium เต็มสูบ
    const message = `
🆕 <b>แจ้งเตือน: มีรายการจองรถใหม่เข้าสู่ระบบ!</b>
━━━━━━━━━━━━━━━━━━━━
👤 <b>ผู้ทำรายการจอง:</b> <code>${requestor}</code>
⏱️ <b>เวลาที่ทำรายการ:</b> <code>${timestamp}</code>
━━━━━━━━━━━━━━━━━━━━
🚘 <b>รถที่จอง (ทะเบียน):</b> <code>${car_plate}</code>
👨‍✈️ <b>ผู้รับผิดชอบขับขี่:</b> <code>${driver_name}</code>
📅 <b>วันที่ใช้งาน:</b> <code>${date}</code>
⏰ <b>ช่วงเวลาที่ใช้:</b> <code>${mergedTime}</code>

📍 <b>จุดหมายปลายทาง:</b>
└ <code>${destination}</code>

📝 <b>เหตุผล / รายละเอียด:</b>
└ <i>${reason || 'ไม่มีการระบุ'}</i>
━━━━━━━━━━━━━━━━━━━━
✅ <i>ระบบบันทึกข้อมูลลงฐานข้อมูลเรียบร้อยแล้ว</i>
🏢 <i>Nawamit Industry Co., Ltd.</i>`;

    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text: message,
        parse_mode: 'HTML'
      })
    })

    if (!response.ok) throw new Error('Failed to send Telegram message')
    
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 })
  }
}