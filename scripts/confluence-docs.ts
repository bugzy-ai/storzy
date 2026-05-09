import "dotenv/config";

import {
  fetchAllPagesForIndex,
  fetchPageById,
  getConfluenceEnv,
} from "./confluence/client";
import { INDEX_PATH, readIndexFile, writeIndexFile } from "./confluence/index-store";
import { getPreview, toMarkdown, writeMarkdownToTmp } from "./confluence/markdown";
import type { ConfluenceIndexFile, ConfluenceIndexPage } from "./confluence/types";

interface ParsedArgs {
  positionals: string[];
  options: Record<string, string | boolean>;
}

async function main(): Promise<void> {
  const [, , command, ...rawArgs] = process.argv;

  if (!command || command === "help" || command === "--help" || command === "-h") {
    printUsage();
    return;
  }

  const parsed = parseArgs(rawArgs);

  try {
    switch (command) {
      case "index":
        await runIndex(parsed);
        return;
      case "search":
        await runSearch(parsed);
        return;
      case "get":
        await runGet(parsed);
        return;
      default:
        throw new Error(`Unknown command: ${command}`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Error: ${message}`);
    process.exitCode = 1;
  }
}

async function runIndex(parsed: ParsedArgs): Promise<void> {
  const env = getConfluenceEnv();
  const cqlOption = parsed.options.cql;
  if (typeof cqlOption === "string" && cqlOption.trim().length > 0) {
    env.cql = cqlOption.trim();
  }

  const pages = await fetchAllPagesForIndex(env);
  const deduped = dedupePages(pages);
  deduped.sort((a, b) => a.title.localeCompare(b.title));

  const indexPayload: ConfluenceIndexFile = {
    lastSyncedAt: new Date().toISOString(),
    baseUrl: env.baseUrl,
    cql: env.cql,
    pageCount: deduped.length,
    pages: deduped,
  };

  await writeIndexFile(indexPayload);
  console.log(`Indexed ${deduped.length} pages.`);
  console.log(`Wrote ${INDEX_PATH}`);
}

async function runSearch(parsed: ParsedArgs): Promise<void> {
  const query = parsed.positionals.join(" ").trim();
  if (!query) {
    throw new Error("Search query is required. Example: search checkout flow");
  }

  const index = await readIndexFile();
  const matches = searchPages(index.pages, query);

  if (matches.length === 0) {
    console.log(`No pages matched "${query}" in ${INDEX_PATH}.`);
    return;
  }

  console.log(
    `Found ${matches.length} page(s) for "${query}" from index synced at ${index.lastSyncedAt}:`
  );

  for (const page of matches.slice(0, 20)) {
    console.log("");
    console.log(`- [${page.id}] ${page.title}`);
    console.log(`  URL: ${page.url}`);
    console.log(`  Updated: ${page.updatedAt ?? "unknown"}`);
    console.log(`  Version: ${page.version ?? "unknown"}`);
    if (page.excerpt) {
      console.log(`  Excerpt: ${truncate(page.excerpt, 220)}`);
    }
  }
}

async function runGet(parsed: ParsedArgs): Promise<void> {
  const target = parsed.positionals[0];
  if (!target) {
    throw new Error("Page ID or URL is required. Example: get 123456789");
  }

  const env = getConfluenceEnv();
  const pageId = extractPageId(target);
  if (!pageId) {
    throw new Error(`Could not infer page id from "${target}".`);
  }

  const page = await fetchPageById(pageId, env);
  const markdown = toMarkdown(page);
  const preview = getPreview(markdown);
  const filePath = await writeMarkdownToTmp(page, markdown);

  console.log(preview);
  console.log("");
  console.log(`Full markdown saved to ${filePath}`);
}

function parseArgs(args: string[]): ParsedArgs {
  const positionals: string[] = [];
  const options: Record<string, string | boolean> = {};

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (!arg.startsWith("--")) {
      positionals.push(arg);
      continue;
    }

    const [rawKey, inlineValue] = arg.slice(2).split("=");
    const key = rawKey.trim();
    if (!key) {
      continue;
    }

    if (inlineValue !== undefined) {
      options[key] = inlineValue;
      continue;
    }

    const next = args[i + 1];
    if (next && !next.startsWith("--")) {
      options[key] = next;
      i += 1;
    } else {
      options[key] = true;
    }
  }

  return { positionals, options };
}

function searchPages(pages: ConfluenceIndexPage[], query: string): ConfluenceIndexPage[] {
  const normalized = query.toLowerCase();
  const tokens = normalized.split(/\s+/).filter(Boolean);

  return [...pages]
    .map((page) => ({ page, score: scorePage(page, tokens, normalized) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.page);
}

function scorePage(
  page: ConfluenceIndexPage,
  tokens: string[],
  query: string
): number {
  const title = page.title.toLowerCase();
  const excerpt = (page.excerpt ?? "").toLowerCase();
  const full = `${title} ${excerpt}`;

  if (!full.includes(query) && tokens.every((token) => !full.includes(token))) {
    return 0;
  }

  let score = 0;
  if (title.includes(query)) {
    score += 50;
  }
  if (excerpt.includes(query)) {
    score += 20;
  }

  for (const token of tokens) {
    if (title.includes(token)) {
      score += 10;
    }
    if (excerpt.includes(token)) {
      score += 3;
    }
  }

  return score;
}

function extractPageId(input: string): string | null {
  if (/^\d+$/.test(input)) {
    return input;
  }

  const fromPages = input.match(/\/pages\/(\d+)/i);
  if (fromPages?.[1]) {
    return fromPages[1];
  }

  const fromParam = input.match(/[?&]pageId=(\d+)/i);
  if (fromParam?.[1]) {
    return fromParam[1];
  }

  return null;
}

function dedupePages(pages: ConfluenceIndexPage[]): ConfluenceIndexPage[] {
  const map = new Map<string, ConfluenceIndexPage>();
  for (const page of pages) {
    map.set(page.id, page);
  }
  return [...map.values()];
}

function truncate(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 1)}...`;
}

function printUsage(): void {
  console.log("Confluence docs CLI");
  console.log("");
  console.log("Usage:");
  console.log("  tsx scripts/confluence-docs.ts index [--cql \"...\"]");
  console.log("  tsx scripts/confluence-docs.ts search <query>");
  console.log("  tsx scripts/confluence-docs.ts get <pageId|url>");
  console.log("");
  console.log("Reads CONFLUENCE_BASE_URL, ATLASSIAN_EMAIL, ATLASSIAN_API_TOKEN from .env");
}

void main();
