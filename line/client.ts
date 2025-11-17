import { Client } from "@line/bot-sdk";

export function getLineClient() {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  const secret = process.env.LINE_CHANNEL_SECRET;

  if (!token) {
    throw new Error("Missing LINE_CHANNEL_ACCESS_TOKEN");
  }
  if (!secret) {
    throw new Error("Missing LINE_CHANNEL_SECRET");
  }

  return new Client({
    channelAccessToken: token,
    channelSecret: secret,
  });
}
