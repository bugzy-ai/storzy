import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

import type { ConfluenceIndexFile } from "./types";

export const INDEX_PATH = "docs/confluence/index.json";

export async function writeIndexFile(index: ConfluenceIndexFile): Promise<void> {
  await mkdir(dirname(INDEX_PATH), { recursive: true });
  await writeFile(INDEX_PATH, `${JSON.stringify(index, null, 2)}\n`, "utf8");
}

export async function readIndexFile(): Promise<ConfluenceIndexFile> {
  const content = await readFile(INDEX_PATH, "utf8");
  const parsed = JSON.parse(content) as ConfluenceIndexFile;

  if (!Array.isArray(parsed.pages)) {
    throw new Error(`Invalid index structure in ${INDEX_PATH}.`);
  }

  return parsed;
}
