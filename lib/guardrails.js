const MIN_NOTE_LENGTH = 8;
const MAX_NOTE_LENGTH = 4000;

function isRepeatedCharacterSpam(text) {
  const stripped = text.replace(/\s/g, "");
  return stripped.length > 0 && /^(.)\1*$/.test(stripped);
}

function isOnlyEmojiOrPunctuation(text) {
  // No letters or digits anywhere in the note.
  return !/[a-zA-Z0-9]/.test(text);
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
