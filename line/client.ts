import dotenv from "dotenv";
dotenv.config();
const { Client } = require("@line/bot-sdk");
console.log("Token:", process.env.LINE_CHANNEL_ACCESS_TOKEN);


export const lineClient = new Client({
    channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN!,
    channelSecret: process.env.LINE_CHANNEL_SECRET!,
    
});
