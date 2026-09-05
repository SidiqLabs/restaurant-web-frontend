import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const stateFile = path.join(repoRoot, ".work-locks.json");

function loadState() {
  if (!fs.existsSync(stateFile)) {
    return { locks: [] };
  }

  const raw = fs.readFileSync(stateFile, "utf8");
  const parsed = JSON.parse(raw);

  if (!parsed || !Array.isArray(parsed.locks)) {
    throw new Error("Invalid .work-locks.json structure.");
  }

  return parsed;
}

function saveState(state) {
  const tempFile = `${stateFile}.tmp`;
  fs.writeFileSync(tempFile, `${JSON.stringify(state, null, 2)}\n`, "utf8");
  fs.renameSync(tempFile, stateFile);
}

function normalizeRepoPath(input) {
  if (!input) {
    throw new Error("Path is required.");
  }

  const absolute = path.resolve(repoRoot, input);
  const relative = path.relative(repoRoot, absolute);

  if (
    relative === ".." ||
    relative.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relative)
  ) {
    throw new Error(`Path is outside repository: ${input}`);
  }

  const normalized = relative.split(path.sep).join("/");

  if (!normalized || normalized === ".") {
    return ".";
  }

  return normalized.replace(/\/+$/, "");
}

function pathsConflict(a, b) {
  if (a === "." || b === ".") {
    return true;
  }

  return (
    a === b ||
    a.startsWith(`${b}/`) ||
    b.startsWith(`${a}/`)
  );
}

function findConflict(state, requestedPaths) {
  for (const lock of state.locks) {
    for (const existingPath of lock.paths) {
      for (const requestedPath of requestedPaths) {
        if (pathsConflict(existingPath, requestedPath)) {
          return {
            lock,
            existingPath,
            requestedPath,
          };
        }
      }
    }
  }

  return null;
}

function printLock(lock) {
  console.log(`owner: ${lock.owner}`);
  console.log(`scope: ${lock.scope}`);
  console.log(`createdAt: ${lock.createdAt}`);
  console.log(`paths:`);
  for (const p of lock.paths) {
    console.log(`  - ${p}`);
  }
}

const [, , command, ...args] = process.argv;

try {
  const state = loadState();

  if (command === "list") {
    if (state.locks.length === 0) {
      console.log("No active locks.");
      process.exit(0);
    }

    console.log(`Active locks: ${state.locks.length}`);

    state.locks.forEach((lock, index) => {
      if (index > 0) {
        console.log("");
      }
      printLock(lock);
    });

    process.exit(0);
  }

  if (command === "check") {
    if (args.length !== 1) {
      console.error("Usage: lock:check -- <path>");
      process.exit(2);
    }

    const requested = normalizeRepoPath(args[0]);
    const conflict = findConflict(state, [requested]);

    if (!conflict) {
      console.log(`FREE: ${requested}`);
      process.exit(0);
    }

    console.log(`ACTIVE: ${requested}`);
    console.log(
      `Blocked by ${conflict.lock.owner}/${conflict.lock.scope} on ${conflict.existingPath}`
    );
    process.exit(1);
  }

  if (command === "add") {
    if (args.length < 3) {
      console.error("Usage: lock:add -- <owner> <scope> <path...>");
      process.exit(2);
    }

    const [owner, scope, ...rawPaths] = args;
    const paths = [...new Set(rawPaths.map(normalizeRepoPath))];

    const conflict = findConflict(state, paths);

    if (conflict) {
      console.error(
        `ACTIVE: ${conflict.requestedPath} conflicts with ${conflict.existingPath}`
      );
      console.error(
        `Owned by ${conflict.lock.owner}/${conflict.lock.scope}`
      );
      process.exit(1);
    }

    const lock = {
      owner,
      scope,
      paths,
      createdAt: new Date().toISOString(),
    };

    state.locks.push(lock);
    saveState(state);

    console.log("Lock created:");
    printLock(lock);
    process.exit(0);
  }

  if (command === "remove") {
    if (args.length !== 2) {
      console.error("Usage: lock:remove -- <owner> <scope>");
      process.exit(2);
    }

    const [owner, scope] = args;
    const before = state.locks.length;

    state.locks = state.locks.filter(
      (lock) => !(lock.owner === owner && lock.scope === scope)
    );

    const removed = before - state.locks.length;

    if (removed === 0) {
      console.log(`No matching locks for ${owner}/${scope}.`);
      process.exit(0);
    }

    saveState(state);
    console.log(`Removed ${removed} lock(s) for ${owner}/${scope}.`);
    process.exit(0);
  }

  console.error("Unknown command.");
  console.error("Valid commands: list, check, add, remove");
  process.exit(2);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(2);
}
