# Restaurant Web Frontend – Project Context

## Assignment

Challenge 9 – Restaurant Web Frontend (Next.js + TypeScript)

Status: ✅ COMPLETED (MVP + UI Polish + Review Feature)

---

## Tech Stack (Wajib)

- Next.js (App Router)
- TypeScript (strict mode enabled)
- Tailwind CSS
- shadcn/ui
- Redux Toolkit (client/UI state only)
- TanStack Query (server state)
- Axios
- Day.js

---

## Backend

- Documented production backend reference: `https://be-restaurant-production.up.railway.app`
- All API requests start with `/api/...`
- Runtime source code MUST NOT hard-code the backend base URL.
- Application runtime obtains the base URL from `.env.local` via `NEXT_PUBLIC_API_BASE_URL`.
- The documented production URL is reference documentation, not permission to duplicate it inside runtime source files.

---

## API Scope (Implemented)

### Auth ✅

- POST /api/auth/register
- POST /api/auth/login
- GET /api/auth/profile
- PUT /api/auth/profile

✔ Token stored (localStorage MVP)
✔ Axios interceptor attaches Authorization header
✔ Protected endpoints working

---

### Restaurants ✅

- GET /api/resto
- GET /api/resto/{id}
- GET /api/resto/recommended
- GET /api/resto/best-seller
- GET /api/resto/nearby (if used)

✔ Home listing
✔ Category listing
✔ Detail page
✔ Client-side derived filtering
✔ Server-side location/range filtering

---

### Cart ✅ (Optimistic UI)

- GET /api/cart
- POST /api/cart
- PUT /api/cart/{id}
- DELETE /api/cart/{id}
- DELETE /api/cart

✔ React Query authoritative data
✔ Optimistic update + rollback
✔ Redux only for UI helpers
✔ Quantity controls aligned with design

---

### Checkout & Orders ✅

- POST /api/order/checkout
- GET /api/order/my-order

✔ Adapter: cart → checkout payload
✔ Payment success page
✔ Orders history page
✔ Review button integrated

---

### Reviews (Post-MVP) ✅

- POST /api/review
- GET /api/review/my-reviews
- GET /api/review/restaurant/{restaurantId}
- PUT /api/review/{id}
- DELETE /api/review/{id}

✔ Review modal (controlled)
✔ 409 handling
✔ Delete review supported
✔ Swagger contract respected

---

## State Separation Rules (Respected)

### Server State (React Query)

- Auth profile
- Restaurants
- Cart
- Orders
- Reviews

### Client/UI State (Redux)

- Filters (category, range, price, rating, sort)
- Drawer/modal state
- Toast positioning
- Cart UI helpers (pending flags, temp state)

✔ Redux does NOT store authoritative server data

---

## Architecture Decisions (Final)

- Filtering: derived client-side (Redux + query data)
- Location/range: server-side query param
- React Query for ALL server data
- Redux strictly UI intent only
- HTTP transport and Axios configuration isolated inside `src/services/api/`.
- Domain server-state integration lives inside `src/services/queries/`, including request functions, query keys, TanStack Query hooks/mutations, and cache invalidation.
- Auth token via Axios interceptor
- Adapter pattern used for checkout mapping

---

## UI Status

✔ Mobile-first responsive
✔ next/image used properly
✔ Design token system respected (globals.css semantic tokens)
✔ No random hard-coded colors outside design system
✔ UI Detail pass (Session D2) completed
✔ Orders, Checkout, Detail, Profile aligned with Figma

---

## Design System Interaction Semantics

- Semantic UI tokens are mandatory; avoid arbitrary component-specific colors.
- Primary actions use the primary brand token and must keep primary hover, focus, and disabled semantics.
- Secondary, edit, cancel, and dismiss actions are neutral and visually subordinate to primary actions.
- Destructive styling is reserved for genuinely destructive actions such as delete or permanent removal.
- Hover, focus, and disabled states must preserve the control's semantic role and readable contrast.
- Prefer shared semantic component variants over repeated ad-hoc class overrides. Shared component changes require impact audit across existing usages.

## Architectural Protected Paths (Respected)

- src/lib/store.ts
- src/lib/react-query.ts
- src/services/api/axios.ts
- src/services/queries/\*
- src/features/\*
- src/types/\*
- src/lib/utils.ts
- src/app/providers.tsx

No violations.

### Protected Path Semantics

These paths carry established architectural responsibilities.

They MUST NOT be casually moved, repurposed, duplicated, or bypassed.

A protected path is not automatically immutable. A focused change inside one of these paths is allowed only when:

1. The current task genuinely requires it.
2. Existing responsibility boundaries are preserved unless an architectural revision is explicitly approved.
3. The exact target path passes the concurrent work-lock protocol before editing.

### Concurrent Work Locks

Concurrent work locks are separate from architectural protection.

Before modifying any project file:

1. Run `npm run lock:list`.
2. Identify the exact target file(s).
3. Run `npm run lock:check -- <path>` for every target.
4. If a target is ACTIVE or SHARED by another worker, DO NOT modify it.
5. If FREE, register ownership with `npm run lock:add -- <owner> <scope> <path...>`.
6. Release ownership after work is completed, committed, or abandoned with `npm run lock:remove -- <owner> <scope>`.
7. Final task reporting MUST include the result of `npm run lock:list`.

Architectural protection answers **what responsibility a path owns**.

Concurrent work locking answers **who may edit it right now**.

---

## Quality Guardrails (Applied)

- One session = one focus.
- One changeset = one coherent purpose.
- No god components.
- No duplicate domain types.
- Alias `@/` used consistently.
- No CSR/SSR mixing without reason.
- Preserve existing working behavior outside the active task scope.
- Refactoring one concern does not authorize unrelated UI, routing, interaction, data-flow, or responsive changes.
- Deletion or behavioral replacement requires traceable justification to the current requirement.
- Build success alone is not regression proof.
- Review the targeted Git diff before completion.
- Dead code cleanup is allowed only when it is verified and within task scope.

---


## Regression Preservation

Existing working behavior is preserved by default.

This includes:

- UI structure and user-visible controls
- Navigation and routing
- Responsive behavior
- Accessibility and keyboard/focus behavior
- Authentication and protected-route behavior
- Server-state and client-state ownership
- API contracts and request semantics
- Loading, error, empty, and success states
- Existing critical user journeys

Changes outside the active task scope are regressions unless explicitly required by the task or necessary to fix a verified blocking defect.

For every modified file, review:

- Intended additions
- Intended modifications
- Unintended deletions
- Unrelated behavior changes
- Scope creep

If existing behavior cannot be proven obsolete or incorrect, preserve it.

**Preservation is the default. Behavioral change and deletion require justification.**

## Protected Route / Authentication UX

- Genuinely protected routes redirect unauthenticated users to Sign In instead of rendering raw protected-API 401 UI.
- Preserve the intended internal route with `/auth/login?redirect=<internal-path>` and return there after successful login.
- Protected server queries must be gated while auth is unresolved or when no token exists.
- Auth-unresolved state must not cause premature redirects or visible protected-content flashes.
- Redirect destinations must be validated internal application paths; invalid or external values fall back safely.
- Preserve working authenticated behavior and avoid unrelated global auth refactors.

---

## Definition of Done – FINAL

Project-level completion requires:

### Functional Correctness

- Requested behavior is implemented and verified.
- Existing affected behavior is regression-checked.
- MVP and post-MVP critical user journeys remain functional.
- API contracts and architectural state ownership remain respected.

### Automated Validation

- TypeScript/type validation passes through the project-supported validation path.
- Lint passes.
- Relevant automated tests pass when available.
- Production build passes.
- A successful build alone is NOT considered regression proof.

### Runtime / UI Validation

For affected UI flows, verify where applicable:

- Mobile layout
- Desktop layout
- Responsive transitions
- Navigation
- Keyboard and focus behavior
- Loading state
- Error state
- Empty state
- Success state

Critical runtime smoke testing is required when the task changes user-visible behavior or integration behavior.

### Change Review

- Targeted `git diff` reviewed against the active task scope.
- No unintended deletions.
- No unrelated behavioral changes.
- No unrelated cleanup or refactoring.
- Architectural protected paths remain within their documented responsibilities.
- No hard-coded API base URL is introduced.

### Repository Coordination

- Work lock released after completion, commit, or abandonment.
- Final `npm run lock:list` verified and reported.
- Existing unrelated dirty work remains untouched.
- Recovery points remain local unless explicitly requested otherwise.

### Existing Project Completion Status

✔ All MVP pages work end-to-end
✔ Auth fully functional
✔ Cart optimistic UX stable
✔ Checkout payload correct
✔ Orders history renders correctly
✔ Review flow functional
✔ No hard-coded API URL
✔ Structure follows project architecture
✔ UI visually aligned post D2

---

## Final Status

- Setup: DONE
- Auth: DONE
- Home Data Flow: DONE
- Home UI: DONE
- Category + Filters: DONE
- Cart: DONE
- Checkout: DONE
- Orders: DONE
- Reviews: DONE
- Refactor & Polish: DONE

Project Status: ✅ COMPLETED
