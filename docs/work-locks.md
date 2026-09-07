# Local Work Locks

`PROJECT_CONTEXT.md` remains the project source of truth. This document only explains the local soft-lock tooling used to coordinate parallel work.

## Purpose

The lock system helps agents and developers see local ownership before editing files. It is a soft coordination signal, not a filesystem lock and not a replacement for Git review.

Lock metadata is stored in `.work-locks.json` at the repository root. That file is local-only, ignored by Git, never pushed, never deployed, and must never contain secrets.

## Commands

```bash
npm run lock:list
npm run lock:check -- <path>
npm run lock:add -- <owner> <scope> <path...>
npm run lock:remove -- <owner> <scope>
```

Example:

```bash
npm run lock:add -- codex review-fix src/components/resto/ReviewSection.tsx
npm run lock:check -- src/components/resto/ReviewSection.tsx
npm run lock:remove -- codex review-fix
```

## Status Semantics

`ACTIVE` means a path is owned by a worker. Other workers must not modify overlapping exact files or parent/child directory paths.

`SHARED` means the path is known to be shared coordination territory. It still requires explicit coordination before editing and must not be treated as free.

`FREE` is reported by `lock:check` when no overlapping lock is present.

## Parallel Work Rules

Before changing files:

1. List current locks.
2. Identify the smallest exact file or directory paths required by the task.
3. Check every target path.
4. Add a lock before editing.
5. Stop instead of editing a path owned by another worker.
6. Release only your own owner/scope after completion, commit, or abandonment.

Do not lock the whole repository or broad directories when a focused file list is enough.

## Failure Behavior

The CLI fails closed when lock state is malformed, path ownership is ambiguous, inputs are invalid, or a path escapes the repository. It does not silently reset corrupted lock files.

Wrong-owner removal is rejected. Duplicate acquisition by the same owner and scope merges missing paths without duplicate path entries.

## Concurrency Limits

This is a local soft-lock helper. Writes use a simple local lock directory and atomic rename to reduce accidental partial writes, but it is not a distributed lock and does not coordinate across machines or Git remotes.

<!-- DISTRIBUTED_WORK_LOCKS_V2_START -->

# Distributed Work Locks V2

This section supersedes earlier local-only coordination notes.

Two coordinated layers are used:

1. Local: `.work-locks.json`
2. Cross-device: `locks.json` on remote branch `work-locks`

`.work-locks.json`, `.work-device`, and `.work-locks.guard/` remain local-only and Git-ignored.

Normal commands remain:

`npm run lock:list`
`npm run lock:check -- path/to/file`
`npm run lock:add -- <owner> <scope> path/to/file`
`npm run lock:remove -- <owner> <scope>`

Per-device setup:

`npm run lock:device -- sidiq-hp`

or:

`npm run lock:device -- sidiq-laptop`

Remote coordination:

`npm run lock:remote:init`
`npm run lock:remote:status`

Acquisition fails closed. `lock:add` reads current remote state, checks overlap, and updates using an expected remote commit lease. Concurrent updates are rejected.

Stale locks remain blocking and are never automatically stolen.

Routine lock/unlock activity MUST NOT create commits on `main`.

Final task completion requires successful release and final `npm run lock:list`.
<!-- DISTRIBUTED_WORK_LOCKS_V2_END -->
