const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { once } = require('node:events');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const root = path.resolve(__dirname, '..');
const origin = 'http://localhost:39619';

/** Accepts a delay in milliseconds; resolves after the polling interval. */
function delay(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

/** Accepts method, API path, body and optional session; returns an HTTP response from the test sandbox. */
function request(method, route, body, session = {}) {
  return fetch(origin + '/api' + route, { method,
    headers: { Origin: origin, 'Content-Type': 'application/json',
      Cookie: session.cookie || '', 'X-CSRF-Token': session.token || '' },
    body: body === undefined ? undefined : JSON.stringify(body) });
}

/** Accepts no input; signs in as the fixture manager and returns its independent cookie and CSRF token. */
async function login() {
  const res = await request('POST', '/users/login', {
    email: 'demo.admin@example.test', password: 'Prime-Demo-2026!' });
  assert.equal(res.status, 201, await res.clone().text());
  const body = await res.json();
  return { cookie: res.headers.get('set-cookie').split(';')[0], token: body.data.token };
}

/** Accepts no input; exercises restrictions, editing, logout isolation and a real timed reset over HTTP. */
test('hosted sandbox protects accounts and resets edits and sessions', { timeout: 100000 }, async () => {
  let logs = '';
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'ppm-sandbox-test-'));
  const child = spawn(process.execPath, ['tools/sandbox.cjs'], { cwd: root,
    windowsHide: true, env: { ...process.env, NODE_ENV: 'production',
      MGMT_HOST: '127.0.0.1', MGMT_PORT: '39619', MGMT_ORIGIN: origin,
      MGMT_SANDBOX_RESET_MINUTES: '1', TEMP: temporary, TMP: temporary, TMPDIR: temporary } });
  // Accepts child output bytes; collects diagnostics for failed assertions. Returns nothing.
  const capture = data => { logs += data.toString(); };
  child.stdout.on('data', capture); child.stderr.on('data', capture);
  try {
    let setup;
    for (let attempt = 0; attempt < 160; attempt++) {
      try { setup = await (await request('GET', '/setup')).json(); if (setup.sandbox) break; } catch {}
      assert.equal(child.exitCode, null, logs);
      await delay(100);
    }
    assert.equal(setup?.sandbox, true, logs);
    assert.equal(setup.required, false);
    const firstReset = setup.resetAt;
    const a = await login(), b = await login();
    const originalJobs = (await (await request('GET', '/jobs', undefined, a)).json()).total;
    for (const [method, route] of [ ['POST', '/users'], ['PUT', '/users'],
      ['PUT', '/staff/anything'], ['POST', '/setup'],
      ['POST', '/customers/anything/files'], ['PUT', '/USERS/'] ]) {
      const res = await request(method, route, {}, a);
      assert.equal(res.status, 403, route + ': ' + await res.text());
    }
    const created = await request('POST', '/customers', { name: 'Reset proof customer', isActive: true, body: '<p>Demo test</p>' }, a);
    assert.equal(created.status, 201, await created.clone().text() + logs);
    const customer = (await created.json()).data;
    const job = await request('POST', '/customers/' + customer.slug + '/jobs', { name: 'Reset proof job' }, a);
    assert.equal(job.status, 201, await job.clone().text());
    assert.equal((await request('POST', '/users/logout', {}, a)).status, 201);
    assert.equal((await request('GET', '/user', undefined, b)).status, 200);
    let reset = false;
    for (let attempt = 0; attempt < 800; attempt++) {
      try {
        const status = await (await request('GET', '/setup')).json();
        if (status.resetAt !== firstReset && status.sandbox) { reset = true; break; }
      } catch {}
      await delay(100);
    }
    assert.equal(reset, true, logs);
    assert.equal((await request('GET', '/user', undefined, b)).status, 401);
    const fresh = await login();
    const list = await (await request('GET', '/customers?search=Reset%20proof', undefined, fresh)).json();
    assert.equal(list.total, 0);
    const jobs = await (await request('GET', '/jobs', undefined, fresh)).json();
    assert.equal(jobs.total, originalJobs);
  } finally {
    // Windows termination does not deliver POSIX signals; kill the test process tree there.
    if (process.platform === 'win32') {
      const killer = spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { windowsHide: true });
      await once(killer, 'exit');
    } else {
      const exited = once(child, 'exit'); child.kill('SIGTERM'); await exited;
    }
    assert.ok(path.resolve(temporary).startsWith(path.join(os.tmpdir(), 'ppm-sandbox-test-')));
    fs.rmSync(temporary, { recursive: true, force: true });
  }
});
