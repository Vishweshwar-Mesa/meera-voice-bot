import { readFileSync } from "fs";
import path from "path";

let cached;

export function getAudienceProfile() {
  if (cached !== undefined) return cached;

  try {
    const filePath = path.join(process.cwd(), "prompts", "audience-profile.md");
    const raw = readFileSync(filePath, "utf-8");
    cached = raw.replace(/<!--[\s\S]*?-->/g, "").trim();
  } catch {
    cached = "";
  }

  return cached;
}
