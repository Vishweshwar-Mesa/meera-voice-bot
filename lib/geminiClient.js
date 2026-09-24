import { GoogleGenerativeAI } from "@google/generative-ai";

let client;

export function getClient() {
  if (!client) {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not set");
    }
    client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }
  return client;
}

// The fast/cheap tier — used for triage (scoring, keyword extraction), as
// opposed to GEMINI_MODEL which is the higher-quality drafting model.
export function getFlashModel(config = {}) {
  return getClient().getGenerativeModel({
    model: process.env.GEMINI_FLASH_MODEL || "gemini-3.6-flash",
    ...config,
  });
}
