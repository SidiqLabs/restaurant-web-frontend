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

- Base URL: https://be-restaurant-production.up.railway.app
- All API requests start with `/api/...`
- NO hard-coded API URL
- Uses `.env.local` with `NEXT_PUBLIC_API_BASE_URL`

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
- API layer isolated inside `services/queries`
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

## Locked Paths (Respected)

- src/lib/store.ts
- src/lib/react-query.ts
- src/services/api/axios.ts
- src/services/queries/\*
- src/features/\*
- src/types/\*
- src/lib/utils.ts
- src/app/providers.tsx

No violations.

---

## Quality Guardrails (Applied)

- One session = one focus
- No god components
- No duplicate domain types
- Alias `@/` used consistently
- No CSR/SSR mixing without reason
- Build passes
- Dead code cleaned in final pass

---

## Protected Route / Authentication UX

- Genuinely protected routes redirect unauthenticated users to Sign In instead of rendering raw protected-API 401 UI.
- Preserve the intended internal route with `/auth/login?redirect=<internal-path>` and return there after successful login.
- Protected server queries must be gated while auth is unresolved or when no token exists.
- Auth-unresolved state must not cause premature redirects or visible protected-content flashes.
- Redirect destinations must be validated internal application paths; invalid or external values fall back safely.
- Preserve working authenticated behavior and avoid unrelated global auth refactors.

---

## Definition of Done – FINAL

Project considered DONE because:

✔ All MVP pages work end-to-end  
✔ Auth fully functional  
✔ Cart optimistic UX stable  
✔ Checkout payload correct  
✔ Orders history renders correctly  
✔ Review flow functional  
✔ No hard-coded API URL  
✔ Structure follows roadmap document  
✔ UI visually aligned post D2  
✔ `npm run build` passes

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
