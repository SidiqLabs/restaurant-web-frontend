# Work Locks

`PROJECT_CONTEXT.md` remains the source of truth. Work locks coordinate editing ownership; they are advisory, not filesystem locks.

## Official Mechanism

The existing `scripts/work-locks.mjs` uses:

- Ignored local `.work-device` for device identity.
- Ignored local `.work-locks.json` for ownership metadata.
- Local `.work-locks.guard` for atomic coordination.
- `locks.json` on Git branch `work-locks` for cross-clone ownership.

List/check read both layers. Add synchronizes remote ownership before local registration. Acquisition/release use an expected-commit lease on the lock ref; concurrent changes fail closed. These operations create lock-history commits, not commits on application `main`.

## Remote Selection

The tooling selects:

1. `WORK_LOCK_REMOTE` when set.
2. The current branch's tracking remote.
3. `origin` as fallback.

`WORK_LOCK_REMOTE_BRANCH` overrides the default `work-locks` branch. Do not change it casually; workers must consult the same namespace.

## Current Migration-Stage Setup

This is a temporary laptop migration configuration, not the future hosted Sidiq Labs workflow.

- Project: `/home/sidiq/Documents/SidiqLabs/restaurant-web-frontend`
- Coordination remote: `work-locks`
- Bare repository: `/home/sidiq/Documents/SidiqLabs/.work-lock-remotes/restaurant-web-frontend.git`
- Device identity: `sidiq-laptop`
- Historical remote: `bootcamp-source`, fetch-only and push-disabled.
- Future Sidiq Labs GitHub remote: not configured.

Explicit selection is mandatory in every shell session:

```bash
export WORK_LOCK_REMOTE=work-locks
npm run lock:list
```

Alternatively prefix each command with `env WORK_LOCK_REMOTE=work-locks`. The application branch may still track the historical remote; do not rely on that default for coordination.

This setup synchronizes only laptop-local Git lock refs. It does not provide cross-device protection to devices that cannot access this filesystem repository. Do not start parallel editing elsewhere without an explicitly configured shared coordination destination.

## Commands

With `WORK_LOCK_REMOTE` set:

```bash
npm run lock:device -- sidiq-laptop
npm run lock:remote:status
npm run lock:list
npm run lock:check -- path/to/file
npm run lock:add -- codex focused-task path/to/file
npm run lock:remove -- codex focused-task
npm run lock:list
```

Device registration is one-time per clone. `npm run lock:remote:init` initializes an approved coordination repository when its lock branch does not exist; do not use it against the historical source.

## Ownership and Failures

- ACTIVE ownership blocks overlapping paths.
- SHARED ownership is not permission to edit; coordinate explicitly.
- FREE means neither local nor remote ownership overlaps.
- Use the smallest scope. Do not lock all of `src/**` for a few-file task.
- Malformed state, unsafe paths, inaccessible remotes, and concurrent updates fail closed.
- Never overwrite, bypass, or take over another worker's lock.
- An old timestamp is diagnostic only; stale locks require explicit resolution.
- Release only your matching ownership after completion, commit, or abandonment.
- Manual developers follow the same list/check/acquire/release workflow.

## Publishing Safety

Never push to `bootcamp-source`. Keep its push URL disabled.

The local coordination repository is for `refs/heads/work-locks` only, not application branches, baseline tags, or recovery artifacts. No external publication is required for current lock operations.

A later authorized migration stage must explicitly configure and document shared coordination before hosted or cross-device development. Do not assume the future Sidiq Labs repository already exists.
