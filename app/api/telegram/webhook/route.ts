import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// ⏳ ฟังก์ชันช่วยรวมเวลา (Merge Time) ตัวเดียวกับที่คุณมี
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
    const body = await req.json();

    // 1. ตรวจสอบว่ามีข้อความส่งมา และข้อความนั้นคือ "/status" ใช่หรือไม่
    if (body.message && body.message.text === '/status') {
      const chatId = body.message.chat.id; // ดึง ID ของห้องแชทที่พิมพ์คำสั่งมา
      const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

      // 2. ดึงข้อมูลจาก Supabase (เหมือนใน daily-summary)
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )

      const today = new Date().toLocaleDateString('sv-SE')

      const { data: bookings, error } = await supabase
        .from('bookings')
        .select(`id, user_name, driver_name, time_slot, destination, reason, created_at, cars(plate)`)
        .eq('date', today)
        .order('created_at', { ascending: true })

      if (error) throw error;

      // 3. จัดรูปแบบข้อความแบบ Premium
      let message = `📊 <b>อัปเดตคิวรถ ณ ปัจจุบัน (${today})</b>\n`;
      
      if (!bookings || bookings.length === 0) {
        message += `━━━━━━━━━━━━━━━━━━━━\n✨ <i>ขณะนี้ยังไม่มีรายการจองรถครับ</i>\n━━━━━━━━━━━━━━━━━━━━`;
      } else {
        message += `📈 <b>จำนวนคิวทั้งหมด:</b> <code>${bookings.length}</code> รายการ\n━━━━━━━━━━━━━━━━━━━━\n\n`;
        
        bookings.forEach((b: any, index: number) => {
          const mergedTime = formatMergedTime(b.time_slot);
          message += `🚗 <b>คิวที่ ${index + 1} | 🔖 ทะเบียน:</b> <code>${b.cars?.plate || 'ไม่ระบุ'}</code>
👨‍✈️ <b>ผู้ขับ:</b> <code>${b.driver_name}</code>
⏰ <b>เวลา:</b> <code>${mergedTime}</code>
📍 <b>ปลายทาง:</b> <code>${b.destination}</code>
👤 <b>ผู้จอง:</b> ${b.user_name?.split('@')[0] || '-'}
┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈\n`;
        });
      }

      // 4. ส่งข้อความกลับไปที่ห้องแชทเดิม
      await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: 'HTML'
        })
      });
    }

    // ✅ ต้องตอบกลับ 200 เสมอ เพื่อให้ Telegram รู้ว่าเรารับข้อมูลแล้ว (ไม่งั้นบอทจะค้าง)
    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("Webhook Error:", error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}