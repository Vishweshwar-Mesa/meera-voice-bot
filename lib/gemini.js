import { GoogleGenerativeAI } from "@google/generative-ai";
import { getVoiceInstructions } from "./voice.js";

let client;

function getClient() {
  if (!client) {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not set");
    }
    client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }
  return client;
}

function buildSystemInstruction(voiceInstructions) {
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
    "- If the note is ambiguous or missing something essential, make the most",
    "  reasonable choice yourself rather than asking a question back.",
  ].join("\n");

  if (!voiceInstructions) return base;

  return `${base}\n\nHere are her voice and style guidelines — follow them closely:\n\n${voiceInstructions}`;
}

export async function generateDraft(note) {
  const model = getClient().getGenerativeModel({
    model: process.env.GEMINI_MODEL || "gemini-3.6-flash",
    systemInstruction: buildSystemInstruction(getVoiceInstructions()),
  });

  const result = await model.generateContent(note);
  const text = result.response.text().trim();

  if (!text) {
    throw new Error("Gemini returned an empty response");
  }

  return text;
}
