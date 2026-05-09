import { Buffer } from "node:buffer";
import { URL } from "node:url";

import type {
  ConfluenceContentPage,
  ConfluenceIndexPage,
} from "./types";

export interface ConfluenceEnv {
  baseUrl: string;
  email: string;
  apiToken: string;
  cql: string;
}

interface SearchResponse {
  results?: Array<{
    excerpt?: string;
    content?: {
      id?: string;
      title?: string;
      status?: string;
      _links?: {
        webui?: string;
      };
      version?: {
        number?: number;
        when?: string;
      };
      space?: {
        id?: number;
        key?: string;
      };
    };
    lastModified?: string;
  }>;
  start?: number;
  limit?: number;
  size?: number;
  _links?: {
    next?: string;
  };
}

interface ContentResponse {
  id?: string;
  title?: string;
  status?: string;
  space?: {
    id?: number;
    key?: string;
  };
  version?: {
    number?: number;
    when?: string;
  };
  body?: {
    storage?: {
      value?: string;
    };
  };
  _links?: {
    webui?: string;
  };
}

const DEFAULT_CQL = "type=page order by lastmodified desc";

export function getConfluenceEnv(): ConfluenceEnv {
  const baseUrl = process.env.CONFLUENCE_BASE_URL?.trim() ?? "";
  const email = process.env.ATLASSIAN_EMAIL?.trim() ?? "";
  const apiToken = process.env.ATLASSIAN_API_TOKEN?.trim() ?? "";
  const cql = process.env.CONFLUENCE_CQL?.trim() || DEFAULT_CQL;

  const missing = [
    !baseUrl ? "CONFLUENCE_BASE_URL" : "",
    !email ? "ATLASSIAN_EMAIL" : "",
    !apiToken ? "ATLASSIAN_API_TOKEN" : "",
  ].filter(Boolean);

  if (missing.length > 0) {
    throw new Error(
      `Missing required env vars: ${missing.join(", ")}.`
    );
  }

  return {
    baseUrl: normalizeBaseUrl(baseUrl),
    email,
    apiToken,
    cql,
  };
}

export async function fetchAllPagesForIndex(
  env: ConfluenceEnv
): Promise<ConfluenceIndexPage[]> {
  const pages: ConfluenceIndexPage[] = [];
  let start = 0;
  const limit = 100;

  while (true) {
    const searchUrl = new URL(`${env.baseUrl}/wiki/rest/api/search`);
    searchUrl.searchParams.set("cql", env.cql);
    searchUrl.searchParams.set("start", String(start));
    searchUrl.searchParams.set("limit", String(limit));
    searchUrl.searchParams.set("expand", "content.space,content.version");

    const response = await confluenceRequest<SearchResponse>(searchUrl, env);
    const results = response.results ?? [];

    for (const result of results) {
      const content = result.content;
      if (!content?.id || !content.title) {
        continue;
      }

      const pageUrl = content._links?.webui
        ? new URL(content._links.webui, env.baseUrl).toString()
        : `${env.baseUrl}/wiki/pages/${content.id}`;

      pages.push({
        id: content.id,
        title: content.title,
        url: pageUrl,
        status: content.status,
        spaceId:
          typeof content.space?.id === "number"
            ? String(content.space.id)
            : undefined,
        spaceKey: content.space?.key,
        version: content.version?.number,
        updatedAt: content.version?.when ?? result.lastModified,
        excerpt: htmlToText(result.excerpt ?? ""),
      });
    }

    const nextLink = response._links?.next;
    const size = response.size ?? results.length;
    if (!nextLink || size === 0) {
      break;
    }

    start += response.limit ?? limit;
  }

  return pages;
}

export async function fetchPageById(
  pageId: string,
  env: ConfluenceEnv
): Promise<ConfluenceContentPage> {
  const pageUrl = new URL(`${env.baseUrl}/wiki/rest/api/content/${pageId}`);
  pageUrl.searchParams.set("expand", "body.storage,version,space");

  const response = await confluenceRequest<ContentResponse>(pageUrl, env);

  if (!response.id || !response.title) {
    throw new Error(`Page ${pageId} not found or inaccessible.`);
  }

  return {
    id: response.id,
    title: response.title,
    url: response._links?.webui
      ? new URL(response._links.webui, env.baseUrl).toString()
      : `${env.baseUrl}/wiki/pages/${response.id}`,
    spaceId:
      typeof response.space?.id === "number"
        ? String(response.space.id)
        : undefined,
    spaceKey: response.space?.key,
    version: response.version?.number,
    updatedAt: response.version?.when,
    storageHtml: response.body?.storage?.value ?? "",
  };
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, "");
}

function createAuthHeader(email: string, token: string): string {
  const encoded = Buffer.from(`${email}:${token}`).toString("base64");
  return `Basic ${encoded}`;
}

async function confluenceRequest<T>(url: URL, env: ConfluenceEnv): Promise<T> {
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: createAuthHeader(env.email, env.apiToken),
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `Confluence request failed (${response.status} ${response.statusText}) for ${url.toString()}: ${text.slice(
        0,
        500
      )}`
    );
  }

  return (await response.json()) as T;
}

function htmlToText(value: string): string {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
}
