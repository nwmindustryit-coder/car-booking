import { getLineClient  } from "../client";
import "dotenv/config";

async function setDefault() {
  const richMenuId = process.env.LINE_RICH_MENU_ID;
  const lineClient = getLineClient();
  if (!richMenuId) {
    console.error("❌ LINE_RICH_MENU_ID not found in .env.richmenu");
    return;
  }

  await lineClient.setDefaultRichMenu(richMenuId);
  console.log("🎉 Rich Menu has been set as default:", richMenuId);
}

setDefault();
