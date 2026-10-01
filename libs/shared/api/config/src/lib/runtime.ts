import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  openSync,
  fsyncSync,
  closeSync,
  renameSync,
} from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { randomBytes } from 'node:crypto';

export const dataDirectory =
  process.env.MGMT_DATA_DIR ||
  join(process.env.LOCALAPPDATA || homedir(), 'PrimeMgmtOriginal');
const demo = process.env.MGMT_DEMO === 'true';
// Hosted sandboxes still require an explicitly marked fictional database.
const sandbox = process.env.MGMT_SANDBOX === 'true';
if (sandbox && !demo) throw new Error('Sandbox mode requires demo mode.');
const configuredOrigin = process.env.MGMT_ORIGIN || 'http://localhost:3333';
// Containers listen on their own interface; published host ports remain a deployment decision.
const host = process.env.MGMT_HOST || '127.0.0.1';
if (!['127.0.0.1', '0.0.0.0'].includes(host))
  throw new Error('MGMT_HOST must be 127.0.0.1 or 0.0.0.0.');
const port = Number(process.env.MGMT_PORT || 3333);
if (!Number.isInteger(port) || port < 1 || port > 65535)
  throw new Error('MGMT_PORT must be an integer between 1 and 65535.');
if (
  demo &&
  ((!sandbox && (process.env.NODE_ENV === 'production' ||
    host !== '127.0.0.1' ||
    !['localhost', '127.0.0.1'].includes(new URL(configuredOrigin).hostname))) ||
    !existsSync(join(dataDirectory, '.prime-demo')) ||
    readFileSync(join(dataDirectory, '.prime-demo'), 'utf8') !==
      'prime-demo-v1')
)
  throw new Error(
    'Demo mode requires a marked, isolated local database and cannot run in production.',
  );
mkdirSync(dataDirectory, { recursive: true });
const secretPath = join(dataDirectory, 'session-key');
if (!existsSync(secretPath))
  writeFileSync(secretPath, randomBytes(48).toString('hex'), {
    flag: 'wx',
    mode: 0o600,
  });
export const runtime = {
  demo,
  sandbox,
  resetAt: sandbox ? process.env.MGMT_SANDBOX_RESET_AT : undefined,
  cookieName: demo ? 'prime_demo_session' : 'prime_session',
  jwtSecret: readFileSync(secretPath, 'utf8'),
  host,
  port,
  origin: process.env.MGMT_ORIGIN || 'http://localhost:3333',
  setupCode: randomBytes(24).toString('hex'),
  database: join(dataDirectory, 'prime.sqlite'),
};
/** Accepts the exported SQLite bytes; flushes a temporary file before atomically replacing the database. */
export function persistDatabase(bytes: Uint8Array) {
  const temporary = runtime.database + '.tmp';
  const handle = openSync(temporary, 'w', 0o600);
  try {
    writeFileSync(handle, bytes);
    fsyncSync(handle);
  } finally {
    closeSync(handle);
  }
  renameSync(temporary, runtime.database);
}
