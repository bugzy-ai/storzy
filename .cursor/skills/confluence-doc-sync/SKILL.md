# Confluence Doc Sync Skill

Use this skill whenever you need project documentation that lives in Confluence during planning, implementation, or review.

## What this skill provides

- A local Confluence page index in `docs/confluence/index.json`.
- Fast local search over indexed pages.
- Page content retrieval as markdown with:
  - a terminal preview only, and
  - full content saved to `tmp/` for deeper reading.

## Prerequisites

Set the following variables in `.env`:

- `CONFLUENCE_BASE_URL`
- `ATLASSIAN_EMAIL`
- `ATLASSIAN_API_TOKEN`
- `CONFLUENCE_CQL` (optional override for scope)

## Commands

### 1) Refresh the index

Use when you need current Confluence metadata or before planning against Confluence docs.

```bash
pnpm confluence:index
```

Optional custom scope:

```bash
pnpm confluence:index -- --cql "type=page and space=ENG order by lastmodified desc"
```

### 2) Search for relevant docs

Use to discover pages relevant to a task without making extra API calls.

```bash
pnpm confluence:search -- "checkout rollback strategy"
```

### 3) Read a page in markdown

Use when you need actual page content for decisions or implementation details.

```bash
pnpm confluence:get -- 123456789
```

You can also pass a Confluence page URL:

```bash
pnpm confluence:get -- "https://your-domain.atlassian.net/wiki/spaces/ENG/pages/123456789/Page+Title"
```

The command prints only a preview and saves full markdown to a file in `tmp/`.

## Decision guide (when to run what)

- Need latest catalog of docs -> run `confluence:index`.
- Need to quickly find candidates -> run `confluence:search`.
- Need full context from one page -> run `confluence:get`.
- Planning anything risky/ambiguous -> run index, then search, then get top 1-3 pages.

## Common troubleshooting

- `Missing required env vars` -> add required keys to `.env`.
- `401 Unauthorized` -> verify `ATLASSIAN_EMAIL` and `ATLASSIAN_API_TOKEN`.
- `No pages matched` -> update `CONFLUENCE_CQL` scope and re-run `confluence:index`.
- Stale results -> re-run `confluence:index` and check `lastSyncedAt` in `docs/confluence/index.json`.
