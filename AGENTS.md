# Restaurant Web Frontend Agent Guide

`PROJECT_CONTEXT.md` is the source of truth. Priority: current explicit task, project context, this guide, other docs, then README/history. Deployment ignore files are not governance.

## Working Rules

- One session, one focus. Preserve unrelated work and working behavior.
- React Query owns server state; Redux owns UI/client intent. Slices never call APIs.
- Keep domain types in `src/types/*`, shared helpers in `src/lib/utils.ts`, and imports on `@/` aliases.
- Keep pages thin and preserve protected architectural responsibilities.
- Use `NEXT_PUBLIC_API_BASE_URL`; do not hard-code runtime backend URLs.
- Keep Google credentials server-only. Never expose secrets or commit local environment files.
- Follow the official work-lock workflow for every exact target before editing.
- Never reset, restore, clean, stash, or overwrite unrelated work to manufacture a clean tree.
- Review targeted diffs and run project validation. Do not claim runtime or Android verification from a build alone.
- Preserve the local `sidiqlabs-baseline` tag and existing license notices.

## Migration-Stage Remote Safety

- `bootcamp-source` is historical fetch/reference only. Keep its push URL disabled. Never push application branches, tags, or work locks to it.
- `work-locks` points to a local bare repository, exclusively for official lock coordination.
- Before every lock session, set `WORK_LOCK_REMOTE=work-locks` or prefix each lock command with `env WORK_LOCK_REMOTE=work-locks`. Do not rely on the application's tracking remote for lock selection.
- Only lock refs may be synchronized to the local coordination repository. Do not push application history there.
- The future Sidiq Labs GitHub remote is not configured yet. Creation, configuration, publishing, and deployment migration require explicit authorization.
- Do not modify the original historical repository.

## Official Lock Workflow

See [docs/work-locks.md](docs/work-locks.md).

1. List current locks.
2. Identify and check the smallest exact target set.
3. Stop on overlapping ACTIVE or SHARED ownership or remote read failure.
4. Acquire through `lock:add` and verify ownership.
5. Work only inside that scope.
6. Release through `lock:remove` after completion, commit, or abandonment.
7. Report the final `lock:list`.

Do not bypass the tooling, fabricate local-only ownership, steal locks, or auto-delete old ownership records.
