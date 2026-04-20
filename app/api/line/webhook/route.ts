import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // เช็คว่ามี Event ส่งมาจาก LINE หรือไม่
    if (body.events && body.events.length > 0) {
      const event = body.events[0];

      // เช็คว่าเป็น Event ประเภท "ส่งข้อความ" หรือไม่
      if (event.type === 'message' && event.message.type === 'text') {
        const userText = event.message.text.toLowerCase();
        const userId = event.source.userId; // 🎯 ตรงนี้แหละครับคือตัวเก็บ User ID ของคนที่ทักมา
        const replyToken = event.replyToken;
        const CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;

        // ถ้ามีคนพิมพ์คำว่า myid (หรือคำอะไรก็ได้ที่คุณตั้งไว้)
        if (userText === 'myid') {
          // สั่งให้บอทตอบกลับเป็น User ID ของคนนั้น
          await fetch('https://api.line.me/v2/bot/message/reply', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${CHANNEL_ACCESS_TOKEN}`
            },
            body: JSON.stringify({
              replyToken: replyToken,
              messages: [
                {
                  type: 'text',
                  text: `User ID ของคุณคือ:\n${userId}`
                }
              ]
            })
          });
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("LINE Webhook Error:", error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}