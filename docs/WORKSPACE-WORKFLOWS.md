# Workspace workflows

## Daily work

**My work** shows assigned open jobs due soon or overdue, an unassigned queue, and shared upcoming appointments. Administrators can also view the team's queue. Appointment authorship does not imply attendance or responsibility.

An administrator must confirm an IANA timezone in **Account → Workspace settings** before workspace-relative Today, My work and Schedule become available. The suggested timezone comes from the browser. Existing appointments remain stored as instants; deadlines remain date-only values. Appointment entry rejects nonexistent daylight-saving times and asks which occurrence to use for repeated hours.

**Schedule** combines appointments and computed job deadlines. Choose a range of at most 93 days, optionally filter by customer/project or type, and use Agenda, Month, Week or Day. Results are paginated; calendar views display the current result page. Opening an appointment selects it in its owning workspace, including appointments outside the current month.

Job and customer workspaces keep their resource panels mounted. Tab selection, calendar period and list filters have shareable URLs. Editing details is a disclosure above the job resources. Changed job, discussion, calendar and file drafts are protected when leaving; pending writes block navigation. Drafts live only in the current page, not across browser sessions.

## Internal work and reuse

Create a job for an existing customer, create its customer at the same time, or explicitly choose **Internal project**. Internal projects share the same owners, deadlines, checklist, discussion, appointments and files. They are visible to authenticated staff; internal does not mean private. Existing customer jobs cannot be converted or moved between customers.

**Create → From template** opens editable examples and previews their scope, priority and checklist. An optional start date applies the template's deadline offset. **Duplicate with preview** creates fresh unchecked checklist IDs and clears owner and deadline. Choose the new relationship deliberately; messages, files and appointments are never copied.

Project labels use the same lowercase normalization as file tags, in a separate scope. Named board views belong only to the account that saved them. Search covers contact fields, job titles and file names/tags, with exact file links; it does not index attachment contents or messages.

**Updates** shows new assignments and messages/status/owner/deadline changes on followed jobs. Repeated changes are grouped, your own actions are omitted, and marking a job read advances only that job through the displayed event. History is recorded for new writes after upgrade; historical activity is not fabricated. Delivery is in-app only.

## Archive and legacy status

The canonical lanes are `planned`, `active`, `complete` and `archived`. Writes derive compatibility flags from the lane and reject contradictory supplied flags. Archive and restore require the current version. Restoring a directly archived job puts it in Planned. Customer archival hides its jobs from active views while preserving their original statuses; restore the parent before restoring a job beneath it. The global Archived view distinguishes these cases.

The migration does not silently reconcile legacy disagreements. Inspect a stopped workspace copy before upgrade:

```sh
node tools/audit-workflows.cjs /path/to/data/prime.sqlite
```

The command reads a detached database copy, prints JSON, and never saves it. Exit status 0 means no findings, 2 means review is needed, and 1 means inspection failed. Keep the report private because it contains record identifiers. A missing lane is inferred only when flags are unambiguous: archived, complete, active, or planned when none are set. Multiple true flags, an unknown lane, or disagreement between lane and flags require an explicit status choice with the current version. Broken customer relationships remain customer work and require data review; they are never reclassified as internal projects.

## Upgrade and restore

1. Stop the application and copy its **entire data directory** to a protected backup location. Include the database, session key and supporting files. Confirm the copy is readable before starting the upgrade.
2. Run the status audit against a copy. Review findings before making any deliberate corrections.
3. Build and start the updated application. Before changing an existing pre-workflow schema, the additive workflow migration also copies runtime data into `.ppm-workflow-backups/before-workflows-<timestamp>` inside the data directory. This works inside Docker's writable data mount; the reserved backup directory itself is excluded to avoid recursively copying older backups. Startup fails if that backup cannot be made. Use a dedicated data directory, never a filesystem root. Keep your separate offline backup as well.
4. Confirm the workspace timezone. Verify familiar customers/jobs, discussions and attachment downloads against the backup.
5. To roll back, stop the application, preserve the migrated data separately, and restore the full pre-upgrade backup with the matching previous application version. Do not run older binaries against a migrated database. Migration rollback intentionally refuses destructive schema removal.

The automated upgrade fixture verifies IDs, versions, archived/ambiguous status, orphan boundaries, appointment timestamps, attachment bytes and repeat-safe template seeding. A separate disk fixture rehearses the directory backup and opens an independently restored copy. These checks do not replace a backup of your own workspace.

## Verification commands

```sh
node tools/build.cjs
node --test test/*.test.cjs
node tools/prepare-public.cjs ../publish/new-reviewed-source
node tools/check-public.cjs ../publish/new-reviewed-source
```

Use a new export destination. The exporter refuses to overwrite existing exports and regenerates the source manifest. Deployment and Git publication are separate steps.
