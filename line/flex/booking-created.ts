import { FlexMessage } from "@line/bot-sdk";

export function BookingCreatedFlex(data: any): FlexMessage {
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
            //   { type: "text", text: `👤 ผู้จอง: ${data.user_name}` },
              { type: "text", text: `🚘 ผู้ขับ: ${data.driver_name}` },
              { type: "text", text: `🔖 รถ: ${data.car_plate}` },
              { type: "text", text: `📅 วันที่: ${data.date}` },
              { type: "text", text: `⏰ เวลา: ${data.time_slot}` },
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
