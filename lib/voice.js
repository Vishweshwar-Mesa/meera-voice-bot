import { readFileSync } from "fs";
import path from "path";

let cached;

// Cached across warm invocations of the same serverless function instance.
export function getVoiceInstructions() {
  if (cached !== undefined) return cached;

  try {
    const filePath = path.join(process.cwd(), "prompts", "voice-instructions.md");
    const raw = readFileSync(filePath, "utf-8");
    // Strip the leading HTML comment placeholder so an unfilled file
    // doesn't get sent to Gemini as if it were real instructions.
    cached = raw.replace(/<!--[\s\S]*?-->/g, "").trim();
  } catch {
    cached = "";
  }

  return cached;
}
