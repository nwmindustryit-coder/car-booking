import { FlexMessage } from "@line/bot-sdk";

export function BookingCreatedFlex(data: any): FlexMessage {
  const TIME_SLOTS = [
    'ก่อนเวลางาน',
    '08:00-09:00',
    '09:01-10:00',
    '10:01-11:00',
    '11:01-12:00',
    '13:00-14:00',
    '14:01-15:00',
    '15:01-16:00',
    '16:01-17:00',
    'หลังเวลางาน',
  ]

  function mergeTimeSlots(timeSlotString: string): string {
    if (!timeSlotString) return ''
    const slots = timeSlotString.split(',').map(s => s.trim())
    if (slots.length === 1) return slots[0]

    const indexes = slots
      .map(s => TIME_SLOTS.indexOf(s))
      .filter(i => i !== -1)
      .sort((a, b) => a - b)

    if (indexes.length === 0) return timeSlotString

    const groups: number[][] = []
    let currentGroup: number[] = [indexes[0]]

    // ✅ จัดกลุ่มช่วงเวลาที่ต่อเนื่องกัน
    for (let i = 1; i < indexes.length; i++) {
      if (indexes[i] === indexes[i - 1] + 1) {
        currentGroup.push(indexes[i])
      } else {
        groups.push(currentGroup)
        currentGroup = [indexes[i]]
      }
    }
    groups.push(currentGroup)

    // ✅ แปลงแต่ละกลุ่มเป็นข้อความช่วงเวลา
    const formattedGroups = groups.map(group => {
      const firstSlot = TIME_SLOTS[group[0]]
      const lastSlot = TIME_SLOTS[group[group.length - 1]]

      // กรณีช่วงเดียว
      if (group.length === 1) return firstSlot

      // กรณีแรกคือ "ก่อนเวลางาน"
      if (firstSlot === 'ก่อนเวลางาน') {
        const endTime = lastSlot.split('-').pop()
        return `ก่อนเวลางาน-${endTime}`
      }

      // กรณีท้ายคือ "หลังเวลางาน"
      if (lastSlot === 'หลังเวลางาน') {
        const startTime = firstSlot.split('-')[0]
        return `${startTime}-หลังเวลางาน`
      }

      // กรณีทั่วไป
      const startTime = firstSlot.split('-')[0]
      const endTime = lastSlot.split('-').pop()
      return `${startTime}-${endTime}`
    })

    // ✅ รวมข้อความแต่ละกลุ่มด้วยคำว่า "และ"
    return formattedGroups.join(' และ ')
  }

  return {
    type: "flex",
    altText: "🚗 มีการจองรถใหม่เข้ามา",
    contents: {
      type: "bubble",
      hero: {
        type: "image",
        url: "https://i.ibb.co/rK0zW1xR/car-wash.png",
        size: "full",
        aspectRatio: "20:13",
        aspectMode: "cover",
      },
      body: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "text",
            text: "🚗 มีการจองรถใหม่",
            weight: "bold",
            size: "xl",
            margin: "md"
          },
          {
            type: "box",
            layout: "vertical",
            margin: "lg",
            spacing: "sm",
            contents: [
              // ถ้าอยากให้แสดงชื่อคนจองด้วย เอาคอมเมนต์บรรทัดล่างออกได้นะครับ
              // { type: "text", text: `👤 ผู้จอง: ${data.user_name ? data.user_name.split('@')[0] : '-'}` }, 
              { type: "text", text: `🚘 ผู้ขับ: ${data.driver_name}` },
              { type: "text", text: `🔖 รถ: ${data.car_plate}` },
              { type: "text", text: `📅 วันที่: ${data.date}` },
              // ✅ เรียกใช้ฟังก์ชัน mergeTimeSlots ตรงนี้ครับ
              { type: "text", text: `⏰ เวลา: ${mergeTimeSlots(data.time_slot)}` },
              { type: "text", text: `📍 สถานที่: ${data.destination}` },
            ]
          }
        ]
      },
      footer: {
        type: "box",
        layout: "vertical",
        spacing: "md",
        contents: [
          {
            type: "button",
            style: "primary",
            color: "#1E88E5",
            action: {
              type: "uri",
              label: "เปิดหน้าเว็บจองรถ",
              uri: "https://car-booking-tan.vercel.app/",
            },
          },
        ],
      },
    },
  };
}