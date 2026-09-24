import { generateDraft } from "../lib/gemini.js";
import { sendMessage, sendChatAction } from "../lib/telegram.js";

const WELCOME_TEXT =
  "Hi! Send me a note and I'll turn it into a ready-to-post draft in your voice.";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(200).send("Meera's voice bot is running.");
    return;
  }

  // If TELEGRAM_WEBHOOK_SECRET is set, require Telegram's secret token header
  // to match, so random requests to this URL can't trigger Gemini calls.
  const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (expectedSecret) {
    const gotSecret = req.headers["x-telegram-bot-api-secret-token"];
    if (gotSecret !== expectedSecret) {
      res.status(401).send("Unauthorized");
      return;
    }
  }

  const update = req.body;
  const message = update?.message;
  const chatId = message?.chat?.id;
  const text = message?.text;

  // Always ack Telegram with 200 so it doesn't retry the update, even if
  // there's nothing for us to do with it (e.g. a non-text message).
  if (!chatId) {
    res.status(200).end();
    return;
  }

  try {
    if (!text) {
      await sendMessage(chatId, "Send me a text note and I'll draft a post from it.");
    } else if (text === "/start" || text === "/help") {
      await sendMessage(chatId, WELCOME_TEXT);
    } else {
      await sendChatAction(chatId, "typing");
      const draft = await generateDraft(text);
      await sendMessage(chatId, draft);
    }
  } catch (err) {
    console.error("Failed to handle Telegram update:", err);
    try {
      await sendMessage(chatId, "Sorry, something went wrong generating that draft. Please try again.");
    } catch (sendErr) {
      console.error("Failed to send error message to Telegram:", sendErr);
    }
  }

  res.status(200).end();
}
