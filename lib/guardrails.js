const MIN_NOTE_LENGTH = 8;
const MAX_NOTE_LENGTH = 4000;

function isRepeatedCharacterSpam(text) {
  const stripped = text.replace(/\s/g, "");
  // The "u" flag makes "." match a full code point instead of a raw UTF-16
  // unit, so a repeated multi-byte character (e.g. an emoji) is compared
  // correctly instead of by its surrogate-pair halves.
  return stripped.length > 0 && /^(.)\1*$/u.test(stripped);
}

function isOnlyEmojiOrPunctuation(text) {
  // No letters or digits in ANY script — \p{L}/\p{N} cover Devanagari,
  // Arabic, CJK, Cyrillic, etc., not just ASCII a-zA-Z0-9, so a real note
  // in Hindi/Tamil/etc. isn't mistaken for emoji/punctuation spam.
  return !/[\p{L}\p{N}]/u.test(text);
}

// Cheap, pre-Gemini checks for input that's obviously not a real note.
// Returns a rejection reason (to send back to the chat) or null if it passes.
export function checkNote(text) {
  const trimmed = text.trim();

  if (trimmed.length < MIN_NOTE_LENGTH) {
    return "That's too short for me to draft anything from — send a bit more detail.";
  }

  if (trimmed.length > MAX_NOTE_LENGTH) {
    return `That note is quite long (${trimmed.length} characters). Trim it down to the core point and resend — under ${MAX_NOTE_LENGTH} characters works best.`;
  }

  if (isRepeatedCharacterSpam(trimmed) || isOnlyEmojiOrPunctuation(trimmed)) {
    return "That doesn't look like a note yet — send me the actual thought or update you want turned into a post.";
  }

  return null;
}

// Restricts the bot to a single Telegram chat once ALLOWED_CHAT_ID is set.
// Unset = open (useful before you know your own chat id, see README).
export function isAllowedChat(chatId) {
  const allowed = process.env.ALLOWED_CHAT_ID;
  if (!allowed) return true;
  return String(chatId) === String(allowed);
}
