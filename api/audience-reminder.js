import { sendMessage } from "../lib/telegram.js";

const REMINDER_TEXT =
  "Time to revisit your audience profile (prompts/audience-profile.md) — " +
  "who you're trying to reach may have shifted over the last 6 months. " +
  "Reply here with updates, or edit the file directly and redeploy.";

// Triggered by the Vercel Cron job in vercel.json, roughly every 6 months.
export default async function handler(req, res) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && req.headers.authorization !== `Bearer ${cronSecret}`) {
    res.status(401).send("Unauthorized");
    return;
  }

  const chatId = process.env.ALLOWED_CHAT_ID;
  if (!chatId) {
    console.warn("ALLOWED_CHAT_ID is not set — skipping audience-profile reminder");
    res.status(200).send("No chat configured, skipped.");
    return;
  }

  try {
    await sendMessage(chatId, REMINDER_TEXT);
    res.status(200).send("Reminder sent.");
  } catch (err) {
    console.error("Failed to send audience-profile reminder:", err);
    res.status(500).send("Failed to send reminder.");
  }
}
