import { getFlashModel } from "./geminiClient.js";

const SYSTEM_INSTRUCTION = [
  "Read the founder's note and pull 3-5 keywords that capture its real-world",
  "topic (the industry, ingredient, event, or trend it touches — not generic",
  "words like 'business' or 'thoughts').",
  "",
  'Respond with ONLY a JSON object: {"phrase": "<a short search phrase, 3-6',
  'words>"}. If the note has no real-world topic to search for (it\'s purely',
  'personal/internal), respond with {"phrase": null}. No other text.',
].join("\n");

export async function extractSearchPhrase(note) {
  const model = getFlashModel({
    systemInstruction: SYSTEM_INSTRUCTION,
    generationConfig: { responseMimeType: "application/json" },
  });

  const result = await model.generateContent(note);
  const raw = result.response.text().trim();

  try {
    const parsed = JSON.parse(raw);
    const phrase = typeof parsed.phrase === "string" ? parsed.phrase.trim() : null;
    return phrase || null;
  } catch {
    return null;
  }
}
