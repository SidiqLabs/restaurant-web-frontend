# Restaurant Web Frontend

A restaurant ordering frontend maintained under Sidiq Labs. The consumer-facing application uses the Foody brand.

## Overview

The application supports restaurant discovery, ordering, and account management with a Next.js App Router frontend.

## Tech Stack

- Next.js 16, React 19, and TypeScript
- Tailwind CSS and shadcn/ui-style components built on Radix UI
- TanStack Query (React Query)
- Redux Toolkit
- Axios

## Features

- Sign in, registration, profile updates, and protected routes
- Restaurant browsing, search, categories, and filters
- Restaurant menus, ratings, and reviews
- Server-backed cart with optimistic updates
- Checkout with delivery-location selection and manual address fallback
- Order history and review submission, editing, and deletion
- Responsive layouts for desktop and mobile

Checkout submits orders to the configured backend; this frontend does not implement a payment gateway.

## Architecture

- React Query owns server data and cache updates.
- Redux holds client/UI intent; slices never call APIs.
- Domain types live in `src/types/*`.
- HTTP configuration lives in `src/services/api/*`; query hooks and mutations live in `src/services/queries/*`.
- Reusable components keep route/page components focused.
- Delivery destinations remain separate from profile identity.

See [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md) for architecture and [AGENTS.md](AGENTS.md) for contribution safety.

## Environment

Use Node.js 22 and npm. Configure local environment values using `.env.example` as a reference:

- `NEXT_PUBLIC_API_BASE_URL`: backend origin used by the frontend.
- `GOOGLE_MAPS_API_KEY`: server-only credential for geocoding; never expose it through a `NEXT_PUBLIC_` variable.

Do not commit credentials or local environment files. Without configured geocoding, delivery addresses can still be entered manually.

## Development

```bash
npm ci
npm run dev
```

Before editing, follow the official [work-lock workflow](docs/work-locks.md), including the migration-stage remote selection.

## Validation and Build

```bash
./node_modules/.bin/tsc --noEmit
npm run lint
npm run build
```

Run a completed production build with `npm run start`.

## Project Status

Initial Sidiq Labs baseline migrated from the completed application codebase. The planned repository is [SidiqLabs/restaurant-web-frontend](https://github.com/SidiqLabs/restaurant-web-frontend); its remote is not configured or published by this migration stage.

Build success does not replace functional or real-device QA.

## License

[MIT](LICENSE). Existing copyright and permission notices are retained.
