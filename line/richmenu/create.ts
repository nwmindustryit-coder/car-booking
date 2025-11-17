import { getLineClient } from "../client";

export async function createRichMenu() {
  const lineClient = getLineClient();
  const richMenu = await lineClient.createRichMenu({
    size: { width: 2500, height: 1686 },
    selected: true,
    name: "Main Menu",
    chatBarText: "เมนูหลัก",
    areas: [
      // ปุ่มซ้าย → จองรถ
      {
        bounds: { x: 0, y: 843, width: 833, height: 843 },
        action: { type: "uri", uri: "https://car-booking-tan.vercel.app/booking" },
      },

      // ปุ่มกลาง → ลงเลขไมล์รถส่วนตัว (ลิงก์ชั่วคราว)
      {
        bounds: { x: 833, y: 843, width: 833, height: 843 },
        action: { type: "uri", uri: "https://car-booking-tan.vercel.app/private-mile" },
      },

      // ปุ่มขวา → เช็คคิวรถ
      {
        bounds: { x: 1666, y: 843, width: 834, height: 843 },
        action: { type: "uri", uri: "https://car-booking-tan.vercel.app/" },
      },
    ],
  });

  console.log("Rich Menu ID:", richMenu);
}

// 🔥 รันอัตโนมัติ
createRichMenu();
