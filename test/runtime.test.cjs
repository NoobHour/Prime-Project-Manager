const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

/** Accepts no input; verifies invalid listening configuration fails before writing any application data. */
test('runtime rejects invalid bind addresses and ports before creating data', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'ppm-runtime-test-'));
  try {
    for (const environment of [
      { MGMT_HOST: 'example.com' },
      { MGMT_PORT: '0' },
      { MGMT_PORT: '65536' },
      { MGMT_PORT: 'invalid' },
    ]) {
      const result = spawnSync(
        process.execPath,
        [
          '-e',
          "require('./dist/api/libs/shared/api/config/src/lib/runtime.js')",
        ],
        {
          cwd: path.resolve(__dirname, '..'),
          encoding: 'utf8',
          windowsHide: true,
          env: {
            ...process.env,
            MGMT_DATA_DIR: path.join(directory, 'data'),
            MGMT_HOST: '127.0.0.1',
            MGMT_PORT: '3333',
            ...environment,
          },
        },
      );
      assert.notEqual(result.status, 0);
      assert.match(result.stderr, /MGMT_HOST must|MGMT_PORT must/);
      assert.equal(fs.existsSync(path.join(directory, 'data')), false);
    }
  } finally {
    assert.ok(
      directory.startsWith(path.join(os.tmpdir(), 'ppm-runtime-test-')),
    );
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
