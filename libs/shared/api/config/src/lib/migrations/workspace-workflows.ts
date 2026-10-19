import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';
import { cpSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { dirname, resolve, parse, join } from 'node:path';

/** Additive workspace metadata preserves existing record identities, versions and attachment bytes. */
export class WorkspaceWorkflows1792200000000 implements MigrationInterface {
  name = 'WorkspaceWorkflows1792200000000';
  /** Accepts a migration runner; adds missing workflow storage without reconciling historical job states. */
  async up(runner: QueryRunner) {
    const location = (runner.connection.options as any).location;
    if (location && existsSync(location) && !(await runner.hasColumn('job', 'workKind')) && !(await runner.hasTable('workspace_settings'))) {
      const directory = dirname(resolve(location));
      if (directory === parse(directory).root) throw new Error('Move the database into a dedicated data directory before upgrading.');
      // Keep backups within the writable data mount: Docker deliberately makes the surrounding filesystem read-only.
      // Snapshot all runtime files before workflow DDL, excluding only this reserved directory of older backup copies.
      const entries = readdirSync(directory).filter((name) => name !== '.ppm-workflow-backups');
      const backup = join(directory, '.ppm-workflow-backups', 'before-workflows-' + Date.now());
      mkdirSync(backup, { recursive: true });
      for (const name of entries) cpSync(join(directory, name), join(backup, name), { recursive: true, errorOnExist: true, force: false });
    }
    if (await runner.hasTable('job')) {
      for (const [name, defaultValue] of [['workKind', "'customer'"], ['labels', "'[]'"]])
        if (!(await runner.hasColumn('job', name))) await runner.addColumn('job', new TableColumn({ name, type: 'text', default: defaultValue }));
    }
    await runner.query(`CREATE TABLE IF NOT EXISTS workspace_settings (id INTEGER PRIMARY KEY CHECK(id=1), timezone TEXT NOT NULL DEFAULT '', terminology TEXT NOT NULL DEFAULT 'jobs', version INTEGER NOT NULL DEFAULT 1)`);
    await runner.query(`INSERT OR IGNORE INTO workspace_settings(id) VALUES(1)`);
    await runner.query(`CREATE TABLE IF NOT EXISTS work_template (id TEXT PRIMARY KEY, name TEXT NOT NULL, body TEXT NOT NULL, priority TEXT NOT NULL, checklist TEXT NOT NULL, dueOffset INTEGER, version INTEGER NOT NULL DEFAULT 1)`);
    // Fixed IDs seed editable examples once; rerunning a migration never overwrites a user's edits.
    for (const [id, name, titles, offset] of [
      ['service', 'Service visit', ['Confirm appointment', 'Inspect site', 'Share findings'], 1],
      ['maintenance', 'Maintenance job', ['Inspect equipment', 'Perform maintenance', 'Record checks'], 7],
      ['internal', 'Internal project', ['Define outcome', 'Agree next steps', 'Review completion'], 14],
      ['event', 'Event', ['Confirm venue', 'Prepare materials', 'Review event'], 30],
    ] as const) await runner.query('INSERT OR IGNORE INTO work_template(id,name,body,priority,checklist,dueOffset) VALUES(?,?,?,?,?,?)', [id, name, '', 'normal', JSON.stringify(titles), offset]);
    await runner.query(`CREATE TABLE IF NOT EXISTS saved_view (id TEXT PRIMARY KEY, userId TEXT NOT NULL, name TEXT NOT NULL, query TEXT NOT NULL, UNIQUE(userId,name))`);
    await runner.query(`CREATE TABLE IF NOT EXISTS work_event (sequence INTEGER PRIMARY KEY AUTOINCREMENT, jobSlug TEXT NOT NULL, actorId TEXT NOT NULL, kind TEXT NOT NULL, beforeValue TEXT NOT NULL, afterValue TEXT NOT NULL, messageId TEXT NOT NULL DEFAULT '', recipientId TEXT NOT NULL DEFAULT '', createdAt TEXT NOT NULL)`);
    await runner.query(`CREATE INDEX IF NOT EXISTS IDX_work_event_job_sequence ON work_event(jobSlug,sequence)`);
    await runner.query(`CREATE TABLE IF NOT EXISTS job_follow (userId TEXT NOT NULL, jobSlug TEXT NOT NULL, PRIMARY KEY(userId,jobSlug))`);
    await runner.query(`CREATE TABLE IF NOT EXISTS update_read (userId TEXT NOT NULL, jobSlug TEXT NOT NULL, sequence INTEGER NOT NULL, PRIMARY KEY(userId,jobSlug))`);
    if (await runner.hasTable('calendar')) await runner.query(`CREATE INDEX IF NOT EXISTS IDX_calendar_range ON calendar(start,end)`);
  }
  /** Accepts a rollback runner; refuses destructive rollback so users restore a verified full backup instead. */
  async down(_runner: QueryRunner) { throw new Error('Restore a verified backup to roll back workspace workflows.'); }
}
