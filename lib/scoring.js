import { getFlashModel } from "./geminiClient.js";

const SCORE_THRESHOLD = 6;

const SYSTEM_INSTRUCTION = [
  "You triage raw notes from a founder's Telegram channel before they reach",
  "a drafting step. Score how publishable the note is as the seed of a real",
  "LinkedIn post, from 0 to 10.",
  "",
  "Score low (0-3) for: logistics/reminders ('order more bottles', 'call the",
  "supplier'), abandoned half-thoughts with no point, pure small talk, or",
  "notes with no discernible angle a reader would care about.",
  "",
  "Score high (7-10) for: a note with a clear point, a concrete detail,",
  "decision, number, or lesson — something a founder's audience would",
  "actually get value from reading about.",
  "",
  "Score in between (4-6) when it's borderline — there's a kernel of",
  "something but it's thin or unclear.",
  "",
  'Respond with ONLY a JSON object: {"score": <integer 0-10>, "reason":',
  '"<one sentence explaining the score>"}. No other text.',
].join("\n");

export async function scoreNote(note) {
  const model = getFlashModel({
    systemInstruction: SYSTEM_INSTRUCTION,
    generationConfig: { responseMimeType: "application/json" },
  });

  const result = await model.generateContent(note);
  const raw = result.response.text().trim();

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`Scoring response wasn't valid JSON: ${raw}`);
  }

  const score = Number(parsed.score);
  if (!Number.isFinite(score) || score < 0 || score > 10) {
    throw new Error(`Scoring response had an invalid score: ${raw}`);
  }

  return {
    score,
    reason: String(parsed.reason || "").trim(),
    passed: score >= SCORE_THRESHOLD,
  };
}

export { SCORE_THRESHOLD };
