// server.js
require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");

const app = express();
app.use(bodyParser.json());

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_TOKEN}`;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;

// === 1. Telegram Webhook ===
app.post("/telegram", async (req, res) => {
  const message = req.body.message;
  if (message && message.text) {
    console.log("📩 From Telegram:", message.text);

    // forward to Messenger
    await sendToMessenger(message.text);
  }
  res.sendStatus(200);
});

// === 2. Messenger Webhook Verification ===
app.get("/webhook", (req, res) => {
  if (req.query["hub.verify_token"] === VERIFY_TOKEN) {
    res.send(req.query["hub.challenge"]);
  } else {
    res.send("Invalid verify token");
  }
});

// === 3. Messenger Webhook (messages from users) ===
app.post("/webhook", async (req, res) => {
  let body = req.body;
  if (body.object === "page") {
    body.entry.forEach(function(entry) {
      let event = entry.messaging[0];
      if (event.message && event.message.text) {
        console.log("💬 From Messenger:", event.message.text);

        // forward to Telegram
        await sendToTelegram(event.message.text);
      }
    });
    res.sendStatus(200);
  } else {
    res.sendStatus(404);
  }
});

// === Helpers ===
async function sendToMessenger(text) {
  try {
    await axios.post(
      `https://graph.facebook.com/v12.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`,
      {
        recipient: { id: process.env.RECIPIENT_ID },
        message: { text },
      }
    );
    console.log("➡️ Sent to Messenger:", text);
  } catch (err) {
    console.error("Messenger send error:", err.response?.data || err.message);
  }
}

async function sendToTelegram(text) {
  try {
    await axios.post(`${TELEGRAM_API}/sendMessage`, {
      chat_id: process.env.TELEGRAM_CHAT_ID,
      text,
    });
    console.log("➡️ Sent to Telegram:", text);
  } catch (err) {
    console.error("Telegram send error:", err.response?.data || err.message);
  }
}

// === Start server ===
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🤖 Bot running on port ${PORT}`));
