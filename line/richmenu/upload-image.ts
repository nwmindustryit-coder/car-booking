import fs from "fs";
import { getLineClient  } from "../client";

export async function uploadImage() {
  const lineClient = getLineClient();
  const richMenuId = process.env.LINE_RICH_MENU_ID!; 
  const buffer = fs.readFileSync("./public/richmenu.png");

  await lineClient.setRichMenuImage(richMenuId, buffer, "image/png");
  console.log("✔ Uploaded image to Rich Menu:", richMenuId);
}

uploadImage();
