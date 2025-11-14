import fs from "fs";
import { lineClient } from "../client";

export async function uploadImage() {
  const richMenuId = process.env.LINE_RICH_MENU_ID!; 
  const buffer = fs.readFileSync("./public/richmenu.png");

  await lineClient.setRichMenuImage(richMenuId, buffer, "image/png");
  console.log("✔ Uploaded image to Rich Menu:", richMenuId);
}

uploadImage();
