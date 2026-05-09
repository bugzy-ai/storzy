import { mkdir, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";

import TurndownService from "turndown";

import type { ConfluenceContentPage } from "./types";

const PREVIEW_CHAR_LIMIT = 1400;

const turndown = new TurndownService({
  headingStyle: "atx",
  codeBlockStyle: "fenced",
  bulletListMarker: "-",
});

export function toMarkdown(page: ConfluenceContentPage): string {
  const body = turndown.turndown(page.storageHtml || "");
  const header = [
    `# ${page.title}`,
    "",
    `- Page ID: ${page.id}`,
    `- URL: ${page.url}`,
    page.spaceKey ? `- Space: ${page.spaceKey}` : "",
    page.updatedAt ? `- Updated: ${page.updatedAt}` : "",
    page.version ? `- Version: ${page.version}` : "",
    "",
  ]
    .filter(Boolean)
    .join("\n");

  return `${header}\n${body}\n`;
}

export function getPreview(markdown: string, chars = PREVIEW_CHAR_LIMIT): string {
  if (markdown.length <= chars) {
    return markdown;
  }

  return `${markdown.slice(0, chars).trimEnd()}\n\n... [truncated preview]`;
}

export async function writeMarkdownToTmp(
  page: ConfluenceContentPage,
  markdown: string
): Promise<string> {
  const tmpDir = "tmp";
  await mkdir(tmpDir, { recursive: true });

  const safeSlug = slugify(page.title);
  const fileName = `confluence-page-${page.id}-${safeSlug}.md`;
  const outputPath = join(tmpDir, fileName);
  await writeFile(outputPath, markdown, "utf8");

  return outputPath;
}

function slugify(value: string): string {
  const base = basename(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return base || "untitled";
}
