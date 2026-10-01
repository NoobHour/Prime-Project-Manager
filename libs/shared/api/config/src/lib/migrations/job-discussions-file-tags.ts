import { MigrationInterface, QueryRunner, TableColumn, TableIndex } from 'typeorm';

/** Messages retain their customer history; legacy folder labels become optional tags without moving file bytes. */
export class JobDiscussionsFileTags1790900000000 implements MigrationInterface {
  name = 'JobDiscussionsFileTags1790900000000';
  /** Accepts the migration runner; adds board associations and tags, preserving existing rows and retry safety. */
  async up(runner: QueryRunner) {
    if (await runner.hasTable('comment')) {
      if (!(await runner.hasColumn('comment', 'jobSlug')))
        await runner.addColumn('comment', new TableColumn({ name: 'jobSlug', type: 'text', default: "''" }));
      const table = await runner.getTable('comment');
      if (!table.indices.some((index) => index.name === 'IDX_comment_customer_job'))
        await runner.createIndex('comment', new TableIndex({ name: 'IDX_comment_customer_job', columnNames: ['customerSlug', 'jobSlug'] }));
    }
    if (await runner.hasTable('filesys') && !(await runner.hasColumn('filesys', 'tags'))) {
      await runner.addColumn('filesys', new TableColumn({ name: 'tags', type: 'text', default: "'[]'" }));
      if (await runner.hasColumn('filesys', 'currentDir')) {
        const rows = await runner.query('SELECT id, currentDir FROM filesys');
        for (const row of rows) {
          const label = (row.currentDir || '').normalize('NFC').trim().toLowerCase();
          if (label) await runner.query('UPDATE filesys SET tags=? WHERE id=?', [JSON.stringify([label]), row.id]);
        }
      }
    }
  }
  /** Accepts a rollback runner; refuses to discard tags or board history and requires a verified backup for rollback. */
  async down(_runner: QueryRunner) {
    throw new Error('Restore a verified backup to roll back job discussions and file tags.');
  }
}
