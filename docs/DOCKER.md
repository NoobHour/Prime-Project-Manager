# Docker

Use Docker Engine with Compose (or Docker Desktop with Linux containers). Run these commands from the public repository directory:

```sh
docker compose up -d --build
docker compose logs ppm
```

Open http://localhost:3333. Use the first-run setup code printed in the logs to create an administrator. Setup codes and logs are private. Keep one PPM container per data volume; do not scale this service.

The image runs as UID/GID 1000, with a read-only root filesystem, a temporary `/tmp`, dropped Linux capabilities and a health check. The named `ppm-data` volume holds `/data/prime.sqlite` (including uploads) and `/data/session-key`. Recreating the container preserves this volume. **Do not use `docker compose down -v` for routine shutdown or upgrades:** it deletes the data volume.

## Change the local port

If port 3333 is already occupied, create a `.env` file beside `compose.yaml`:

```dotenv
PPM_PORT=3340
MGMT_ORIGIN=http://localhost:3340
```

Then run `docker compose up -d`. Compose reads this file; the plain Node launcher does not. `PPM_PORT` is the host port; the container always listens on 3333. The published port remains bound to 127.0.0.1.

## Update and stop

Back up first, update the source, then run `docker compose up -d --build`. Existing databases use additive migrations. Run `docker compose stop` to stop without removing the container, or `docker compose down` to remove the container/network while keeping the named volume. Keep the Compose project name stable so you continue to use the same volume.

## Backup and restore

Stop the application before copying data. From the repository directory:

```sh
docker compose stop ppm
docker compose cp ppm:/data/. ./ppm-backup
docker compose start ppm
```

Store that complete backup privately, outside the repository. Use a new backup directory each time. It includes account data, files and the signing key.

To restore, first make a backup of the current data. Copy a complete trusted snapshot into a stopped container:

```sh
docker compose stop ppm
docker compose cp ./ppm-backup/. ppm:/data
# Copying from the host may change ownership. Grant CHOWN only to this temporary volume helper.
docker compose run --rm --no-deps --user 0 --cap-add CHOWN ppm chown -R 1000:1000 /data
docker compose start ppm
```

For a fresh installation, run `docker compose create ppm` before the restore commands so the target container and volume exist. Restore both database and signing key from the same backup. Do not copy live SQLite files or share a volume with another running PPM process.

## Hosting behind a proxy

The supplied configuration is for local access. For a server deployment, put an HTTPS reverse proxy on the same host, preserve the browser's `Host` header and set `MGMT_ORIGIN` to the exact HTTPS origin (no trailing slash or path). Cookies become Secure when that origin uses HTTPS. The proxy connects to the loopback-published port. Leave forwarded-header trust disabled; PPM does not accept client-supplied forwarding headers as authority. Rate limiting currently groups proxy traffic by the proxy connection address.

Remote hosting needs validation against your actual proxy, TLS and access rules. Use the separate [portfolio sandbox](PORTFOLIO-DEMO.md) for a hosted demo; do not expose the persistent local seeded demo or publish the container port on every host interface. The container listens on `0.0.0.0` internally; that does not require publishing on `0.0.0.0` at the host.

## Verify an image

```sh
docker build -t ppm:local .
node tools/docker-smoke.cjs ppm:local
```

The optional smoke test requires Node 24 on the host. It creates uniquely named temporary containers/volumes, checks setup and authentication, writes fictional records/files, recreates the container and verifies a stopped-server backup/restore. It removes only its own test fixtures. The image build also runs the normal test suite and the source-manifest check.

Docker references: [port publishing](https://docs.docker.com/engine/network/port-publishing/), [volumes](https://docs.docker.com/engine/storage/volumes/).
