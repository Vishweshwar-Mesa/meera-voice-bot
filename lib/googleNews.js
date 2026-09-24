const ENTITY_MAP = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  "#39": "'",
  nbsp: " ",
};

function decodeEntities(str) {
  // Google's feed double-escapes the description (HTML entities, themselves
  // escaped for XML), so decode repeatedly until a pass changes nothing.
  let out = str;
  for (let i = 0; i < 4; i++) {
    const next = out.replace(/&(#39|amp|lt|gt|quot|nbsp);/g, (_, code) => ENTITY_MAP[code] ?? "");
    if (next === out) break;
    out = next;
  }
  return out;
}

function stripTags(html) {
  return decodeEntities(html).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function extractTag(xml, tag) {
  const match = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  if (!match) return null;
  return match[1].replace(/^<!\[CDATA\[/, "").replace(/\]\]>$/, "").trim();
}

// Google News RSS: free, no key or account needed. Returns the top result
// for a search phrase, or null if nothing was found / the fetch failed.
export async function fetchTopNews(searchPhrase) {
  if (!searchPhrase) return null;

  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(searchPhrase)}&hl=en-US&gl=US&ceid=US:en`;

  let xml;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    xml = await res.text();
  } catch (err) {
    console.error("Google News fetch failed:", err);
    return null;
  }

  const itemMatch = xml.match(/<item>([\s\S]*?)<\/item>/);
  if (!itemMatch) return null;
  const item = itemMatch[1];

  const rawTitle = extractTag(item, "title");
  const link = extractTag(item, "link");
  const pubDate = extractTag(item, "pubDate");
  const description = extractTag(item, "description");

  const sourceMatch = item.match(/<source[^>]*>([\s\S]*?)<\/source>/i);
  const source = sourceMatch ? decodeEntities(sourceMatch[1].trim()) : null;

  if (!rawTitle || !link) return null;

  const headline = decodeEntities(rawTitle);
  const summary = description ? stripTags(description) : headline;
  const date = pubDate ? new Date(pubDate).toISOString().slice(0, 10) : "unknown date";

  return { headline, source: source || "unknown source", date, url: link, summary };
}

const DIVIDER = "─".repeat(35);

// This flag is not optional (see B1·2 in the case brief) — a fact
// published in Meera's name that she hasn't personally checked is the
// exact failure this pipeline exists to prevent.
export function formatVerifyBlock(newsItem) {
  return [
    DIVIDER,
    `NEWS SOURCE: ${newsItem.headline}`,
    `FROM: ${newsItem.source} · ${newsItem.date}`,
    `LINK: ${newsItem.url}`,
    "⚠ Check this before publishing — you are the author of this claim",
    DIVIDER,
  ].join("\n");
}
