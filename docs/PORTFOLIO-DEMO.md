# Editable portfolio demo

The hosted demo is a shared fictional sandbox. Visitors can try customer, job, checklist, appointment and discussion workflows as a manager or staff member. Everyone sees the same edits. Account creation, profile/password changes, staff disabling and new uploads are rejected by the API. Seeded sample files can still be previewed and downloaded.

The supervisor creates a new temporary database on every startup and resets it every 60 minutes by stopping the API, removing only its owned temporary directory, reseeding and restarting. Sessions expire at reset; visitors sign in again. There is a brief interruption during reseeding. Data is never mounted from the normal application. Resets do not moderate visitor content during the interval: use access protection for a private preview and monitor any public demo.

## Local preview with Docker

From the source-only public repository:

```sh
docker compose -f compose.demo.yaml up -d --build
docker compose -f compose.demo.yaml logs demo
```

Open http://localhost:3336 and choose **Try as project manager** or **Try as staff**. Demo credentials are listed in the main README. This is a separate Compose project with no persistent volume; normal PPM data is unaffected. The demo has a 512 MB RAM limit, one CPU limit and 128 MB temporary-data ceiling. These are operating limits, not measured resource requirements.

```sh
docker compose -f compose.demo.yaml stop
docker compose -f compose.demo.yaml down
```

## Preview without Docker

After installing and building, run `pnpm demo:hosted`. It defaults to http://localhost:3333; choose a free port and matching `MGMT_ORIGIN` if the main application is already running. It always creates its own temporary data directory, ignoring `MGMT_DATA_DIR`. `MGMT_SANDBOX_RESET_MINUTES` accepts 1–1440 minutes. Unlike `pnpm demo`, this mode discards changes on restart.

## Server configuration

Use the same standalone Compose file. Set these values in a local `.env` file beside it (do not commit that file):

```dotenv
PPM_DEMO_PORT=3336
PPM_DEMO_ORIGIN=https://demo.example.com
PPM_DEMO_RESET_MINUTES=60
```

Route the chosen HTTPS hostname through your reverse proxy to the loopback-published port 3336. Preserve the browser's Host header and set the exact origin without a trailing slash. If Caddy runs in Docker, its upstream must reach the host's loopback port through your existing routing arrangement; `localhost` inside a separate container refers to that container. Use the server's established proxy arrangement rather than exposing the demo port on all interfaces.

Cookies are Secure with an HTTPS origin. Forwarded headers are not trusted. Login limits apply to the proxy's connection address (30 attempts per 15 minutes), and demo API traffic shares a 600-request/minute limit. This may limit busy public demos. Validate TLS, login, protected downloads, mutations, reset timing and reconnection through the actual proxy before sharing a public URL. No email, billing or third-party integrations are enabled.

## Verification

`pnpm build` and `pnpm test` include sandbox integration checks for editable records, protected account/upload routes, independent visitor logout, reset session invalidation and reseeding. The standard persistent local demo remains available through `pnpm demo`.
