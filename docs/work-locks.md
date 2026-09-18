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

## Coordination Setup

Application source is hosted at `SidiqLabs/restaurant-web-frontend`. Editing coordination is configured separately and must be agreed before parallel work.

- Coordination remote: `work-locks`
- Inspect its local location with `git remote get-url work-locks`; do not publish machine-specific paths.
- Register a meaningful device identity through `lock:device`; `.work-device` remains ignored.
- Historical reference remotes remain fetch-only and push-disabled.

Explicit selection is mandatory in every shell session:

```bash
export WORK_LOCK_REMOTE=work-locks
npm run lock:list
```

Alternatively prefix each command with `env WORK_LOCK_REMOTE=work-locks`. The application branch tracks `origin/main`; do not rely on its tracking remote for coordination.

The current local bare remote synchronizes only local Git lock refs. It does not protect devices that cannot access that repository. A fresh clone must have an approved coordination remote configured before editing; never silently initialize locks on the application or historical remote. Do not start cross-device editing without an agreed shared coordination destination.

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

Never push to historical reference remotes. Keep their push URLs disabled.

The local coordination repository is for `refs/heads/work-locks` only, not application branches, baseline tags, or recovery artifacts. No external publication is required for current lock operations.

Configuring hosted or cross-device coordination requires explicit authorization. A hosted application repository alone does not establish shared work-lock coordination.
