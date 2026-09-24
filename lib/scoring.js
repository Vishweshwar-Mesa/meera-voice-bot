import { getFlashModel } from "./geminiClient.js";

const SCORE_THRESHOLD = 6;

const BASE_INSTRUCTION = [
  "You triage raw notes from a founder's Telegram channel before they reach",
  "a drafting step. Score how publishable the note is as the seed of a real",
  "LinkedIn post, from 0 to 10, weighing four things:",
  "",
  "1. SUBSTANCE (the dominant factor) — does it have a clear point, a",
  "   concrete detail, decision, number, or lesson? Logistics/reminders",
  "   ('order more bottles'), abandoned half-thoughts, pure small talk, or",
  "   notes with no discernible angle should score low (0-3) regardless of",
  "   the other factors below — a well-timed non-post is still a non-post.",
  "2. TIMELINESS — if a current news item is supplied below, does the note",
  "   connect to something genuinely happening in the world right now? This",
  "   is a bonus when substance is already present, not a substitute for it.",
  "   No news item supplied, or the note just isn't the kind of thing that",
  "   needs one, is neutral — don't penalize for it.",
  "3. THEMATIC FIT — does the note's topic sit within the themes she already",
  "   writes about (see her existing voice/content below), rather than being",
  "   a random tangent unrelated to her actual work?",
  "4. AUDIENCE FIT — does it serve the audience she's trying to reach (see",
  "   her audience profile below), rather than being generic content?",
  "",
  'Respond with ONLY a JSON object: {"score": <integer 0-10>, "reason":',
  '"<one sentence citing the main factor(s) behind the score>"}. No other',
  "text.",
].join("\n");

function buildInstruction({ newsItem, voiceInstructions, audienceProfile }) {
  const sections = [BASE_INSTRUCTION];

  if (voiceInstructions) {
    sections.push(
      `Her existing voice and content themes (for THEMATIC FIT):\n${voiceInstructions}`
    );
  }

  if (audienceProfile) {
    sections.push(`Her audience profile (for AUDIENCE FIT):\n${audienceProfile}`);
  }

  if (newsItem) {
    sections.push(
      [
        "A current news item was found (for TIMELINESS):",
        `Headline: ${newsItem.headline}`,
        `Source: ${newsItem.source} (${newsItem.date})`,
        `Summary: ${newsItem.summary}`,
      ].join("\n")
    );
  }

  return sections.join("\n\n");
}

export async function scoreNote(note, context = {}) {
  const model = getFlashModel({
    systemInstruction: buildInstruction(context),
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
