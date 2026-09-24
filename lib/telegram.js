const TELEGRAM_MAX_MESSAGE_LENGTH = 4000; // Telegram's real limit is 4096

function apiUrl(method) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    throw new Error("TELEGRAM_BOT_TOKEN is not set");
  }
  return `https://api.telegram.org/bot${token}/${method}`;
}

function splitMessage(text, maxLen) {
  if (text.length <= maxLen) return [text];

  const chunks = [];
  let remaining = text;

  while (remaining.length > maxLen) {
    let cut = remaining.lastIndexOf("\n", maxLen);
    if (cut <= 0) cut = maxLen;
    chunks.push(remaining.slice(0, cut));
    remaining = remaining.slice(cut);
  }

  if (remaining) chunks.push(remaining);

  return chunks;
}

export async function sendMessage(chatId, text) {
  const chunks = splitMessage(text, TELEGRAM_MAX_MESSAGE_LENGTH);

  for (const chunk of chunks) {
    const res = await fetch(apiUrl("sendMessage"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: chunk }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Telegram sendMessage failed (${res.status}): ${body}`);
    }
  }
}

export async function sendChatAction(chatId, action = "typing") {
  try {
    await fetch(apiUrl("sendChatAction"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, action }),
    });
  } catch {
    // Best-effort only — a failed "typing" indicator shouldn't break anything.
  }
}
