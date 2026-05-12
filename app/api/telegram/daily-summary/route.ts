import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // วันที่สำหรับ Query Database
    const todayDB = new Date().toLocaleDateString('sv-SE')
    
    // ✨ แปลงวันที่เป็นภาษาไทยให้ดูพรีเมียมสำหรับแสดงผลในแชท
    const todayThai = new Date().toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    });

    // ✅ อัปเกรดการดึงข้อมูล: ดึงมาให้ครบทุกฟิลด์ และเรียงตามเวลาที่จอง
    const { data: bookings, error } = await supabase
      .from('bookings')
      .select(`
        id,
        user_name,
        driver_name,
        time_slot,
        destination,
        reason,
        created_at,
        cars(plate)
      `)
      .eq('date', todayDB)
      .order('created_at', { ascending: true })

    if (error) throw error

    const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
    const CHAT_ID = process.env.TELEGRAM_CHAT_ID

    // ✨ จัดรูปแบบข้อความแบบ Premium (ใช้ Blockquote เพื่อให้ดูเป็นการ์ดเหมือน LINE Flex)
    let message = `📣 <b>สรุปคิวรถส่วนกลางประจำวัน</b>\n📅 <i>${todayThai}</i>\n\n`;
    
    if (!bookings || bookings.length === 0) {
      message += `✨ <i>วันนี้ยังไม่มีรายการจองรถครับ</i>\n\n`;
    } else {
      message += `📊 <b>จำนวนคิวทั้งหมด:</b> ${bookings.length} รายการ\n━━━━━━━━━━━━━━━━━━━\n\n`;
      
      bookings.forEach((b: any, index: number) => {
        const mergedTime = formatMergedTime(b.time_slot);
        const plate = b.cars?.plate || 'ไม่ระบุ';
        
        // ใช้ <blockquote> เพื่อสร้างแถบสีด้านซ้าย คล้ายๆ กล่องข้อความ
        message += `🚗 <b>[คิวที่ ${index + 1}] ทะเบียน: ${plate}</b>\n`;
        message += `<blockquote>`;
        message += `👨‍✈️ <b>ผู้ขับ:</b> ${b.driver_name}\n`;
        message += `⏰ <b>เวลา:</b> ${mergedTime}\n`;
        message += `📍 <b>ปลายทาง:</b> ${b.destination}\n`;
        message += `📝 <b>เหตุผล:</b> ${b.reason || '-'}\n`;
        message += `👤 <b>ผู้จอง:</b> ${b.user_name?.split('@')[0] || '-'}`;
        message += `</blockquote>\n\n`;
      });
    }

    message += `🏢 <i>Nawamit Industry Co., Ltd.</i>`;

    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text: message,
        parse_mode: 'HTML' // บังคับใช้ HTML Mode เสมอ
      })
    })

    return NextResponse.json({ success: true, count: bookings?.length || 0 })
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 })
  }
}