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
- Dev server binds to all network interfaces (`0.0.0.0:3000`) so it is reachable from other devices on the home Wi-Fi.
- Dev server auto-falls back from port 3000 if occupied.
- AI extraction uses a deterministic stub until you configure a provider in Settings.
- `QR_BASE_URL` is optional; use it to force QR links to a specific origin.
- If the incoming host is `0.0.0.0`, `localhost`, or `127.0.0.1`, QR generation now automatically falls back to the machine's detected LAN IPv4 address instead of baking an unusable URL.
- SQLite database is created automatically at `data/fridges.db`.

## LAN Reachability Verification

To confirm the app is reachable on the home network and that QR codes encode the correct origin:

```bash
# 1. Start the app
npm run dev

# 2. Find your LAN IP (macOS/Linux)
ipconfig getifaddr en0   # macOS Wi-Fi
# or
hostname -I | awk '{print $1}'  # Linux

# 3. Verify localhost health
curl -sf http://localhost:3000/api/health
# → {"status":"ok","timestamp":"..."}

# 4. Verify LAN health (replace IP below)
curl -sf http://192.168.1.22:3000/api/health
# → {"status":"ok","timestamp":"..."}

# 5. Verify fridge page QR encodes the LAN IP (replace ID)
curl -s http://192.168.1.22:3000/fridges/ZPPo56GIYQ | grep -o 'http://192\.168\.1\.22:[0-9]*/[^"< ]*' | head -1
# → http://192.168.1.22:3000/fridges/ZPPo56GIYQ
```

If the QR still shows `localhost` after accessing the page via the LAN IP:
- Set `QR_BASE_URL=http://192.168.1.22:3000` (or your actual LAN IP) and restart.
- Reload the fridge context page to regenerate the QR with the correct origin.

## Quick AI Setup (Free)

1. Go to [aistudio.google.com/apikey](https://aistudio.google.com/apikey) and sign in with your Google account.
2. Click **Create API key** — takes about 10 seconds.
3. Open the app, go to **Settings**, paste the key, and save.

That's it. Google AI Studio has a generous free tier — no billing required.

Production-style local run:

```bash
npm run build
PORT=3005 npm start
```

## Development Workflow Policy (Required)

By default:

1. Milestone, slice, and normal feature work should happen on a dedicated feature branch.
2. That branch should be pushed to origin.
3. Changes should land in `main` through a Pull Request.
4. PR descriptions should cover:
   - what changed,
   - why it changed,
   - files/modules touched,
   - verification performed (tests/build/manual checks),
   - any migration or rollout notes.

**Exception:** if a quick task explicitly says direct-to-`main` work is allowed, you may commit and push straight to `main` without creating a PR.

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
- QR origin uses this precedence: `QR_BASE_URL` → forwarded host/proto → request host
- If the observed host is `0.0.0.0`, `localhost`, or `127.0.0.1`, the app replaces it with the machine's detected LAN IPv4 address
- If auto-detection picks the wrong address on a multi-network machine, set `QR_BASE_URL=http://<your-lan-ip>:3000`

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
- `0.0.0.0`, `localhost`, and `127.0.0.1` are treated as bind/local addresses, not QR destinations; the app swaps them for the detected LAN IPv4 when possible
- If auto-detection is wrong or you want a stable explicit origin, set `QR_BASE_URL` and restart the app
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
