# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build Commands

```bash
pnpm dev      # Start development server
pnpm build    # Production build
pnpm lint     # Run ESLint
pnpm start    # Start production server
```

## Architecture

This is a Next.js 16 e-commerce demo app ("Storzy") using the App Router with React 19. It's designed as a test application for practicing with Bugzy.

### Tech Stack
- **Framework**: Next.js 16 with App Router
- **UI**: shadcn/ui (new-york style) + Tailwind CSS 4 + Radix UI primitives
- **Icons**: Lucide React
- **Forms**: React Hook Form + Zod validation

### Key Directories
- `app/` - Next.js App Router pages (all client components with "use client")
- `components/ui/` - shadcn/ui components
- `components/` - App-specific components (Header, ProductCard)
- `lib/` - Utilities (`cn()` helper) and data (`products.ts`)
- `hooks/` - Custom React hooks

### Import Aliases
Uses `@/*` path alias mapping to project root (e.g., `@/components/ui/button`).

### State Management
Client-side only using localStorage:
- `currentUser` - Authenticated user
- `cart` - Shopping cart (product ID to quantity mapping)

### Page Flow
1. `/` - Login page (validates against hardcoded users)
2. `/inventory` - Product listing with sorting
3. `/cart` - Cart management with quantity controls
4. `/checkout` - Checkout form
5. `/checkout-complete` - Order confirmation
