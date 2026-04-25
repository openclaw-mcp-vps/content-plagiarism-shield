import axios from "axios";
import { createHash } from "node:crypto";
import * as cheerio from "cheerio";

export type PlagiarismMatch = {
  infringingUrl: string;
  confidence: number;
  matchedExcerpt: string;
};

type PageContent = {
  title: string;
  text: string;
  excerpt: string;
};

const AXIOS_TIMEOUT_MS = 15000;
const MIN_WORD_LENGTH = 4;
const SHINGLE_SIZE = 5;
const MATCH_THRESHOLD = 0.18;

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeForSimilarity(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenizeForSimilarity(value: string): string[] {
  return normalizeForSimilarity(value)
    .split(" ")
    .filter((word) => word.length >= MIN_WORD_LENGTH);
}

function makeShingles(words: string[], size = SHINGLE_SIZE): Set<string> {
  const shingles = new Set<string>();

  if (words.length < size) {
    if (words.length > 0) {
      shingles.add(words.join(" "));
    }

    return shingles;
  }

  for (let idx = 0; idx <= words.length - size; idx += 1) {
    shingles.add(words.slice(idx, idx + size).join(" "));
  }

  return shingles;
}

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) {
    return 0;
  }

  let intersection = 0;
  for (const item of a) {
    if (b.has(item)) {
      intersection += 1;
    }
  }

  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

function canonicalizeUrl(input: string): string {
  const trimmed = input.trim();

  try {
    const parsed = new URL(trimmed);
    parsed.hash = "";

    if (parsed.pathname !== "/" && parsed.pathname.endsWith("/")) {
      parsed.pathname = parsed.pathname.slice(0, -1);
    }

    return parsed.toString();
  } catch {
    return trimmed;
  }
}

function safelyUnwrapDuckDuckGoResult(resultUrl: string): string {
  if (!resultUrl.startsWith("http")) {
    return resultUrl;
  }

  try {
    const parsed = new URL(resultUrl);
    const wrapped = parsed.searchParams.get("uddg");

    if (wrapped) {
      return decodeURIComponent(wrapped);
    }

    return resultUrl;
  } catch {
    return resultUrl;
  }
}

async function fetchPageContent(url: string): Promise<PageContent | null> {
  try {
    const response = await axios.get<string>(url, {
      timeout: AXIOS_TIMEOUT_MS,
      maxContentLength: 2_500_000,
      validateStatus: (status) => status >= 200 && status < 400,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; ContentPlagiarismShieldBot/1.0; +https://content-plagiarism-shield.local)",
        Accept: "text/html,application/xhtml+xml"
      }
    });

    const $ = cheerio.load(response.data);
    $("script, style, noscript, svg, form, nav, footer, header, iframe").remove();

    const title = normalizeWhitespace($("title").first().text()) || "Untitled page";

    const articleText = normalizeWhitespace($("article").text());
    const mainText = normalizeWhitespace($("main").text());
    const bodyText = normalizeWhitespace($("body").text());

    const selectedText = articleText || mainText || bodyText;

    if (!selectedText) {
      return null;
    }

    return {
      title,
      text: selectedText,
      excerpt: selectedText.slice(0, 280)
    };
  } catch {
    return null;
  }
}

async function searchDuckDuckGo(query: string): Promise<string[]> {
  const url = `https://duckduckgo.com/html/?q=${encodeURIComponent(query)}`;

  try {
    const response = await axios.get<string>(url, {
      timeout: AXIOS_TIMEOUT_MS,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; ContentPlagiarismShieldBot/1.0; +https://content-plagiarism-shield.local)",
        Accept: "text/html"
      }
    });

    const $ = cheerio.load(response.data);
    const urls = new Set<string>();

    $("a.result__a, .result__url a, a[data-testid='result-title-a']").each((_, el) => {
      const href = $(el).attr("href");

      if (href) {
        urls.add(canonicalizeUrl(safelyUnwrapDuckDuckGoResult(href)));
      }
    });

    return [...urls].filter((candidate) => candidate.startsWith("http"));
  } catch {
    return [];
  }
}

function buildQueries(title: string, text: string): string[] {
  const sentences = text
    .split(/[.!?]/)
    .map((sentence) => normalizeWhitespace(sentence))
    .filter((sentence) => sentence.length >= 90);

  const snippets = sentences.slice(0, 2).map((sentence) => `"${sentence.slice(0, 140)}"`);
  const titleQuery = title ? `"${title}"` : "";

  return [titleQuery, ...snippets].filter(Boolean);
}

function bestMatchedExcerpt(sourceText: string, candidateText: string): string {
  const sourceWords = tokenizeForSimilarity(sourceText).slice(0, 18);

  if (sourceWords.length === 0) {
    return candidateText.slice(0, 240);
  }

  const needle = sourceWords.slice(0, 8).join(" ");
  const normalizedCandidate = normalizeForSimilarity(candidateText);
  const idx = normalizedCandidate.indexOf(needle);

  if (idx === -1) {
    return candidateText.slice(0, 240);
  }

  return candidateText.slice(Math.max(0, idx - 40), idx + 220);
}

function looksLikeSameDomain(sourceUrl: string, candidateUrl: string): boolean {
  try {
    const a = new URL(sourceUrl);
    const b = new URL(candidateUrl);
    return a.hostname === b.hostname;
  } catch {
    return false;
  }
}

export async function inspectSourceContent(sourceUrl: string): Promise<{
  title: string;
  excerpt: string;
  contentFingerprint: string | null;
}> {
  const content = await fetchPageContent(sourceUrl);

  if (!content) {
    return {
      title: sourceUrl,
      excerpt: "Content could not be fetched automatically. The URL is still stored for manual scan attempts.",
      contentFingerprint: null
    };
  }

  return {
    title: content.title,
    excerpt: content.excerpt,
    contentFingerprint: createHash("sha256").update(normalizeForSimilarity(content.text)).digest("hex")
  };
}

export async function scanForPlagiarism(sourceUrl: string, fallbackTitle?: string): Promise<PlagiarismMatch[]> {
  const source = await fetchPageContent(sourceUrl);

  if (!source) {
    return [];
  }

  const sourceWords = tokenizeForSimilarity(source.text);
  const sourceShingles = makeShingles(sourceWords);
  const queries = buildQueries(source.title || fallbackTitle || "", source.text);
  const candidateUrls = new Set<string>();

  for (const query of queries) {
    const searchHits = await searchDuckDuckGo(query);

    for (const hit of searchHits) {
      if (!looksLikeSameDomain(sourceUrl, hit) && canonicalizeUrl(hit) !== canonicalizeUrl(sourceUrl)) {
        candidateUrls.add(hit);
      }

      if (candidateUrls.size >= 20) {
        break;
      }
    }

    if (candidateUrls.size >= 20) {
      break;
    }
  }

  const matches: PlagiarismMatch[] = [];

  for (const candidateUrl of candidateUrls) {
    const candidate = await fetchPageContent(candidateUrl);

    if (!candidate) {
      continue;
    }

    const candidateWords = tokenizeForSimilarity(candidate.text);
    const candidateShingles = makeShingles(candidateWords);
    const score = jaccardSimilarity(sourceShingles, candidateShingles);

    if (score >= MATCH_THRESHOLD) {
      matches.push({
        infringingUrl: candidateUrl,
        confidence: Number(score.toFixed(3)),
        matchedExcerpt: bestMatchedExcerpt(source.text, candidate.text)
      });
    }
  }

  return matches.sort((a, b) => b.confidence - a.confidence).slice(0, 10);
}
