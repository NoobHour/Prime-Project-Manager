const { test } = require('node:test');
const assert = require('node:assert/strict');
const { DataSource } = require('typeorm');
const {
  PlanningFields1790700000000,
} = require('../dist/api/libs/shared/api/config/src/lib/migrations/planning-fields');
const { JobCalendar1790800000000 } = require('../dist/api/libs/shared/api/config/src/lib/migrations/job-calendar');
const { JobDiscussionsFileTags1790900000000 } = require('../dist/api/libs/shared/api/config/src/lib/migrations/job-discussions-file-tags');

/** Accepts no input; verifies general messages and file bytes survive, legacy folders become tags, and retrying preserves edited tags. */
test('discussion and tag migration preserves history, bytes and later tag edits', async () => {
  const db = new DataSource({ type: 'sqljs', entities: [] });
  await db.initialize();
  try {
    await db.query('CREATE TABLE comment (id text PRIMARY KEY, customerSlug text, body text)');
    await db.query("INSERT INTO comment VALUES ('message','customer','Existing update')");
    await db.query('CREATE TABLE filesys (id text PRIMARY KEY, currentDir text, content blob)');
    await db.query("INSERT INTO filesys VALUES ('file','Quotes/2026',X'010203')");
    const runner = db.createQueryRunner();
    const migration = new JobDiscussionsFileTags1790900000000();
    await migration.up(runner);
    const message = (await db.query('SELECT * FROM comment'))[0];
    assert.equal(message.jobSlug, '');
    assert.equal(message.body, 'Existing update');
    assert.deepEqual(JSON.parse((await db.query('SELECT tags FROM filesys'))[0].tags), ['quotes/2026']);
    assert.equal((await db.query('SELECT hex(content) AS bytes FROM filesys'))[0].bytes, '010203');
    await db.query('UPDATE filesys SET tags=?', [JSON.stringify(['new-tag'])]);
    await migration.up(runner);
    assert.deepEqual(JSON.parse((await db.query('SELECT tags FROM filesys'))[0].tags), ['new-tag']);
    await assert.rejects(() => migration.down(runner), /backup/);
  } finally { await db.destroy(); }
});

/** Accepts no input; verifies old customer appointments survive the job association migration and retries preserve new associations. */
test('job calendar migration preserves existing appointments and job associations', async () => {
  const db = new DataSource({ type: 'sqljs', entities: [] });
  await db.initialize();
  try {
    await db.query('CREATE TABLE calendar (id text PRIMARY KEY, customerSlug text, subject text)');
    await db.query("INSERT INTO calendar VALUES ('visit', 'customer', 'Existing visit')");
    const runner = db.createQueryRunner();
    const migration = new JobCalendar1790800000000();
    await migration.up(runner);
    const row = (await db.query('SELECT * FROM calendar'))[0];
    assert.equal(row.subject, 'Existing visit');
    assert.equal(row.jobSlug, '');
    await db.query("UPDATE calendar SET jobSlug='job' WHERE id='visit'");
    await migration.up(runner);
    assert.equal((await db.query('SELECT jobSlug FROM calendar'))[0].jobSlug, 'job');
    assert.ok((await runner.getTable('calendar')).indices.some((i) => i.name === 'IDX_calendar_customer_job'));
    await assert.rejects(() => migration.down(runner), /backup/);
  } finally { await db.destroy(); }
});
/** Accepts no input; proves the planning migration preserves old rows and can be safely retried. */
test('planning migration preserves legacy rows and adds missing fields', async () => {
  const db = new DataSource({ type: 'sqljs', entities: [] });
  await db.initialize();
  try {
    await db.query('CREATE TABLE job (id text PRIMARY KEY, name text)');
    await db.query('CREATE TABLE user (id text PRIMARY KEY, username text)');
    await db.query("INSERT INTO job VALUES ('j1','Existing roof job')");
    await db.query("INSERT INTO user VALUES ('u1','Existing colleague')");
    const runner = db.createQueryRunner();
    const migration = new PlanningFields1790700000000();
    await runner.startTransaction();
    await migration.up(runner);
    await runner.commitTransaction();
    await migration.up(runner);
    const jobs = await db.query('SELECT * FROM job');
    assert.equal(jobs[0].name, 'Existing roof job');
    assert.equal(jobs[0].priority, 'normal');
    assert.deepEqual(JSON.parse(jobs[0].taskList), []);
    assert.equal(
      (await db.query('SELECT * FROM user'))[0].username,
      'Existing colleague',
    );
    assert.ok(
      (await runner.getTable('job')).indices.some(
        (i) => i.name === 'IDX_job_assignee_due',
      ),
    );
    await assert.rejects(() => migration.down(runner), /backup/);
  } finally {
    await db.destroy();
  }
});
