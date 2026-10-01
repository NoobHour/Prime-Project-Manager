import {
  MigrationInterface,
  QueryRunner,
  TableColumn,
  TableIndex,
} from 'typeorm';
/** Adds planning fields without synchronizing an existing user's schema. */
export class PlanningFields1790700000000 implements MigrationInterface {
  name = 'PlanningFields1790700000000';
  /** Accepts the database runner; adds only missing planning/profile columns and indexes. */
  async up(runner: QueryRunner) {
    if (await runner.hasTable('job')) {
      for (const [name, defaultValue] of [
        ['assigneeId', "''"],
        ['dueDate', "''"],
        ['priority', "'normal'"],
        ['taskList', "'[]'"],
      ])
        if (!(await runner.hasColumn('job', name)))
          await runner.addColumn(
            'job',
            new TableColumn({ name, type: 'text', default: defaultValue }),
          );
      const table = await runner.getTable('job');
      if (!table.indices.some((index) => index.name === 'IDX_job_assignee_due'))
        await runner.createIndex(
          'job',
          new TableIndex({
            name: 'IDX_job_assignee_due',
            columnNames: ['assigneeId', 'dueDate'],
          }),
        );
    }
    if (await runner.hasTable('user'))
      for (const name of ['jobTitle', 'phone'])
        if (!(await runner.hasColumn('user', name)))
          await runner.addColumn(
            'user',
            new TableColumn({ name, type: 'text', default: "''" }),
          );
  }
  /** Accepts a rollback runner; refuses to erase planning data during an automatic rollback. */
  async down(_runner: QueryRunner) {
    throw new Error('Restore a verified backup to roll back planning fields.');
  }
}
