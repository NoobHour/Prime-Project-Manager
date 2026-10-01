const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawnSync } = require('node:child_process');
const initSql = require('sql.js');
/** Accepts a directory and environment overrides; runs the isolated seed-only launcher and returns its result. */
function seed(directory, extra = {}) {
  return spawnSync(process.execPath, ['tools/demo.cjs', '--seed-only'], {
    cwd: path.resolve(__dirname, '..'),
    env: {
      ...process.env,
      NODE_ENV: 'test',
      MGMT_DEMO_DATA_DIR: directory,
      ...extra,
    },
    encoding: 'utf8',
    windowsHide: true,
  });
}
/** Accepts no input; verifies useful fixtures, repeat safety and rejection of production/unmarked databases. */
test('demo seeding is isolated, repeatable and contains useful planning fixtures', async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'prime-demo-test-'));
  try {
    const result = seed(directory);
    assert.equal(result.status, 0, result.stderr);
    const SQL = await initSql();
    const db = new SQL.Database(
      fs.readFileSync(path.join(directory, 'prime.sqlite')),
    );
    assert.equal(db.exec('SELECT count(*) FROM user')[0].values[0][0], 3);
    assert.equal(db.exec('SELECT count(*) FROM job')[0].values[0][0], 16);
    assert.equal(db.exec('SELECT count(*) FROM comment')[0].values[0][0], 62);
    assert.equal(db.exec('SELECT count(*) FROM filesys')[0].values[0][0], 6);
    assert.equal(db.exec("SELECT count(*) FROM calendar WHERE jobSlug<>''")[0].values[0][0], 8);
    assert.equal(db.exec("SELECT count(*) FROM filesys WHERE jobSlug<>''")[0].values[0][0], 6);
    assert.equal(
      db.exec(
        "SELECT count(*) FROM job WHERE assigneeId<>'' AND dueDate<>''",
      )[0].values[0][0],
      16,
    );
    db.close();
    const before = fs.readFileSync(path.join(directory, 'prime.sqlite'));
    assert.equal(seed(directory).status, 0);
    assert.deepEqual(
      fs.readFileSync(path.join(directory, 'prime.sqlite')),
      before,
    );
    assert.notEqual(seed(directory, { NODE_ENV: 'production' }).status, 0);
    fs.unlinkSync(path.join(directory, '.prime-demo'));
    assert.notEqual(seed(directory).status, 0);
    assert.deepEqual(
      fs.readFileSync(path.join(directory, 'prime.sqlite')),
      before,
    );
  } finally {
    assert.ok(
      path
        .resolve(directory)
        .startsWith(path.resolve(os.tmpdir()) + path.sep + 'prime-demo-test-'),
    );
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
