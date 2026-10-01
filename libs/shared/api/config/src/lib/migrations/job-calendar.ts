import { MigrationInterface, QueryRunner, TableColumn, TableIndex } from 'typeorm';

/** Existing appointments remain customer-wide until explicitly attached to a job. */
export class JobCalendar1790800000000 implements MigrationInterface {
  name = 'JobCalendar1790800000000';
  /** Accepts a database runner; adds the optional job reference and lookup index without rewriting appointments. */
  async up(runner: QueryRunner) {
    if (!(await runner.hasTable('calendar'))) return;
    if (!(await runner.hasColumn('calendar', 'jobSlug')))
      await runner.addColumn('calendar', new TableColumn({ name: 'jobSlug', type: 'text', default: "''" }));
    const table = await runner.getTable('calendar');
    if (!table.indices.some((index) => index.name === 'IDX_calendar_customer_job'))
      await runner.createIndex('calendar', new TableIndex({ name: 'IDX_calendar_customer_job', columnNames: ['customerSlug', 'jobSlug'] }));
  }
  /** Accepts a rollback runner; refuses to erase appointment associations and directs recovery to a verified backup. */
  async down(_runner: QueryRunner) {
    throw new Error('Restore a verified backup to roll back job calendar associations.');
  }
}
