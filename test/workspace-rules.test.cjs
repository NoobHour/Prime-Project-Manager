const { test } = require('node:test');
const assert = require('node:assert/strict');
const { DataSource } = require('typeorm');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { createHash } = require('node:crypto');
const { jobLifecycle, storedLane } = require('../dist/api/libs/customer/api/handlers/src/lib/job-lifecycle');
const time = require('../dist/api/libs/shared/common/src/lib/workspace-time');
const { WorkspaceWorkflows1792200000000 } = require('../dist/api/libs/shared/api/config/src/lib/migrations/workspace-workflows');

/** Accepts no input; verifies contradictory payloads and historical states require deliberate reconciliation. */
test('one lifecycle derives flags and refuses ambiguous historical states', () => {
  assert.deepEqual(jobLifecycle({ lane: 'complete' }), { lane: 'complete', isActive: false, isComplete: true, isArchived: false });
  assert.throws(() => jobLifecycle({ lane: 'planned', isActive: true }));
  assert.throws(() => jobLifecycle({ lane: 'active', isComplete: 'false' }));
  assert.throws(() => storedLane({ lane: 'complete', isActive: true, isComplete: true }));
  assert.equal(storedLane({ lane: '', isComplete: true }), 'complete');
  assert.equal(jobLifecycle({ lane: 'planned' }, { lane: 'bad', isComplete: true }).lane, 'planned');
});

/** Accepts no input; upgrades a disk fixture, verifies the full backup, then opens a restored copy with its original schema. */
test('workflow upgrade backs up the full data directory and its copy restores independently', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ppm-workflow-restore-'));
  const directory = path.join(root, 'data');
  fs.mkdirSync(path.join(directory, 'nested'), { recursive: true });
  fs.writeFileSync(path.join(directory, 'nested', 'fixture.txt'), 'Fictional workspace configuration');
  const location = path.join(directory, 'workspace.sqlite');
  const db = new DataSource({ type: 'sqljs', location, autoSave: false, entities: [] });
  await db.initialize();
  let restored;
  try {
    await db.query('CREATE TABLE job(id text PRIMARY KEY,jobSlug text,customerSlug text,lane text,isActive integer,isComplete integer,isArchived integer,version integer,deletedDate text)');
    await db.query("INSERT INTO job VALUES('record','legacy','parent','active',1,1,0,7,NULL)");
    await db.query('CREATE TABLE customer(slug text PRIMARY KEY)');
    await db.query("INSERT INTO customer VALUES('parent')");
    await db.driver.save();
    const before = fs.readFileSync(location);
    await new WorkspaceWorkflows1792200000000().up(db.createQueryRunner());
    await db.driver.save();
    const backupRoot = path.join(directory, '.ppm-workflow-backups');
    const backup = fs.readdirSync(backupRoot).find((entry) => entry.startsWith('before-workflows-'));
    assert.ok(backup);
    assert.deepEqual(fs.readFileSync(path.join(backupRoot, backup, 'workspace.sqlite')), before);
    assert.equal(fs.readFileSync(path.join(backupRoot, backup, 'nested', 'fixture.txt'), 'utf8'), 'Fictional workspace configuration');
    const restoreDirectory = path.join(root, 'restored');
    fs.cpSync(path.join(backupRoot, backup), restoreDirectory, { recursive: true });
    restored = new DataSource({ type: 'sqljs', location: path.join(restoreDirectory, 'workspace.sqlite'), autoSave: false, entities: [] });
    await restored.initialize();
    assert.equal(await restored.createQueryRunner().hasColumn('job', 'workKind'), false);
    assert.equal((await restored.query('SELECT version FROM job'))[0].version, 7);
    const { audit } = require('../tools/audit-workflows.cjs');
    const digest = createHash('sha256').update(fs.readFileSync(location)).digest('hex');
    const report = await audit(location);
    assert.equal(report.conflicts.length, 1);
    assert.equal(report.brokenRelationships.length, 0);
    assert.equal(createHash('sha256').update(fs.readFileSync(location)).digest('hex'), digest);
  } finally {
    if (restored?.isInitialized) await restored.destroy();
    await db.destroy();
    // This generated root contains only this test's fixtures and restored copies.
    fs.rmSync(root, { recursive: true, force: true });
  }
});

/** Accepts no input; verifies date-only arithmetic, workspace midnight, DST gaps, repeated hours and half-hour transitions. */
test('workspace time converts instants without silently shifting DST wall times', () => {
  assert.equal(time.wallTime('2026-10-17T02:00:00Z', 'America/Chicago'), '2026-10-16T21:00');
  assert.equal(time.shiftDate('2028-02-28', 1), '2028-02-29');
  assert.throws(() => time.wallToInstant('2026-03-08T02:30', 'America/Chicago'), /does not exist/);
  assert.throws(() => time.wallToInstant('2026-11-01T01:30', 'America/Chicago'), /occurs twice/);
  assert.equal(time.wallToInstant('2026-11-01T01:30', 'America/Chicago', 'earlier'), '2026-11-01T06:30:00.000Z');
  assert.equal(time.wallToInstant('2026-11-01T01:30', 'America/Chicago', 'later'), '2026-11-01T07:30:00.000Z');
  assert.throws(() => time.wallToInstant('2026-10-04T02:15', 'Australia/Lord_Howe'), /does not exist/);
  assert.throws(() => time.wallToInstant('2026-02-30T10:00', 'UTC'), /valid/);
});

/** Accepts no input; runs the actual date-fns adapter primitives in different browser/server host zones. */
test('calendar wall coordinates survive date-fns operations in unrelated host timezones', () => {
  const script = `const assert=require('node:assert/strict'); const {calendarDate}=require('./dist/api/libs/shared/common/src/lib/workspace-time'); const {startOfDay,addDays,addHours}=require('date-fns'); const value=calendarDate('2026-03-08T02:30:00Z','UTC'); assert.equal(value.getHours(),2); assert.equal(value.getMinutes(),30); assert.equal(startOfDay(value).getHours(),0); assert.equal(addHours(value,1).getHours(),3); assert.equal(addDays(value,1).getDate(),9);`;
  for (const TZ of ['America/Los_Angeles', 'Asia/Tokyo', 'UTC']) {
    const result = spawnSync(process.execPath, ['-e', script], { cwd: require('node:path').resolve(__dirname, '..'), env: { ...process.env, TZ }, encoding: 'utf8', windowsHide: true });
    assert.equal(result.status, 0, result.stderr);
  }
});

/** Accepts no input; rehearses an additive upgrade with archived/ambiguous jobs, resource bytes and later user edits. */
test('workflow migration preserves identities, versions, timestamps, bytes and edited templates on retry', async () => {
  const db = new DataSource({ type: 'sqljs', entities: [] });
  await db.initialize();
  try {
    await db.query('CREATE TABLE job(id text PRIMARY KEY, customerSlug text, lane text, isActive integer, isComplete integer, isArchived integer, version integer)');
    await db.query("INSERT INTO job VALUES('legacy','parent','active',1,1,1,7),('orphan','','planned',0,0,0,4)");
    await db.query('CREATE TABLE calendar(id text PRIMARY KEY,start text,end text,jobSlug text,version integer)');
    await db.query("INSERT INTO calendar VALUES('visit','2026-11-01T06:30:00Z','2026-11-01T07:30:00Z','legacy',9)");
    await db.query('CREATE TABLE filesys(id text PRIMARY KEY,content blob,jobSlug text,version integer)');
    await db.query("INSERT INTO filesys VALUES('file',X'01020304','legacy',8)");
    const before = await db.query('SELECT * FROM job ORDER BY id');
    const calendar = await db.query('SELECT * FROM calendar');
    const files = await db.query('SELECT id,hex(content) AS bytes,jobSlug,version FROM filesys');
    const migration = new WorkspaceWorkflows1792200000000(), runner = db.createQueryRunner();
    await migration.up(runner);
    assert.deepEqual(await db.query('SELECT id,customerSlug,lane,isActive,isComplete,isArchived,version FROM job ORDER BY id'), before);
    assert.deepEqual(await db.query('SELECT * FROM calendar'), calendar);
    assert.deepEqual(await db.query('SELECT id,hex(content) AS bytes,jobSlug,version FROM filesys'), files);
    assert.equal((await db.query("SELECT workKind FROM job WHERE id='orphan'"))[0].workKind, 'customer');
    assert.equal((await db.query('SELECT timezone FROM workspace_settings'))[0].timezone, '');
    await db.query("UPDATE work_template SET name='Edited example',version=9 WHERE id='service'");
    await db.query("UPDATE job SET labels='[\"edited\"]' WHERE id='legacy'");
    await migration.up(runner);
    assert.equal((await db.query("SELECT name FROM work_template WHERE id='service'"))[0].name, 'Edited example');
    assert.equal((await db.query("SELECT labels FROM job WHERE id='legacy'"))[0].labels, '["edited"]');
    await assert.rejects(() => migration.down(runner), /backup/);
  } finally { await db.destroy(); }
});
