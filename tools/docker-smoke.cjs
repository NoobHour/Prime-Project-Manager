const { execFileSync } = require('node:child_process');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const net = require('node:net');
const http = require('node:http');
const { randomUUID } = require('node:crypto');
const image = process.argv[2] || 'ppm:local';
const suffix = randomUUID().slice(0, 8);
const container = 'ppm-smoke-' + suffix;
const volumes = ['ppm-smoke-data-' + suffix, 'ppm-smoke-restore-' + suffix];
const createdVolumes = [];
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'ppm-docker-smoke-'));
let running = false;
let origin, cookie, token;

/** Accepts Docker arguments; returns stdout and throws on a failed command, without a shell. */
function docker(...args) {
  return execFileSync('docker', args, {
    encoding: 'utf8',
    windowsHide: true,
    timeout: 120000,
  });
}
/** Accepts no input; returns an available local port for this isolated test. */
async function availablePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      server.close(() => resolve(port));
    });
  });
}
/** Accepts a test volume and port; starts a hardened container and resolves after its API is ready. */
async function start(volume, port) {
  origin = 'http://localhost:' + port;
  docker(
    'run',
    '-d',
    '--name',
    container,
    '--init',
    '--read-only',
    '--cap-drop=ALL',
    '--security-opt=no-new-privileges',
    '--tmpfs',
    '/tmp:size=16m,mode=1777',
    '-p',
    '127.0.0.1:' + port + ':3333',
    '-e',
    'MGMT_ORIGIN=' + origin,
    '--mount',
    'type=volume,source=' + volume + ',target=/data',
    image,
  );
  running = true;
  for (let i = 0; i < 100; i++) {
    try {
      const response = await fetch(origin + '/api/health');
      if (response.ok) return;
    } catch {
      /* The socket is unavailable until Nest has finished database initialization. */
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error('Container did not become ready');
}
/** Accepts no input; stops and removes only the uniquely named test container, preserving its volume. */
function stop() {
  if (!running) return;
  docker('stop', '-t', '30', container);
  docker('rm', container);
  running = false;
}
/** Accepts method, API path, optional JSON body and headers; returns the authenticated HTTP response. */
function request(method, route, body, headers = {}) {
  return fetch(origin + '/api' + route, {
    method,
    headers: {
      Origin: origin,
      ...(cookie ? { Cookie: cookie, 'X-CSRF-Token': token } : {}),
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}
/** Accepts a response and expected status; returns JSON after asserting the status without logging credentials. */
async function json(response, status = 200) {
  assert.equal(response.status, status, 'Unexpected HTTP status');
  return response.json();
}
/** Accepts a Host value; returns readiness status using a raw request that preserves that header. */
function readinessStatus(host) {
  return new Promise((resolve, reject) => {
    const probe = http.get(
      origin + '/api/health',
      { headers: { Host: host }, timeout: 4000 },
      (response) => {
        response.resume();
        resolve(response.statusCode);
      },
    );
    probe.on('error', reject);
    probe.on('timeout', () =>
      probe.destroy(new Error('Readiness probe timed out')),
    );
  });
}
/** Accepts no input; verifies the actual image, persistence and a stopped-server backup/restore, then cleans its fixtures. */
async function main() {
  try {
    for (const volume of volumes) {
      docker('volume', 'create', volume);
      createdVolumes.push(volume);
    }
    const port = await availablePort();
    await start(volumes[0], port);
    assert.equal(docker('exec', container, 'id', '-u').trim(), '1000');
    docker('exec', container, 'node', 'tools/healthcheck.cjs');
    const config = JSON.parse(docker('inspect', container))[0];
    assert.equal(config.HostConfig.ReadonlyRootfs, true);
    assert.equal(
      config.HostConfig.PortBindings['3333/tcp'][0].HostIp,
      '127.0.0.1',
    );
    assert.ok(config.HostConfig.CapDrop.includes('ALL'));
    assert.match(await (await fetch(origin)).text(), /Prime Project Manager/);
    await json(await request('GET', '/customers'), 401);
    assert.equal(await readinessStatus('invalid.example'), 403);
    assert.equal((await json(await request('GET', '/setup'))).required, true);
    const code = docker('logs', container).match(
      /First-run setup code: ([a-f0-9]+)/,
    )?.[1];
    assert.ok(code, 'Expected a first-run setup code');
    const response = await request('POST', '/setup', {
      code,
      username: 'Docker Tester',
      email: 'docker@example.test',
      password: 'Docker-Test-Password-2026!',
    });
    const user = await json(response, 201);
    cookie = response.headers.get('set-cookie').split(';')[0];
    token = user.data.token;
    await json(
      await request(
        'POST',
        '/customers',
        { name: 'Blocked origin' },
        { Origin: 'https://invalid.example' },
      ),
      403,
    );
    const customer = (
      await json(
        await request('POST', '/customers', {
          name: 'Container persistence check',
        }),
        201,
      )
    ).data;
    const form = new FormData();
    form.append('file', new Blob(['PPM backup test bytes']), 'proof.txt');
    const upload = await json(
      await fetch(origin + '/api/customers/' + customer.slug + '/files', {
        method: 'POST',
        headers: { Origin: origin, Cookie: cookie, 'X-CSRF-Token': token },
        body: form,
      }),
      201,
    );
    assert.ok(upload.data.id);
    const key = docker(
      'exec',
      container,
      'node',
      '-e',
      "process.stdout.write(require('node:crypto').createHash('sha256').update(require('node:fs').readFileSync('/data/session-key')).digest('hex'))",
    ).trim();
    stop();
    await start(volumes[0], port);
    assert.equal(
      (await json(await request('GET', '/customers/' + customer.slug)))
        .detailData.name,
      customer.name,
    );
    assert.equal((await json(await request('GET', '/setup'))).required, false);
    assert.equal(
      await (
        await request('GET', '/files/' + upload.data.id + '/download')
      ).text(),
      'PPM backup test bytes',
    );
    // Copy a consistent snapshot from a stopped container, including the signing key and file BLOBs.
    docker('stop', '-t', '30', container);
    docker('cp', container + ':/data/.', temporary);
    docker('rm', container);
    running = false;
    docker(
      'create',
      '--name',
      container,
      '--mount',
      'type=volume,source=' + volumes[1] + ',target=/data',
      image,
    );
    running = true;
    docker('cp', temporary + '/.', container + ':/data');
    docker('rm', container);
    running = false;
    docker(
      'run',
      '--rm',
      '--read-only',
      '--cap-drop=ALL',
      '--cap-add=CHOWN',
      '--security-opt=no-new-privileges',
      '--user',
      '0',
      '--mount',
      'type=volume,source=' + volumes[1] + ',target=/data',
      image,
      'chown',
      '-R',
      '1000:1000',
      '/data',
    );
    await start(volumes[1], port);
    assert.equal(
      (await json(await request('GET', '/customers/' + customer.slug)))
        .detailData.name,
      customer.name,
    );
    assert.equal(
      await (
        await request('GET', '/files/' + upload.data.id + '/download')
      ).text(),
      'PPM backup test bytes',
    );
    assert.equal(
      docker(
        'exec',
        container,
        'node',
        '-e',
        "process.stdout.write(require('node:crypto').createHash('sha256').update(require('node:fs').readFileSync('/data/session-key')).digest('hex'))",
      ).trim(),
      key,
    );
    console.log(
      'Docker smoke passed: non-root, read-only, loopback, health, setup, authentication, origin checks, recreated-container persistence, files and backup restore.',
    );
  } finally {
    stop();
    for (const volume of createdVolumes) docker('volume', 'rm', volume);
    if (!temporary.startsWith(path.join(os.tmpdir(), 'ppm-docker-smoke-')))
      throw new Error('Unsafe cleanup path');
    fs.rmSync(temporary, { recursive: true, force: true });
  }
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
