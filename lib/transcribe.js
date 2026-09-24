import { getFlashModel } from "./geminiClient.js";

const SYSTEM_INSTRUCTION = [
  "Transcribe the given voice note exactly, word-for-word, in the language",
  "it was spoken. Respond with only the transcript text — no timestamps,",
  "no speaker labels, no summary, no commentary.",
].join("\n");

export async function transcribeAudio(base64Audio, mimeType = "audio/ogg") {
  const model = getFlashModel({ systemInstruction: SYSTEM_INSTRUCTION });

  const result = await model.generateContent([
    { inlineData: { mimeType, data: base64Audio } },
  ]);

  const text = result.response.text().trim();
  if (!text) {
    throw new Error("Transcription returned empty text");
  }

  return text;
}
