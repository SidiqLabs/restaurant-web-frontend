#!/usr/bin/env node
import {
  closeSync,
  existsSync,
  fsyncSync,
  mkdirSync,
  openSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const lockFile = path.join(repoRoot, '.work-locks.json');
const writeLockDir = `${lockFile}.lock`;
const VALID_STATUSES = new Set(['ACTIVE', 'SHARED']);
const OWNER_SCOPE_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;
const MAX_LOCKS = 200;
const MAX_PATHS_PER_LOCK = 200;

class CliError extends Error {
  constructor(message, code = 1) {
    super(message);
    this.code = code;
  }
}

const [, , command, ...args] = process.argv;

function printUsage() {
  console.log(`Usage:
  npm run lock:list
  npm run lock:check -- <path>
  npm run lock:add -- [--shared] <owner> <scope> <path...>
  npm run lock:remove -- <owner> <scope>`);
}

function fail(message, code = 1) {
  throw new CliError(message, code);
}

function hasControlCharacter(value) {
  return Array.from(value).some((char) => {
    const code = char.charCodeAt(0);
    return code < 32 || code === 127;
  });
}

function validateToken(label, value) {
  if (typeof value !== 'string' || value.length === 0) {
    fail(`ERROR: ${label} is required.`);
  }
  if (!OWNER_SCOPE_RE.test(value)) {
    fail(
      `ERROR: Invalid ${label}. Use 1-64 characters: letters, numbers, dot, underscore, or hyphen. It must start with a letter or number.`,
    );
  }
}

function normalizePath(inputPath) {
  if (typeof inputPath !== 'string' || inputPath.trim().length === 0) {
    fail('ERROR: Path is required.');
  }

  if (hasControlCharacter(inputPath)) {
    fail(`ERROR: Invalid path contains control characters: ${inputPath}`);
  }

  if (/^[A-Za-z]:/.test(inputPath) || inputPath.startsWith('\\\\')) {
    fail(`ERROR: Path must be relative to the repository: ${inputPath}`);
  }

  const normalizedInput = inputPath.trim().replaceAll('\\', '/').replace(/\/+/g, '/');
  const isDirectoryGlob = normalizedInput.endsWith('/**');
  const pathToResolve = isDirectoryGlob ? normalizedInput.slice(0, -3) : normalizedInput;
  const absolute = path.resolve(repoRoot, pathToResolve);
  const relative = path.relative(repoRoot, absolute);

  if (
    relative === '' ||
    relative.startsWith('..') ||
    path.isAbsolute(relative) ||
    relative.split(path.sep).includes('..')
  ) {
    fail(`ERROR: Path escapes repository: ${inputPath}`);
  }

  const repoPath = relative.split(path.sep).join('/').replace(/^\.\//, '').replace(/\/+$/g, '');

  if (repoPath.length === 0 || repoPath === '.') {
    fail('ERROR: Repository root cannot be locked. Use the smallest reasonable path.');
  }

  return isDirectoryGlob ? `${repoPath}/**` : repoPath;
}

function validateStatus(status) {
  if (!VALID_STATUSES.has(status)) {
    fail(`ERROR: Invalid lock status "${status}". Allowed: ACTIVE, SHARED.`);
  }
}

function normalizeLock(rawLock, index) {
  if (!rawLock || typeof rawLock !== 'object' || Array.isArray(rawLock)) {
    fail(`ERROR: Invalid lock entry at index ${index}.`);
  }

  const { owner, scope, status = 'ACTIVE', startedAt, paths } = rawLock;
  validateToken(`locks[${index}].owner`, owner);
  validateToken(`locks[${index}].scope`, scope);
  validateStatus(status);

  if (typeof startedAt !== 'string' || startedAt.length === 0 || Number.isNaN(Date.parse(startedAt))) {
    fail(`ERROR: Invalid startedAt for lock ${owner}/${scope}.`);
  }

  if (!Array.isArray(paths) || paths.length === 0) {
    fail(`ERROR: Lock ${owner}/${scope} must contain at least one path.`);
  }

  if (paths.length > MAX_PATHS_PER_LOCK) {
    fail(`ERROR: Lock ${owner}/${scope} has too many paths.`);
  }

  const uniquePaths = [];
  const seen = new Set();
  for (const lockPath of paths) {
    const normalized = normalizePath(lockPath);
    if (!seen.has(normalized)) {
      seen.add(normalized);
      uniquePaths.push(normalized);
    }
  }

  return {
    owner,
    scope,
    status,
    startedAt,
    paths: uniquePaths,
  };
}

function pathsOverlap(left, right) {
  const normalizeDirectoryPrefix = (value) => {
    if (value.endsWith('/**')) {
      return `${value.slice(0, -3).replace(/\/+$/g, '')}/`;
    }
    return null;
  };

  if (left === right) {
    return true;
  }

  const leftDir = normalizeDirectoryPrefix(left);
  const rightDir = normalizeDirectoryPrefix(right);

  if (leftDir && rightDir) {
    return leftDir.startsWith(rightDir) || rightDir.startsWith(leftDir);
  }

  if (leftDir) {
    return right.startsWith(leftDir);
  }

  if (rightDir) {
    return left.startsWith(rightDir);
  }

  return left.startsWith(`${right}/`) || right.startsWith(`${left}/`);
}

function validateNoInternalAmbiguity(locks) {
  if (locks.length > MAX_LOCKS) {
    fail(`ERROR: Too many work locks (${locks.length}). Please clean up old locks explicitly.`);
  }

  for (let leftIndex = 0; leftIndex < locks.length; leftIndex += 1) {
    const left = locks[leftIndex];
    for (let rightIndex = leftIndex + 1; rightIndex < locks.length; rightIndex += 1) {
      const right = locks[rightIndex];
      for (const leftPath of left.paths) {
        for (const rightPath of right.paths) {
          if (pathsOverlap(leftPath, rightPath)) {
            fail(
              `ERROR: Ambiguous lock state. ${leftPath} (${left.owner}/${left.scope}) overlaps ${rightPath} (${right.owner}/${right.scope}). Resolve manually before continuing.`,
            );
          }
        }
      }
    }
  }
}

function readLocks() {
  if (!existsSync(lockFile)) {
    return { version: 1, locks: [] };
  }

  const raw = readFileSync(lockFile, 'utf8');
  if (raw.trim().length === 0) {
    return { version: 1, locks: [] };
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    fail(`ERROR: Failed to parse .work-locks.json. Fix the JSON manually before continuing.\n${error.message}`);
  }

  if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.locks)) {
    fail('ERROR: Invalid .work-locks.json structure. Expected { "version": 1, "locks": [] }.');
  }

  const locks = parsed.locks.map((lock, index) => normalizeLock(lock, index));
  validateNoInternalAmbiguity(locks);
  return { version: 1, locks };
}

function acquireWriteLock() {
  try {
    mkdirSync(writeLockDir);
  } catch (error) {
    fail(`ERROR: Could not acquire local write lock. Another lock command may be running.\n${error.message}`);
  }
}

function releaseWriteLock() {
  rmSync(writeLockDir, { recursive: true, force: true });
}

function writeLocks(data) {
  validateNoInternalAmbiguity(data.locks);
  const tempFile = `${lockFile}.${process.pid}.tmp`;
  const payload = `${JSON.stringify(data, null, 2)}\n`;
  let descriptor;

  try {
    descriptor = openSync(tempFile, 'w', 0o600);
    writeFileSync(descriptor, payload, 'utf8');
    fsyncSync(descriptor);
    closeSync(descriptor);
    descriptor = undefined;
    renameSync(tempFile, lockFile);
  } catch (error) {
    if (descriptor !== undefined) {
      closeSync(descriptor);
    }
    rmSync(tempFile, { force: true });
    fail(`ERROR: Failed to write .work-locks.json safely.\n${error.message}`);
  }
}

function findOverlappingLocks(locks, targetPath) {
  return locks.filter((lock) => lock.paths.some((lockPath) => pathsOverlap(lockPath, targetPath)));
}

function listLocks() {
  const { locks } = readLocks();
  if (locks.length === 0) {
    console.log('No active work locks');
    return;
  }

  console.log('ACTIVE WORK LOCKS');
  console.log('');
  locks.forEach((lock, index) => {
    if (index > 0) {
      console.log('');
    }
    console.log(`Owner : ${lock.owner}`);
    console.log(`Scope : ${lock.scope}`);
    console.log(`Status: ${lock.status}`);
    console.log(`Started: ${lock.startedAt}`);
    console.log('');
    console.log('Paths:');
    lock.paths.forEach((lockPath) => console.log(`- ${lockPath}`));
  });
}

function checkPath(pathArg) {
  const targetPath = normalizePath(pathArg);
  const { locks } = readLocks();
  const overlaps = findOverlappingLocks(locks, targetPath);

  if (overlaps.length === 0) {
    console.log(`FREE: ${targetPath}`);
    return;
  }

  const lock = overlaps[0];
  console.error(lock.status === 'SHARED' ? 'SHARED' : 'LOCKED');
  console.error('');
  console.error('Path:');
  console.error(targetPath);
  console.error('');
  console.error('Owner:');
  console.error(lock.owner);
  console.error('');
  console.error('Scope:');
  console.error(lock.scope);
  process.exit(2);
}

function addLock(rawArgs) {
  const nextArgs = [...rawArgs];
  const sharedIndex = nextArgs.indexOf('--shared');
  const status = sharedIndex === -1 ? 'ACTIVE' : 'SHARED';
  if (sharedIndex !== -1) {
    nextArgs.splice(sharedIndex, 1);
  }

  const [owner, scope, ...rawPaths] = nextArgs;
  validateToken('owner', owner);
  validateToken('scope', scope);

  if (rawPaths.length === 0) {
    fail('ERROR: At least one path is required.');
  }

  const requestedPaths = [...new Set(rawPaths.map((rawPath) => normalizePath(rawPath)))];

  acquireWriteLock();
  try {
    const data = readLocks();

    const conflictingLocks = data.locks.filter((lock) => {
      const sameOwnerScope = lock.owner === owner && lock.scope === scope;
      return !sameOwnerScope && requestedPaths.some((requestedPath) => lock.paths.some((lockPath) => pathsOverlap(lockPath, requestedPath)));
    });

    if (conflictingLocks.length > 0) {
      const conflict = conflictingLocks[0];
      const conflictPath = requestedPaths.find((requestedPath) => conflict.paths.some((lockPath) => pathsOverlap(lockPath, requestedPath)));
      fail(`ERROR: LOCK CONFLICT

${conflictPath}
is already owned by:

owner: ${conflict.owner}
scope: ${conflict.scope}
status: ${conflict.status}`);
    }

    const existing = data.locks.find((lock) => lock.owner === owner && lock.scope === scope);
    if (existing) {
      if (existing.status !== status) {
        fail(`ERROR: Existing lock ${owner}/${scope} has status ${existing.status}; requested ${status}. Remove and recreate explicitly if needed.`);
      }

      for (const requestedPath of requestedPaths) {
        if (!existing.paths.some((lockPath) => pathsOverlap(lockPath, requestedPath) && lockPath === requestedPath)) {
          existing.paths.push(requestedPath);
        }
      }
    } else {
      data.locks.push({
        owner,
        scope,
        status,
        startedAt: new Date().toISOString(),
        paths: requestedPaths,
      });
    }

    data.locks.sort((left, right) => {
      const ownerCompare = left.owner.localeCompare(right.owner);
      if (ownerCompare !== 0) return ownerCompare;
      return left.scope.localeCompare(right.scope);
    });

    writeLocks(data);
    console.log(`${status} lock registered`);
    console.log(`Owner : ${owner}`);
    console.log(`Scope : ${scope}`);
    console.log('Paths:');
    requestedPaths.forEach((lockPath) => console.log(`- ${lockPath}`));
  } finally {
    releaseWriteLock();
  }
}

function removeLock(owner, scope) {
  validateToken('owner', owner);
  validateToken('scope', scope);

  acquireWriteLock();
  try {
    const data = readLocks();
    const beforeCount = data.locks.length;
    data.locks = data.locks.filter((lock) => !(lock.owner === owner && lock.scope === scope));

    if (data.locks.length === beforeCount) {
      fail(`ERROR: No lock found for owner "${owner}" and scope "${scope}".`);
    }

    writeLocks(data);
    console.log(`Released lock for ${owner}/${scope}`);
  } finally {
    releaseWriteLock();
  }
}

try {
  switch (command) {
    case 'list':
      listLocks();
      break;
    case 'check':
      if (args.length !== 1) {
        printUsage();
        process.exit(1);
      }
      checkPath(args[0]);
      break;
    case 'add':
      addLock(args);
      break;
    case 'remove':
      if (args.length !== 2) {
        printUsage();
        process.exit(1);
      }
      removeLock(args[0], args[1]);
      break;
    default:
      printUsage();
      process.exit(command ? 1 : 0);
  }
} catch (error) {
  if (error instanceof CliError) {
    console.error(error.message);
    process.exit(error.code);
  }

  throw error;
}
