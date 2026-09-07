#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const rootProbe = spawnSync(
  'git',
  ['rev-parse', '--show-toplevel'],
  { encoding: 'utf8' }
);

if (rootProbe.status !== 0) {
  console.error('ERROR: not inside a Git repository');
  process.exit(1);
}

const ROOT = rootProbe.stdout.trim();
const LOCAL_FILE = path.join(ROOT, '.work-locks.json');
const DEVICE_FILE = path.join(ROOT, '.work-device');
const MUTEX_DIR = path.join(ROOT, '.work-locks.guard');

function resolveTrackingRemote() {
  const branchProbe = spawnSync(
    'git',
    ['symbolic-ref', '--quiet', '--short', 'HEAD'],
    {
      cwd: ROOT,
      encoding: 'utf8',
      env: process.env,
    }
  );

  if (branchProbe.status !== 0) return '';

  const branch = branchProbe.stdout.trim();
  if (!branch) return '';

  const remoteProbe = spawnSync(
    'git',
    ['config', '--get', `branch.${branch}.remote`],
    {
      cwd: ROOT,
      encoding: 'utf8',
      env: process.env,
    }
  );

  if (remoteProbe.status !== 0) return '';

  const remote = remoteProbe.stdout.trim();

  // "." means the current repository, not a usable Git remote.
  return remote && remote !== '.' ? remote : '';
}

const REMOTE =
  process.env.WORK_LOCK_REMOTE ||
  resolveTrackingRemote() ||
  'origin';

const BRANCH =
  process.env.WORK_LOCK_REMOTE_BRANCH ||
  'work-locks';
const REMOTE_REF = `refs/heads/${BRANCH}`;
const STALE_HOURS = Number(process.env.WORK_LOCK_STALE_HOURS || '12');

function git(args, { input, allowFail = false, env = {} } = {}) {
  const result = spawnSync('git', args, {
    cwd: ROOT,
    encoding: 'utf8',
    input,
    env: { ...process.env, ...env },
  });

  if (result.status !== 0 && !allowFail) {
    const detail = (result.stderr || result.stdout || '').trim();
    throw new Error(
      `git ${args.join(' ')} failed${detail ? `: ${detail}` : ''}`
    );
  }

  return result;
}

function normalizePath(value) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error('Invalid empty lock path');
  }

  let p = value.trim().replaceAll('\\', '/');

  while (p.startsWith('./')) p = p.slice(2);

  p = path.posix.normalize(p);

  if (
    p === '.' ||
    p === '..' ||
    p.startsWith('../') ||
    path.posix.isAbsolute(p)
  ) {
    throw new Error(`Invalid repository path: ${value}`);
  }

  return p;
}

function normalizeLock(lock) {
  if (
    !lock ||
    typeof lock.owner !== 'string' ||
    typeof lock.scope !== 'string' ||
    !Array.isArray(lock.paths)
  ) {
    throw new Error('Malformed lock entry');
  }

  const started =
    typeof lock.startedAt === 'string'
      ? lock.startedAt
      : new Date(0).toISOString();

  return {
    owner: lock.owner,
    scope: lock.scope,
    device:
      typeof lock.device === 'string' && lock.device
        ? lock.device
        : 'legacy-local',
    paths: [...new Set(lock.paths.map(normalizePath))].sort(),
    startedAt: started,
    updatedAt:
      typeof lock.updatedAt === 'string'
        ? lock.updatedAt
        : started,
  };
}

function normalizeState(state) {
  if (!state || !Array.isArray(state.locks)) {
    throw new Error('Malformed lock state');
  }

  return {
    version: 2,
    locks: state.locks.map(normalizeLock),
  };
}

function readLocal() {
  if (!fs.existsSync(LOCAL_FILE)) {
    return { version: 2, locks: [] };
  }

  try {
    return normalizeState(
      JSON.parse(fs.readFileSync(LOCAL_FILE, 'utf8'))
    );
  } catch (error) {
    throw new Error(`Invalid .work-locks.json: ${error.message}`);
  }
}

function writeLocal(state) {
  const tmp = `${LOCAL_FILE}.tmp-${process.pid}`;

  fs.writeFileSync(
    tmp,
    JSON.stringify(normalizeState(state), null, 2) + '\n'
  );

  fs.renameSync(tmp, LOCAL_FILE);
}

function device(required = true) {
  if (!fs.existsSync(DEVICE_FILE)) {
    if (!required) return null;

    throw new Error(
      'Device identity missing. Run: npm run lock:device -- <device-name>'
    );
  }

  const value = fs.readFileSync(DEVICE_FILE, 'utf8').trim();

  if (!/^[A-Za-z0-9._-]{2,64}$/.test(value)) {
    throw new Error('Invalid .work-device identity');
  }

  return value;
}

function setDevice(value) {
  if (!/^[A-Za-z0-9._-]{2,64}$/.test(value || '')) {
    throw new Error('Invalid device name');
  }

  fs.writeFileSync(DEVICE_FILE, `${value}\n`);
  console.log(`DEVICE=${value}`);
}

function overlapPath(a, b) {
  return (
    a === b ||
    a.startsWith(`${b}/`) ||
    b.startsWith(`${a}/`)
  );
}

function overlapLock(lock, requested) {
  return lock.paths.some((a) =>
    requested.some((b) => overlapPath(a, b))
  );
}

function stale(lock) {
  const t = Date.parse(lock.updatedAt);

  return (
    Number.isFinite(t) &&
    Date.now() - t > STALE_HOURS * 3600000
  );
}

function remoteState({ allowMissing = false } = {}) {
  const fetch = git(
    ['fetch', '--quiet', REMOTE, BRANCH],
    { allowFail: true }
  );

  if (fetch.status !== 0) {
    const detail = `${fetch.stderr || ''} ${fetch.stdout || ''}`;

    if (
      allowMissing &&
      /couldn't find remote ref|remote ref does not exist|not found/i.test(
        detail
      )
    ) {
      return {
        exists: false,
        oid: null,
        state: { version: 2, locks: [] },
      };
    }

    throw new Error(
      `Cannot read remote lock branch ${REMOTE}/${BRANCH}. Failing closed.`
    );
  }

  const oid = git(['rev-parse', 'FETCH_HEAD']).stdout.trim();

  const show = git(
    ['show', `${oid}:locks.json`],
    { allowFail: true }
  );

  if (show.status !== 0) {
    throw new Error(`${BRANCH} is missing locks.json`);
  }

  let parsed;

  try {
    parsed = JSON.parse(show.stdout);
  } catch {
    throw new Error(`${BRANCH}/locks.json contains invalid JSON`);
  }

  return {
    exists: true,
    oid,
    state: normalizeState(parsed),
  };
}

function createStateCommit(state, parent = null) {
  const payload =
    JSON.stringify(normalizeState(state), null, 2) + '\n';

  const blob = git(
    ['hash-object', '-w', '--stdin'],
    { input: payload }
  ).stdout.trim();

  const tree = git(
    ['mktree'],
    { input: `100644 blob ${blob}\tlocks.json\n` }
  ).stdout.trim();

  const args = ['commit-tree', tree];

  if (parent) args.push('-p', parent);

  args.push(
    '-m',
    `work-locks: update ${new Date().toISOString()}`
  );

  return git(args, {
    env: {
      GIT_AUTHOR_NAME: 'Work Lock',
      GIT_AUTHOR_EMAIL: 'work-lock@local',
      GIT_COMMITTER_NAME: 'Work Lock',
      GIT_COMMITTER_EMAIL: 'work-lock@local',
    },
  }).stdout.trim();
}

function initRemote() {
  const current = remoteState({ allowMissing: true });

  if (current.exists) {
    console.log(`REMOTE_BRANCH=${BRANCH}`);
    console.log('REMOTE_INIT=ALREADY_EXISTS');
    return;
  }

  const commit = createStateCommit({
    version: 2,
    locks: [],
  });

  const push = git(
    ['push', '--quiet', REMOTE, `${commit}:${REMOTE_REF}`],
    { allowFail: true }
  );

  if (push.status !== 0) {
    throw new Error(
      'Remote branch creation failed. Another device may have created it.'
    );
  }

  console.log(`REMOTE_BRANCH=${BRANCH}`);
  console.log('REMOTE_INIT=CREATED');
}

function writeRemote(state, expectedOid) {
  const commit = createStateCommit(state, expectedOid);

  const push = git(
    [
      'push',
      '--quiet',
      `--force-with-lease=${REMOTE_REF}:${expectedOid}`,
      REMOTE,
      `${commit}:${REMOTE_REF}`,
    ],
    { allowFail: true }
  );

  if (push.status !== 0) {
    throw new Error(
      'REMOTE_LOCK_RACE: remote state changed. Check again.'
    );
  }
}

function combined(local, remote) {
  const map = new Map();

  for (const [source, locks] of [
    ['LOCAL', local],
    ['REMOTE', remote],
  ]) {
    for (const lock of locks) {
      const key = [
        lock.owner,
        lock.scope,
        lock.device,
        ...lock.paths,
      ].join('|');

      if (map.has(key)) {
        map.get(key).source = 'BOTH';
      } else {
        map.set(key, { ...lock, source });
      }
    }
  }

  return [...map.values()];
}

function list() {
  const local = readLocal();
  const remote = remoteState();

  const locks = combined(local.locks, remote.state.locks);

  if (locks.length === 0) {
    console.log('No active work locks');
    return;
  }

  for (const lock of locks) {
    console.log(`${stale(lock) ? 'STALE' : 'ACTIVE'} ${lock.source}`);
    console.log(`  Owner : ${lock.owner}`);
    console.log(`  Device: ${lock.device}`);
    console.log(`  Scope : ${lock.scope}`);
    console.log(`  Paths : ${lock.paths.join(', ')}`);
  }
}

function check(rawPaths) {
  const requested = rawPaths.map(normalizePath);

  if (requested.length === 0) {
    throw new Error('lock:check requires at least one path');
  }

  const local = readLocal();
  const remote = remoteState();

  const conflicts = combined(
    local.locks,
    remote.state.locks
  ).filter((lock) => overlapLock(lock, requested));

  if (conflicts.length === 0) {
    console.log('FREE');
    return;
  }

  for (const lock of conflicts) {
    console.log(
      `${stale(lock) ? 'STALE' : 'ACTIVE'} ${lock.source}: ` +
      `${lock.owner}@${lock.device} / ${lock.scope}`
    );
  }

  process.exitCode = 2;
}

function mutex(fn) {
  try {
    fs.mkdirSync(MUTEX_DIR);
  } catch (error) {
    if (error?.code === 'EEXIST') {
      throw new Error(
        'Another local lock command is already running'
      );
    }
    throw error;
  }

  try {
    fn();
  } finally {
    fs.rmSync(MUTEX_DIR, {
      recursive: true,
      force: true,
    });
  }
}

function add(owner, scope, rawPaths) {
  if (!owner || !scope || rawPaths.length === 0) {
    throw new Error(
      'Usage: lock:add -- <owner> <scope> <path...>'
    );
  }

  const currentDevice = device();
  const requested = [
    ...new Set(rawPaths.map(normalizePath)),
  ].sort();

  mutex(() => {
    const local = readLocal();
    const remote = remoteState();

    const conflicts = combined(
      local.locks,
      remote.state.locks
    ).filter((lock) => {
      const mine =
        lock.owner === owner &&
        lock.scope === scope &&
        (
          lock.device === currentDevice ||
          lock.device === 'legacy-local'
        );

      return !mine && overlapLock(lock, requested);
    });

    if (conflicts.length > 0) {
      for (const lock of conflicts) {
        console.error(
          `BLOCKED: ${lock.owner}@${lock.device} / ${lock.scope}`
        );
      }
      throw new Error('Overlapping lock exists');
    }

    const now = new Date().toISOString();

    const existingRemote = remote.state.locks.find(
      (lock) =>
        lock.owner === owner &&
        lock.scope === scope &&
        lock.device === currentDevice
    );

    const paths = [
      ...new Set([
        ...(existingRemote?.paths || []),
        ...requested,
      ]),
    ].sort();

    const newRemote = remote.state.locks.filter(
      (lock) =>
        !(
          lock.owner === owner &&
          lock.scope === scope &&
          lock.device === currentDevice
        )
    );

    newRemote.push({
      owner,
      scope,
      device: currentDevice,
      paths,
      startedAt: existingRemote?.startedAt || now,
      updatedAt: now,
    });

    writeRemote(
      { version: 2, locks: newRemote },
      remote.oid
    );

    const existingLocal = local.locks.find(
      (lock) =>
        lock.owner === owner &&
        lock.scope === scope &&
        (
          lock.device === currentDevice ||
          lock.device === 'legacy-local'
        )
    );

    const newLocal = local.locks.filter(
      (lock) =>
        !(
          lock.owner === owner &&
          lock.scope === scope &&
          (
            lock.device === currentDevice ||
            lock.device === 'legacy-local'
          )
        )
    );

    newLocal.push({
      owner,
      scope,
      device: currentDevice,
      paths: [
        ...new Set([
          ...(existingLocal?.paths || []),
          ...requested,
        ]),
      ].sort(),
      startedAt: existingLocal?.startedAt || now,
      updatedAt: now,
    });

    writeLocal({
      version: 2,
      locks: newLocal,
    });

    console.log('LOCK_ACQUIRED');
    console.log(`OWNER=${owner}`);
    console.log(`DEVICE=${currentDevice}`);
    console.log(`SCOPE=${scope}`);
  });
}

function remove(owner, scope) {
  if (!owner || !scope) {
    throw new Error(
      'Usage: lock:remove -- <owner> <scope>'
    );
  }

  const currentDevice = device();

  mutex(() => {
    const local = readLocal();
    const remote = remoteState();

    const remoteMatches = remote.state.locks.filter(
      (lock) =>
        lock.owner === owner &&
        lock.scope === scope &&
        lock.device === currentDevice
    );

    if (remoteMatches.length > 0) {
      writeRemote(
        {
          version: 2,
          locks: remote.state.locks.filter(
            (lock) =>
              !(
                lock.owner === owner &&
                lock.scope === scope &&
                lock.device === currentDevice
              )
          ),
        },
        remote.oid
      );
    }

    const localMatches = local.locks.filter(
      (lock) =>
        lock.owner === owner &&
        lock.scope === scope &&
        (
          lock.device === currentDevice ||
          lock.device === 'legacy-local'
        )
    );

    if (
      remoteMatches.length === 0 &&
      localMatches.length === 0
    ) {
      throw new Error(
        `No owned lock for ${owner} / ${scope}`
      );
    }

    writeLocal({
      version: 2,
      locks: local.locks.filter(
        (lock) =>
          !(
            lock.owner === owner &&
            lock.scope === scope &&
            (
              lock.device === currentDevice ||
              lock.device === 'legacy-local'
            )
          )
      ),
    });

    console.log('LOCK_RELEASED');
    console.log(`OWNER=${owner}`);
    console.log(`DEVICE=${currentDevice}`);
    console.log(`SCOPE=${scope}`);
  });
}

function status() {
  const remote = remoteState({ allowMissing: true });

  console.log(`REMOTE=${REMOTE}`);
  console.log(`REMOTE_BRANCH=${BRANCH}`);
  console.log(`REMOTE_EXISTS=${remote.exists ? 'YES' : 'NO'}`);

  if (remote.exists) {
    console.log(`REMOTE_OID=${remote.oid}`);
    console.log(
      `REMOTE_LOCK_COUNT=${remote.state.locks.length}`
    );
  }
}

const [command, ...args] = process.argv.slice(2);

try {
  switch (command) {
    case 'list':
      list();
      break;

    case 'check':
      check(args);
      break;

    case 'add': {
      const [owner, scope, ...paths] = args;
      add(owner, scope, paths);
      break;
    }

    case 'remove': {
      const [owner, scope] = args;
      remove(owner, scope);
      break;
    }

    case 'device':
      setDevice(args[0]);
      break;

    case 'remote:init':
      initRemote();
      break;

    case 'remote:status':
      status();
      break;

    default:
      throw new Error(`Unknown lock command: ${command || '(none)'}`);
  }
} catch (error) {
  console.error(`ERROR: ${error.message}`);
  process.exitCode = 1;
}
