# Storzy

A Next.js 16 e-commerce demo application built with React 19, shadcn/ui, and Tailwind CSS.

## Prerequisites

- Node.js 20.9.0 or later
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
   cp .env.local.example .env.local
   ```
   Or create `.env.local` manually (see Environment Variables below).

## Environment Variables

Create a `.env.local` file in the project root with the following variables:

```env
NEXT_PUBLIC_IMPROVED_CHECKOUT=false
NEXT_PUBLIC_ADD_TO_CART_BUG=false

# Server-side checkout provider rollout
CHECKOUT_PROVIDER_V2=false

# Optional server-side PostHog Logs delivery (EU)
POSTHOG_PROJECT_TOKEN=
POSTHOG_LOGS_ENDPOINT=https://eu.i.posthog.com/i/v1/logs
```

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_IMPROVED_CHECKOUT` | Enables the improved checkout flow | `false` |
| `NEXT_PUBLIC_ADD_TO_CART_BUG` | Enables add-to-cart bug simulation for testing | `false` |
| `CHECKOUT_PROVIDER_V2` | Routes checkout through payment provider V2 when set to exact `true` | `false` |
| `POSTHOG_PROJECT_TOKEN` | PostHog project token for server-side checkout logs; keep it private | unset |
| `POSTHOG_LOGS_ENDPOINT` | PostHog Logs OTLP/HTTP endpoint (EU example shown above) | `https://eu.i.posthog.com/i/v1/logs` |

`CHECKOUT_PROVIDER_V2` is server-only. Missing values and every value other than exact `true` use the healthy V1 provider. Activate V2 by setting it to `true` in the target server environment. Roll back to V1 by setting it to `false` or removing it, then redeploy or restart the application.

PostHog Logs are optional and remain disabled unless both server-side variables are set. Configure the project token only in a trusted server environment; do not use a `NEXT_PUBLIC_` prefix. Checkout logs contain only the documented operational fields and do not include checkout form data or cart contents. The service uses `VERCEL_ENV` (falling back to `NODE_ENV`) for its environment and includes `VERCEL_GIT_COMMIT_SHA` as the release SHA when available. Log export is flushed before the checkout API response completes. The V1 checkout endpoint is a healthy demo simulation; it does not charge a payment method or persist orders.

## Demo Checkout

Checkout uses a simulated card form and never processes a real payment. **Do not enter real card information.** Use these harmless demo values:

```text
Cardholder: Demo Shopper
Card number: 4111 1111 1111 1111
Expiration: 12/34
Security code: 123
```

Shipping and card fields stay in browser component memory and are not included in the checkout API request. The server receives only product IDs and quantities.

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

# Run tests
pnpm test
```

The development server runs at [http://localhost:3000](http://localhost:3000).
