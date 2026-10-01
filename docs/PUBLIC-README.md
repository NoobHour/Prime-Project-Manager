# Prime Project Manager (PPM)

A local project manager for small teams. Keep customers, jobs, deadlines, checklists, appointments, files and team conversations in one dark-themed workspace.

Built with Angular, NestJS and SQLite through TypeORM/sql.js. The frontend and API run together in a single Node.js process; no separate database service is needed.

PPM is intended for small teams that want a self-hosted customer and job workspace. It is not a billing, estimating or accounting system.

## Features

- **Customers:** contact information, notes, avatars, leads, search, archive and restore.

- **Job planning:** owners, priorities, deadlines, status changes, completed work and checklists. Filter by owner, priority, status or overdue work; bookmark the filtered URL. Complete checklist items directly on the board.

- **Job workspace:** open any job for its own editor, rich scope notes, checklist, customer contact card and related jobs. Use **Job discussion**, **Job calendar** and **Job files** tabs to switch resources without losing their drafts or filters. Version checks preserve unsaved edits on conflicts; leaving warns before discarding job edits or message drafts.

- **Dashboard:** urgent and overdue work alongside a shared team discussion.

- **Discussions:** a board for each job, a customer general board and a shared team board. Customer views combine that customer's job and general messages with board labels, filters and explicit posting destinations. Includes author profiles, editing, older history, independent board drafts and automatic refresh. Enter sends; Shift+Enter adds a line.

- **Calendar:** customer and job appointments with month, week and day views, local-time entry and validation.

- **Files:** customer-wide or job-specific protected uploads, image previews, downloads, categories, multiple tags, filename search, tag filtering and selected-file ZIP downloads.

- **Team:** administrator-created accounts, profiles, staff access controls and assigned-work links.

Open a job title on the Job Board or dashboard to use its workspace. Edit the job and checklist, contact or edit its customer, switch to related work, and use the resource tabs for that job's discussion, appointments and attachments. The editor and customer card remain above the tabs. Tab switches keep each resource mounted, preserving its in-page state. Arrow keys, Home and End navigate the tab bar.

The customer overview brings all that customer's job boards together with general customer messages. Each message belongs to one board and appears once in the combined feed. Use **Show messages** to narrow the feed, **Post to** to choose a destination, or **Reply on this board** to direct the composer to a message's board. Switching destinations preserves separate unsent drafts until you leave the page; navigation warns before discarding them.

Customer-wide appointments and files stay in the customer overview; choose a job under **Attach to** to associate an existing appointment, or **Edit details** to associate a file. Add tags when uploading or editing file details, then click a tag or select **Filter by tag**. Combine a tag with **Search files** to narrow filenames. Tags are normalized to lowercase and deduplicated, with up to 20 tags per file. Existing virtual-folder labels become tags on upgrade; stored file bytes and existing general customer messages are preserved.

## Quick start

Install Node.js **24 LTS** and **pnpm 11.25.0**, then run these commands from the repository directory:

```sh

pnpm install --frozen-lockfile

pnpm build

pnpm start

```

Open [localhost:3333](http://localhost:3333). On first startup, the terminal prints a one-time setup code. Enter it in the app and create your administrator account. Add teammates through **Staff accounts**. There is no default administrator password or public registration.

## Run with Docker

```sh

docker compose up -d --build

docker compose logs ppm

```

Open [localhost:3333](http://localhost:3333) and use the setup code from the logs. Docker keeps records and uploads in a named volume. See [the Docker guide](docs/DOCKER.md) for changing ports, upgrades, backups and restores.

## Try the demo

After installing and building:

```sh

pnpm demo

```

Open [localhost:3335](http://localhost:3335) and choose **Try as project manager** or **Try as staff**. The demo contains fictional customers, jobs, appointments, messages and files, and keeps your edits between runs.

| Demo role | Email                         |

| --------- | ----------------------------- |

| Manager   | `demo.admin@example.test`     |

| Staff     | `demo.staff@example.test`     |

| Estimator | `demo.estimator@example.test` |

All demo accounts use `Prime-Demo-2026!`. These are public test credentials. Use the demo only for fictional data. For a fresh demo, set `MGMT_DEMO_DATA_DIR` to a new directory; existing unmarked databases and production mode are rejected.

## Editable portfolio demo

For a shared demo that automatically resets every hour:

```sh

docker compose -f compose.demo.yaml up -d --build

```

Open [localhost:3336](http://localhost:3336). Visitors can try planning and collaboration using fictional records. Account changes and uploads are disabled; edits are visible to everyone and discarded on reset or restart. The demo runs separately from normal PPM, without its data volume. See [the portfolio demo guide](docs/PORTFOLIO-DEMO.md) for server origins, proxy setup, limits and reset timing. `pnpm demo:hosted` provides the same disposable sandbox without Docker.

## Configuration and data

Set environment variables in your shell before starting. `.env.example` documents them; the launchers do **not** automatically load `.env` files.

| Variable             | Default / purpose                                            |

| -------------------- | ------------------------------------------------------------ |

| `MGMT_DATA_DIR`      | Private data directory; see below                            |

| `MGMT_HOST`          | `127.0.0.1` for Node; `0.0.0.0` inside Docker                |

| `MGMT_PORT`          | `3333`                                                       |

| `MGMT_ORIGIN`        | `http://localhost:3333`; set this together with the port     |

| `MGMT_DEMO_DATA_DIR` | Separate demo data directory                                 |

| `MGMT_DEMO_PORT`     | `3335`; the demo launcher sets its matching localhost origin |

Normal data defaults to `%LOCALAPPDATA%\PrimeMgmtOriginal` on Windows and `~/PrimeMgmtOriginal` elsewhere. Demo data uses `PrimeMgmtDemo` alongside it. These existing names remain unchanged so upgrades continue to find your records.

The data directory contains `prime.sqlite` (including uploaded file bytes) and `session-key` (the private authentication signing key). Never commit or share this directory.

**Back up or restore:** stop the server, copy the entire data directory, then restart. Stop before restoring too. Keep a backup before upgrading. Existing databases use additive migrations; automatic schema creation applies only to a new database.

## Troubleshooting

- **Missing compiled API or blank page:** complete `pnpm install --frozen-lockfile` and `pnpm build` before starting. Use Node 24 and the listed pnpm version.

- **Port already in use:** stop the other instance or change both `MGMT_PORT` and `MGMT_ORIGIN`; Docker uses `PPM_PORT` for its host port. See the Docker guide.

- **403 / “Use …”:** open the exact configured origin. A proxy must preserve its Host header. Plain Node launchers require variables in the shell; they do not read `.env`.

- **Demo changes disappeared:** the hosted sandbox intentionally resets; `pnpm demo` is the separate persistent local demo.

- **Unexpected database:** check `MGMT_DATA_DIR` and the documented defaults before making changes. Never use a normal database for demo seeding.

## Development

```sh

pnpm build

pnpm test

```

Rebuild and restart after source changes. Tests cover real HTTP workflows, permissions, stale-write protection, persistence, migrations, demo isolation, source-export checks and frontend editing behavior. Test databases are temporary and separate from normal data.

| Location         | Contents                                              |

| ---------------- | ----------------------------------------------------- |

| `apps/mgmtapp`   | Angular app shell and styles                          |

| `apps/api`       | Nest entry point and demo fixtures                    |

| `libs/customer`  | Customer, job, discussion, calendar and file features |

| `libs/user`      | Accounts, authentication and profiles                 |

| `libs/shared`    | Common UI, validation, storage and configuration      |

| `test` / `tools` | Tests, build scripts and source export tools          |

See [CONTRIBUTING.md](CONTRIBUTING.md) for contribution guidelines and [SECURITY.md](SECURITY.md) for reporting and known dependency risks.

## Deployment limits

PPM supports **one server process per data directory**. The Node launcher binds to loopback by default; Docker publishes its port on loopback at the host. Local Docker operation is tested. Internet hosting and your particular reverse-proxy configuration still require deployment-specific validation.

sql.js holds the database in memory and exports changes to disk. It suits small datasets; it is not a multi-server or large attachment-storage architecture. Current limits are 10 MB per file, 2 MB per avatar, 500 MB of stored files and 50 files / 50 MB per ZIP. Those ceilings are not performance guarantees.

Messages refresh every five seconds while the visible tab shows the latest history. Discussions are chronological boards; notifications, mentions and threaded replies are not implemented. Drafts are kept in page memory, not across a browser restart. File tags are metadata labels. Calendar appointments are edited through the form. Email password recovery is not implemented.

## Source exports

```sh

pnpm prepare:public -- ../ppm-source

```

The destination must not exist. This creates an allowlisted source export and a SHA-256 manifest, excluding local data, historical assets, build output and backups. Within the export, run `node tools/check-public.cjs` to check the manifest and known private-file/credential patterns. This check is not a comprehensive secret audit. Regenerate the export after source changes; it does not create a Git remote or publish anything.

## Project status

This is a self-hosted project with automated workflow tests, not a managed SaaS. See [SECURITY.md](SECURITY.md) for dependency risks and reporting guidance. Internet deployment still needs validation against your own proxy and access rules. Issues and contributions are welcome; follow [CONTRIBUTING.md](CONTRIBUTING.md) and use fictional data in reports.

## Author

Maintained by [NoobHour](https://github.com/NoobHour). Visit [noobhour.gg](https://www.noobhour.gg). The app includes creator links, copyright credit and an expandable About & license section on both sign-in and workspace pages.

## License

[MIT](LICENSE). Original copyright attribution is preserved. See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for third-party notices.

