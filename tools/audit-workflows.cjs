const fs = require('node:fs');
const initSql = require('sql.js');

/** Accepts a database filename; returns a read-only report of lifecycle conflicts and broken job relationships. */
async function audit(filename) {
  const SQL = await initSql();
  // sql.js reads a detached byte copy. This command never saves or changes the source database.
  const db = new SQL.Database(fs.readFileSync(filename));
  try {
    const columns = db.exec('PRAGMA table_info(job)')[0]?.values.map((row) => row[1]) || [];
    const kind = columns.includes('workKind') ? 'j.workKind' : "'customer'";
    const result = db.exec(`SELECT j.jobSlug,j.lane,j.isActive,j.isComplete,j.isArchived,j.customerSlug,${kind} AS workKind,c.slug AS parent FROM job j LEFT JOIN customer c ON c.slug=j.customerSlug WHERE j.deletedDate IS NULL`)[0];
    const conflicts = [], brokenRelationships = [];
    for (const values of result?.values || []) {
      const row = Object.fromEntries(result.columns.map((key, index) => [key, values[index]]));
      const count = [row.isActive, row.isComplete, row.isArchived].filter(Boolean).length;
      const inferred = row.isArchived ? 'archived' : row.isComplete ? 'complete' : row.isActive ? 'active' : 'planned';
      if (count > 1 || (row.lane && row.lane !== inferred)) conflicts.push({ jobSlug: row.jobSlug, lane: row.lane, flags: { active: row.isActive, complete: row.isComplete, archived: row.isArchived } });
      if (!(row.workKind === 'internal' && !row.customerSlug) && !(row.workKind === 'customer' && row.customerSlug && row.parent)) brokenRelationships.push({ jobSlug: row.jobSlug, workKind: row.workKind, customerSlug: row.customerSlug });
    }
    return { jobs: result?.values.length || 0, conflicts, brokenRelationships };
  } finally { db.close(); }
}

module.exports = { audit };
if (require.main === module) {
  if (process.argv.length !== 3) throw new Error('Usage: node tools/audit-workflows.cjs <stopped-workspace-database.sqlite>');
  audit(process.argv[2]).then(
    /** Accepts an audit report; prints reviewable JSON and signals records requiring manual review. */
    (report) => { process.stdout.write(JSON.stringify(report, null, 2) + '\n'); process.exitCode = report.conflicts.length || report.brokenRelationships.length ? 2 : 0; },
    /** Accepts an inspection failure; prints its cause and returns a failed command status. */
    (error) => { process.stderr.write(error.message + '\n'); process.exitCode = 1; },
  );
}
