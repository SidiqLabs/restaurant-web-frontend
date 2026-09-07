# Restaurant Web Frontend Agent Guide

`PROJECT_CONTEXT.md` is the authoritative project governance and architecture source of truth. This file is a compact operational entrypoint for agents and must not compete with that document.

If instructions conflict, follow this order:

1. Current explicit user instruction for the active session.
2. `PROJECT_CONTEXT.md`.
3. `AGENTS.md`.
4. `docs/*`.
5. `README` and historical documents.

`.vercelignore` is deployment configuration only, not governance.

## Required Operating Rules

- Keep one session focused on one feature or maintenance task.
- Respect Locked Paths and responsibilities from `PROJECT_CONTEXT.md`.
- Keep server state in React Query and client/UI state in Redux.
- Do not call APIs from Redux slices.
- Use `NEXT_PUBLIC_API_BASE_URL`; do not hard-code backend runtime URLs in application code.
- Keep domain types in `src/types/*`, shared helpers in `src/lib/utils.ts`, and imports on the `@/` alias.
- Keep page components thin.
- Preserve unrelated dirty work. Do not reset, restore, clean, or overwrite user changes unless explicitly instructed.
- Never expose secrets or commit local environment files.
- Push only to the remote explicitly requested by the user. `origin` is the Bootcamp/assignment remote; `personal` is the personal/deployment remote.

## Local Work Locks

Before modifying source, config, docs, or tooling files:

1. Run `npm run lock:list`.
2. Determine the exact files required for the task.
3. Run `npm run lock:check -- <path>` for every target.
4. If any target is `ACTIVE` or `SHARED` by another worker, do not modify it.
5. If free, run `npm run lock:add -- <owner> <scope> <path...>` with the smallest reasonable path set.
6. Work only inside the owned scope.
7. Release the lock with `npm run lock:remove -- <owner> <scope>` after completion, commit, or abandonment.

Do not lock broad paths such as `src/**` when the task only needs a few files. Lock metadata in `.work-locks.json` is local-only and must not be committed or pushed.

See `docs/work-locks.md` for command details. Project architecture still follows `PROJECT_CONTEXT.md`.

<!-- DISTRIBUTED_WORK_LOCKS_V2_START -->
## Distributed work-lock override

Work locks are no longer local-only.

Every modifying worker MUST continue using `lock:list`, `lock:check`, `lock:add`, and `lock:remove`.

These commands now coordinate both local state and remote branch `work-locks`.

A path is FREE only when no overlapping local or remote ownership exists. Remote read failure is a stop condition. Never bypass, steal, or manually rewrite another device's lock.

Each clone requires local `.work-device`, for example `sidiq-hp` or `sidiq-laptop`.
<!-- DISTRIBUTED_WORK_LOCKS_V2_END -->
