# Restaurant Web Frontend

A portfolio prototype of an online restaurant and food-ordering frontend, maintained under Sidiq Labs. The consumer-facing application uses the Foody brand.

## Overview

The application demonstrates restaurant discovery, ordering, and account management with a Next.js App Router frontend. It is a prototype, not a commercial delivery service; no commercial usage or payment processing is claimed.

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

Use Node.js 22 and npm. Copy `.env.example` to `.env.local` and configure your own values:

- `NEXT_PUBLIC_API_BASE_URL`: backend origin used by the frontend.
- `GOOGLE_MAPS_API_KEY`: server-only credential for geocoding; never expose it through a `NEXT_PUBLIC_` variable.

Do not commit credentials or local environment files. Without configured geocoding, delivery addresses can still be entered manually.

## Development

```bash
git clone https://github.com/SidiqLabs/restaurant-web-frontend.git
cd restaurant-web-frontend
npm ci
npm run dev
```

Configure `.env.local` before starting the app. `NEXT_PUBLIC_API_BASE_URL` must be a backend origin without a trailing `/api`; request paths already include `/api`. The backend is a separate service and is not included in this repository. Geolocation requires a secure browser context (HTTPS or localhost).

Before editing, follow the official [work-lock workflow](docs/work-locks.md), including explicit coordination-remote selection. Running the prototype does not require acquiring a work lock.

## Validation and Build

```bash
./node_modules/.bin/tsc --noEmit
npm run lint
npm run build
```

Run a completed production build with `npm run start`.

## Project Status

The current repository is [SidiqLabs/restaurant-web-frontend](https://github.com/SidiqLabs/restaurant-web-frontend). Earlier development history and original license attribution are retained; current documentation describes this independent portfolio prototype.

## Known Limitations

- Live data and account operations depend on the separately hosted backend.
- No automated application test suite is currently configured.
- Dependency security advisories remain unresolved. Run `npm audit` and resolve applicable findings before treating this prototype as a hardened public service.
- The existing lint command uses legacy ESLint tooling and is not sufficient evidence of a complete source lint pass; dependency/tooling alignment needs a separate maintenance task.
- Real Android acceptance and authenticated user journeys require separate testing. Do not use real personal data for a portfolio demonstration.

Build success does not replace functional or real-device QA.

## License

[MIT](LICENSE). Existing copyright and permission notices are retained.
