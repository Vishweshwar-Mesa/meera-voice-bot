import { generateDraft } from "../lib/gemini.js";
import { sendMessage, sendChatAction } from "../lib/telegram.js";
import { checkNote, isAllowedChat } from "../lib/guardrails.js";
import { scoreNote } from "../lib/scoring.js";
import { extractSearchPhrase } from "../lib/keywords.js";
import { fetchTopNews, formatVerifyBlock } from "../lib/googleNews.js";
import { getVoiceInstructions } from "../lib/voice.js";
import { getAudienceProfile } from "../lib/audience.js";

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

  // Once ALLOWED_CHAT_ID is set, silently ignore everyone else — no reply,
  // so the bot doesn't confirm its existence or behavior to a random prober.
  if (!isAllowedChat(chatId)) {
    console.warn(`Ignored message from unauthorized chat ${chatId}`);
    res.status(200).end();
    return;
  }

  try {
    if (!text) {
      await sendMessage(chatId, "Send me a text note and I'll draft a post from it.");
    } else if (text === "/start" || text === "/help") {
      await sendMessage(chatId, WELCOME_TEXT);
    } else {
      const junkRejection = checkNote(text);
      if (junkRejection) {
        await sendMessage(chatId, junkRejection);
      } else {
        await sendChatAction(chatId, "typing");
        await handleNote(chatId, text);
      }
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

async function handleNote(chatId, note) {
  // Step 1: find a relevant news angle up front — scoring needs it too, to
  // judge timeliness, not just the draft.
  let newsItem = null;
  try {
    const searchPhrase = await extractSearchPhrase(note);
    newsItem = await fetchTopNews(searchPhrase);
  } catch (err) {
    console.error("News lookup failed, continuing without it:", err);
  }

  // Step 2: score — substance, timeliness, thematic fit, audience fit.
  const { score, reason, passed } = await scoreNote(note, {
    newsItem,
    voiceInstructions: getVoiceInstructions(),
    audienceProfile: getAudienceProfile(),
  });
  console.log(`Scored note from chat ${chatId}: ${score}/10 — ${reason}`);

  if (!passed) {
    await sendMessage(chatId, `Didn't draft this one (${score}/10). ${reason}`);
    return;
  }

  // Step 3: draft, optionally woven around the same news item.
  const { text: draft, usedNews } = await generateDraft(note, newsItem);

  const finalMessage =
    usedNews && newsItem ? `${draft}\n\n${formatVerifyBlock(newsItem)}` : draft;

  await sendMessage(chatId, finalMessage);
}
