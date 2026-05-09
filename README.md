# Storzy

A Next.js 16 e-commerce demo application built with React 19, shadcn/ui, and Tailwind CSS.

## Prerequisites

- Node.js 18.17 or later
- pnpm

## Setup

1. Clone the repository:
   ```bash
   git clone git@github.com:bugzy-ai/storzy.git
   cd storzy
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Create environment file:
   ```bash
   cp .env.example .env
   cp .env.local.example .env.local
   ```
   Or create `.env` / `.env.local` manually (see Environment Variables below).

## Environment Variables

Create a `.env.local` file in the project root for app flags:

```env
NEXT_PUBLIC_IMPROVED_CHECKOUT=false
NEXT_PUBLIC_ADD_TO_CART_BUG=false
```

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_IMPROVED_CHECKOUT` | Enables the improved checkout flow | `false` |
| `NEXT_PUBLIC_ADD_TO_CART_BUG` | Enables add-to-cart bug simulation for testing | `false` |

Set any variable to `true` to enable the feature.

Create a `.env` file in the project root for Confluence sync tooling:

```env
CONFLUENCE_BASE_URL=https://your-domain.atlassian.net
ATLASSIAN_EMAIL=you@example.com
ATLASSIAN_API_TOKEN=your_api_token
CONFLUENCE_CQL=type=page order by lastmodified desc
```

| Variable | Required | Description |
|----------|----------|-------------|
| `CONFLUENCE_BASE_URL` | Yes | Confluence Cloud base URL (without trailing slash) |
| `ATLASSIAN_EMAIL` | Yes | Atlassian account email used for API auth |
| `ATLASSIAN_API_TOKEN` | Yes | Atlassian API token tied to the account |
| `CONFLUENCE_CQL` | No | CQL used by index sync to scope pages. Defaults to `type=page order by lastmodified desc`. |

## Running Locally

```bash
# Start development server
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start

# Run linting
pnpm lint

# Build/update local Confluence index
pnpm confluence:index

# Search indexed Confluence pages
pnpm confluence:search -- "checkout flow"

# Fetch a page and save full markdown to ./tmp
pnpm confluence:get -- 123456789
```

The development server runs at [http://localhost:3000](http://localhost:3000).
