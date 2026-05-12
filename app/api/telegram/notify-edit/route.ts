import { NextResponse } from 'next/server'

// ฟังก์ชันรวมเวลา
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

// ฟังก์ชันสำหรับเปรียบเทียบและไฮไลต์เฉพาะส่วนที่ถูกแก้ไข
function formatChange(label: string, oldVal: string | undefined, newVal: string | undefined) {
  // ถ้ายกเลิกการเปรียบเทียบ (ไม่มีค่าเก่าส่งมา) หรือ ค่าเก่าตรงกับค่าใหม่ ให้แสดงปกติ
  if (!oldVal || oldVal === newVal) {
    return `<b>${label}:</b> ${newVal || '-'}\n`;
  }
  // ถ้าไม่ตรงกัน ให้ขีดฆ่าของเก่า และขีดเส้นใต้ของใหม่
  return `<b>${label}:</b> <s>${oldVal}</s> ➡️ <u>${newVal || '-'}</u>\n`;
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    // รับค่าใหม่ และ ค่าเก่า (ถ้ามีส่งมา) เพื่อนำมาเปรียบเทียบ
    const { 
      user_name, driver_name, destination, time_slot, car_plate, date, reason,
      old_driver_name, old_destination, old_time_slot, old_date, old_reason
    } = body
    
    const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
    const CHAT_ID = process.env.TELEGRAM_CHAT_ID

    const requestor = user_name ? user_name.split('@')[0] : 'ไม่ระบุ';
    const timestamp = new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' });

    // แปลงวันที่เป็นภาษาไทย
    const dateObj = new Date(date);
    const formattedDate = dateObj.toLocaleDateString('th-TH', {
      year: 'numeric', month: 'long', day: 'numeric', weekday: 'long'
    });

    // แปลงวันที่เก่าเป็นภาษาไทย (ถ้ามีการส่งมาและไม่ตรงกับวันใหม่)
    let oldFormattedDate = old_date;
    if (old_date && old_date !== date) {
       const oldDateObj = new Date(old_date);
       oldFormattedDate = oldDateObj.toLocaleDateString('th-TH', {
         year: 'numeric', month: 'long', day: 'numeric', weekday: 'long'
       });
    }

    const newTime = formatMergedTime(time_slot);
    const oldTime = old_time_slot ? formatMergedTime(old_time_slot) : undefined;

    // จัดรูปแบบข้อความแบบ Premium (ไม่มีอีโมจิ, ทางการ)
    let message = `<b>[แจ้งอัปเดตข้อมูลการจองรถส่วนกลาง]</b>\n`;
    message += `อัปเดตเมื่อ: ${timestamp}\n\n`;
    
    message += `<blockquote>`;
    message += `<b>ทะเบียนรถ:</b> ${car_plate}\n`;
    message += formatChange('วันที่ใช้งาน', oldFormattedDate, formattedDate);
    message += formatChange('เวลา', oldTime, newTime);
    message += formatChange('ผู้ขับขี่', old_driver_name, driver_name);
    message += formatChange('ปลายทาง', old_destination, destination);
    message += formatChange('เหตุผล', old_reason, reason);
    message += `<b>ผู้ทำรายการแก้ไข:</b> ${requestor}`;
    message += `</blockquote>\n\n`;
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