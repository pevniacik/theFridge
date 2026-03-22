# theFridge

Local-first household fridge/freezer inventory app.

## Run Locally (Node)

Requirements:
- Node.js 22+
- npm 10+

Install and run:

```bash
npm install
npm run dev
```

Notes:
- Dev server auto-falls back from port 3000 if occupied.
- `OPENAI_API_KEY` is optional; intake extraction uses deterministic stub data when missing.
- `QR_BASE_URL` is optional; use it to force QR links to a LAN-reachable origin.
- SQLite database is created automatically at `data/fridges.db`.

Production-style local run:

```bash
npm run build
PORT=3005 npm start
```

## Run Locally (Docker)

Build and run:

```bash
docker compose up --build
```

If port 3000 is already used on the host:

```bash
HOST_PORT=3010 docker compose up --build
```

App URL:
- http://localhost:3000

Home-network access:
- Open the app from another device using `http://<your-lan-ip>:3000`
- QR origin is resolved from forwarded host/proto headers first, then request host
- If QR still points to `localhost`, set `QR_BASE_URL=http://<your-lan-ip>:3000`

Persistence:
- SQLite data is stored in Docker volume `thefridge_data` mounted to `/app/data`.

Optional environment variable:
- `OPENAI_API_KEY`
- `QR_BASE_URL` (forces generated QR destination origin)

Example:

```bash
OPENAI_API_KEY=your_key QR_BASE_URL=http://192.168.1.22:3000 docker compose up --build
```

Copy env file first if you want real AI extraction:

```bash
cp .env.example .env
```

## 24/7 Home Server Setup

1. Reserve a static DHCP IP for your server in your router.
2. Start the app in detached mode:

```bash
docker compose up -d --build
```

If host port 3000 is occupied:

```bash
HOST_PORT=3010 docker compose up -d --build
```

3. Verify service status:

```bash
docker compose ps
docker compose logs -f fridge-app
```

4. Verify health endpoint:

```bash
curl http://localhost:3000/api/health
```

The compose setup includes:
- `restart: unless-stopped` for crash/reboot recovery
- Healthcheck on `/api/health`
- Log rotation (`max-size: 25m`, `max-file: 5`)
- Persistent SQLite volume `thefridge_data`

## Network + QR Rules

- Access from other devices using `http://<your-lan-ip>:3000`
- QR generation uses this precedence: `QR_BASE_URL` -> `x-forwarded-host`/`x-forwarded-proto` -> request `host`
- If phone scans still fail due `localhost` links, set `QR_BASE_URL` and restart app
- If server IP/port changes, regenerate and reprint QR codes

## QR Troubleshooting (Phone Scans)

If scanning a QR opens `localhost` instead of your server IP:

1. Confirm phone and server are on the same LAN.
2. Open the app from phone directly using `http://<your-lan-ip>:<port>`.
3. Set `QR_BASE_URL=http://<your-lan-ip>:<port>` in `.env`.
4. Restart the app and regenerate/reprint QR labels.

## Backup and Restore

Make scripts executable once:

```bash
chmod +x scripts/backup-db.sh scripts/restore-db.sh
```

Create backup (briefly stops app to keep snapshot safe):

```bash
./scripts/backup-db.sh
```

Restore from backup archive:

```bash
./scripts/restore-db.sh backups/fridge-data-YYYYMMDD-HHMMSS.tar.gz
```

## No-Cost Domain-Like URL Options

1. **Best local-first**: Router or Pi-hole local DNS (`fridge.home.arpa`)
   - Stable, private, no external dependency
2. **Quickest**: mDNS (`fridge.local`)
   - Works great on Apple devices; Android/router support varies
3. **Works without local DNS setup**: nip.io / sslip.io
   - Example: `fridge.192-168-1-50.nip.io`
   - Depends on external DNS service
4. **Remote access too**: Tailscale MagicDNS
   - Free tier, secure overlay network, no port forwarding

Recommended for your case now: static LAN IP + local DNS record (router or Pi-hole).
