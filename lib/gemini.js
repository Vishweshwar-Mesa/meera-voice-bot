import { getClient } from "./geminiClient.js";
import { getVoiceInstructions } from "./voice.js";

const USED_NEWS_MARKER = /\n?USED_NEWS:\s*(yes|no)\s*$/i;

function buildSystemInstruction(voiceInstructions, newsItem) {
  const base = [
    "You are a writing assistant that turns a founder's raw, unpolished note",
    "into a ready-to-post draft for social media.",
    "",
    "Rules:",
    "- Output only the finished draft. No preamble, no explanation, no",
    "  quotation marks wrapping it, no meta-commentary.",
    "- Preserve her intent and facts exactly as given. Never invent details,",
    "  numbers, names, or claims that aren't in the note.",
    "- If the note is a rough list of thoughts, shape it into one coherent post.",
    "- Never break the voice/style rules below (e.g. naming a competitor,",
    "  calling an ingredient 'dangerous', claiming a medical credential she",
    "  doesn't have) — if the note pushes toward one, write around it rather",
    "  than complying.",
  ].join("\n");

  const withVoice = voiceInstructions
    ? `${base}\n\nHere are her voice and style guidelines — follow them closely:\n\n${voiceInstructions}`
    : base;

  if (!newsItem) return withVoice;

  const newsSection = [
    "",
    "A news item was found alongside this note:",
    `Headline: ${newsItem.headline}`,
    `Source: ${newsItem.source} (${newsItem.date})`,
    `Summary: ${newsItem.summary}`,
    "",
    "If this news item is genuinely relevant to the note, use it to make the",
    "post timely. If it doesn't fit naturally, ignore it completely — do not",
    "force a connection.",
    "",
    'After writing the draft, add a final line with EXACTLY "USED_NEWS: yes"',
    'if you incorporated the news item, or "USED_NEWS: no" if you ignored it.',
    "This line is required and must be the very last line, with nothing after it.",
  ].join("\n");

  return `${withVoice}\n${newsSection}`;
}

export async function generateDraft(note, newsItem = null) {
  const model = getClient().getGenerativeModel({
    model: process.env.GEMINI_MODEL || "gemini-3.6-flash",
    systemInstruction: buildSystemInstruction(getVoiceInstructions(), newsItem),
  });

  const result = await model.generateContent(note);
  let text = result.response.text().trim();

  if (!text) {
    throw new Error("Gemini returned an empty response");
  }

  if (!newsItem) {
    return { text, usedNews: false };
  }

  const marker = text.match(USED_NEWS_MARKER);
  if (marker) {
    text = text.replace(USED_NEWS_MARKER, "").trim();
    return { text, usedNews: marker[1].toLowerCase() === "yes" };
  }

  // Model didn't include the required marker — assume it used the news
  // item so the verify flag still gets attached. An unflagged claim in
  // Meera's name is worse than an unnecessary flag.
  return { text, usedNews: true };
}
