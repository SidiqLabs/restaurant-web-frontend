# Restaurant Web Frontend - Project Context

## Authority

This document is the architecture and governance source of truth for the Sidiq Labs migration clone. Instruction priority:

1. Current explicit user instruction for the active task.
2. `PROJECT_CONTEXT.md`.
3. `AGENTS.md`.
4. `docs/*`.
5. README and historical documentation.

`.vercelignore` is deployment configuration, not governance.

## Identity and Lifecycle

- Organization: Sidiq Labs.
- Project: Restaurant Web Frontend.
- Repository name: `restaurant-web-frontend`.
- Consumer-facing brand: Foody.
- INITIAL_SIDIQLABS_BASELINE: final completed frontend application migrated from historical project source.
- Baseline commit: `6f325fde326dfd66ab54463ca9f4c5352285235c`.
- Local annotated baseline tag: `sidiqlabs-baseline`.
- Preserve the existing license and copyright notices.
- This is ongoing application maintenance, not a completed-session roadmap. Migration does not imply that every behavior has passed current real-device acceptance.

## Technology and Existing Capabilities

Next.js App Router, React, TypeScript, Tailwind CSS, Radix UI/shadcn-style components, Redux Toolkit, TanStack Query, and Axios are present.

The baseline includes authentication, profile management, restaurant discovery and filtering, cart, checkout, order history, and reviews. Do not infer new features or backend capabilities from a migration task.

## Backend and Environment

- Documented backend reference: `https://be-restaurant-production.up.railway.app`.
- Runtime code obtains the backend origin from `NEXT_PUBLIC_API_BASE_URL`; never duplicate the documented URL in runtime source.
- Backend endpoints begin with `/api/`.
- Local environment values belong in ignored environment files; never commit secrets.
- `GOOGLE_MAPS_API_KEY` is server-only. Never introduce `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`.
- Same-origin `/api/geocode` performs authenticated geocoding. Preserve its server-side credential boundary.
- Migration identity changes do not authorize API, environment, or deployment changes.

Existing API scope:

- Auth: login, register, profile read/update.
- Restaurants: listing, detail, nearby, recommended, best-seller, and search.
- Cart: read, add, update, remove item, and clear.
- Orders: checkout and order history.
- Reviews: create, own reviews, restaurant reviews, update, and delete.

Use the current services and domain types for exact endpoint and payload contracts. Do not invent unsupported fields or relationships.

## State and Architecture

- React Query is authoritative for server state: profile, restaurants, cart, orders, and reviews.
- Redux stores client/UI intent, including filters and drawer/modal helpers; it must not become authoritative server storage.
- Redux slices never call APIs.
- Filtering combines query data with UI intent; location/range filtering uses the established server parameters.
- Keep HTTP transport and Axios configuration in `src/services/api/*`.
- Keep domain requests, query keys, hooks, mutations, and invalidation in `src/services/queries/*`.
- Domain types belong in `src/types/*`; do not duplicate domain types in components.
- Shared helpers belong in `src/lib/utils.ts`; preserve existing focused helpers rather than introducing parallel implementations.
- Imports use `@/` aliases.
- Page components remain thin; put reusable presentation in components.
- Keep the existing cart optimistic-update/rollback behavior.
- Keep checkout payload mapping in its adapter.
- Profile/home information and transactional delivery destinations are distinct. Preserve existing delivery persistence; do not make profile coordinates an implicit delivery address.
- Preserve existing token/session storage and Axios auth attachment unless an explicitly scoped task requires a change.

## Protected Responsibilities

These paths carry architectural responsibilities:

- `src/lib/store.ts`
- `src/lib/react-query.ts`
- `src/services/api/axios.ts`
- `src/services/queries/*`
- `src/features/*`
- `src/types/*`
- `src/lib/utils.ts`
- `src/app/providers.tsx`

Do not casually move, repurpose, duplicate, or bypass them. They are not immutable: a focused edit is allowed when required by the task, responsibilities remain intact, and the exact path is owned through the work-lock protocol.

## Design and Regression Safety

- One task has one coherent focus; no feature hopping or unrelated refactoring.
- Preserve working behavior, navigation, accessibility, loading/error/empty/success states, and responsive layouts outside the requested change.
- Use semantic design tokens. Primary actions remain primary; edit/cancel/dismiss actions remain neutral; destructive styling is only for destructive operations.
- Hover, focus, and disabled states must preserve meaning and contrast.
- Reuse shared variants; audit affected consumers before changing shared components.
- Deletion or behavioral replacement requires a task-specific justification.
- Build success alone is not regression proof.
- For responsive changes, test affected narrow widths and horizontal overflow, preserve desktop behavior, and distinguish browser simulation from real Android acceptance.

## Protected Route UX

- Redirect unauthenticated users from genuinely protected routes to Sign In rather than showing raw protected-API 401 errors.
- Preserve the intended internal route and return after successful login.
- Validate redirect destinations as internal paths.
- Gate protected queries when unauthenticated or auth is unresolved.
- Do not redirect prematurely during auth resolution or refactor global auth for unrelated work.

## Work Ownership

Use the existing official tooling before modifying source, configuration, documentation, or tooling:

1. Select the appropriate coordination remote as documented in `docs/work-locks.md`.
2. Run `npm run lock:list`.
3. Check every exact target with `npm run lock:check -- <path>`.
4. Stop for overlapping ACTIVE or SHARED ownership; never take over implicitly.
5. Acquire with `npm run lock:add -- <owner> <scope> <paths...>`.
6. Verify ownership, then edit only the owned scope.
7. Release with `npm run lock:remove -- <owner> <scope>` after completion, commit, or abandonment.
8. Report the final lock list.

The official system coordinates local ignored metadata with a Git lock branch. Remote read failure is a stop condition. Acquisition updates remote ownership before local registration; concurrent updates are rejected. Age is audit information, not permission to steal or delete a lock.

Architectural protection defines responsibility; work locks define current ownership. Never substitute manually fabricated locks.

## Migration-Stage Remotes

This section describes the current migration stage, not the final collaboration setup.

- `bootcamp-source`: historical fetch/reference remote only; its push URL must remain disabled. Never push application code, tags, or locks to it.
- `work-locks`: laptop-local bare Git repository for coordination only. Select it explicitly with `WORK_LOCK_REMOTE=work-locks` when using the lock tooling. Synchronize only the official lock branch, not application history or baseline tags.
- Future authoritative destination: `https://github.com/SidiqLabs/restaurant-web-frontend`. It is NOT CONFIGURED YET.

Do not create a hosted repository, configure its remote, publish application code/tags, or migrate Vercel until explicitly authorized. Do not change the original historical working repository.

## Validation and Completion

Before a substantive change, identify Git state and a local recovery point. Preserve unrelated dirty work and keep recovery artifacts local.

After changes:

- Run `git diff --check`, project TypeScript checks, `npm run lint`, and `npm run build`.
- Run targeted tests and runtime QA proportionate to the affected behavior.
- Review every diff for scope, accidental deletion, architecture violations, secrets, and unrelated changes.
- Stage only exact intended files; never use broad staging to capture unrelated work.
- Commit/push only when authorized; never force-push application branches or rewrite history.
- Report verification limitations honestly, including pending real-device checks.
- Release ownership and verify the final lock list.
