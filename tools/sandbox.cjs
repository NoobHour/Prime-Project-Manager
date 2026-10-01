// Disposable portfolio sandbox: only supervisor-created temporary directories are ever removed.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawn } = require('node:child_process');
const { once } = require('node:events');
const root = path.resolve(__dirname, '..');
const minutes = Number(process.env.MGMT_SANDBOX_RESET_MINUTES || 60);
if (!Number.isFinite(minutes) || minutes < 1 || minutes > 1440)
  throw new Error('Reset interval must be between 1 and 1440 minutes.');
const prefix = path.join(os.tmpdir(), 'ppm-sandbox-');
let child, directory, timer, stopping = false;

/** Accepts an owned temporary directory; removes only a verified, marked sandbox directory. Returns nothing. */
function cleanup(target) {
  if (!target) return;
  if (!path.resolve(target).startsWith(prefix) ||
      fs.readFileSync(path.join(target, '.prime-demo'), 'utf8') !== 'prime-demo-v1')
    throw new Error('Refusing to remove an unowned sandbox directory.');
  fs.rmSync(target, { recursive: true, force: true });
}

/** Accepts no input; stops the child before replacing its database. Resolves after process exit. */
async function stopChild() {
  if (!child || child.exitCode !== null || child.signalCode !== null) return;
  const exited = once(child, 'exit');
  child.kill('SIGTERM');
  const force = setTimeout(() => child.kill('SIGKILL'), 10000);
  await exited;
  clearTimeout(force);
}

/** Accepts no input; seeds a fresh fictional database and starts the API. Resolves once spawning succeeds. */
async function startCycle() {
  directory = fs.mkdtempSync(prefix);
  fs.writeFileSync(path.join(directory, '.prime-demo'), 'prime-demo-v1');
  const resetAt = new Date(Date.now() + minutes * 60000).toISOString();
  const env = { ...process.env, MGMT_DEMO: 'true', MGMT_SANDBOX: 'true',
    MGMT_DATA_DIR: directory, MGMT_SANDBOX_RESET_AT: resetAt };
  child = spawn(process.execPath, ['dist/api/apps/api/src/demo-seed.js'],
    { cwd: root, env, stdio: 'inherit', windowsHide: true });
  const [code] = await once(child, 'exit');
  if (stopping) return;
  if (code !== 0) throw new Error('Sandbox seed failed.');
  child = spawn(process.execPath, ['dist/api/apps/api/src/main.js'],
    { cwd: root, env, stdio: 'inherit', windowsHide: true });
  await once(child, 'spawn');
  child.once('exit', unexpectedExit);
  console.log('Shared sandbox resets at ' + resetAt);
  timer = setTimeout(resetCycle, minutes * 60000);
}

/** Accepts no input; replaces expired fictional data after stopping the server. Resolves after restart. */
async function resetCycle() {
  try {
    child.removeListener('exit', unexpectedExit);
    await stopChild();
    cleanup(directory);
    directory = undefined;
    if (!stopping) await startCycle();
  } catch (error) { await fail(error); }
}

/** Accepts exit code/signal; shuts down the supervisor on an unexpected API exit. Returns nothing. */
function unexpectedExit(code, signal) {
  void fail(new Error('Sandbox API exited: ' + (code ?? signal)));
}

/** Accepts no input; cancels resets, stops the child and removes its owned data. Resolves after cleanup. */
async function shutdown() {
  stopping = true;
  clearTimeout(timer);
  if (child) child.removeListener('exit', unexpectedExit);
  await stopChild();
  cleanup(directory);
  directory = undefined;
}

/** Accepts a startup/runtime error; reports failure and safely stops the sandbox. Resolves after cleanup. */
async function fail(error) {
  console.error(error);
  process.exitCode = 1;
  await shutdown();
}
process.once('SIGTERM', shutdown);
process.once('SIGINT', shutdown);
startCycle().catch(fail);
