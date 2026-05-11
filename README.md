# ZooMeet

ZooMeet is a secure, open-source video conferencing application powered by LiveKit and SvelteKit. It is fully self-hosted — no third-party services, no accounts required. Just share a link and start a call.

## Features

- **End-to-End Encryption** — All media is encrypted via WebRTC SRTP
- **Pre-Join Screen** — Configure your microphone and camera before entering a room
- **Responsive Video Grid** — Auto-scaling layout that adapts to any number of participants
- **Screen Sharing** — Share your screen with a single click
- **Text Chat** — In-call messaging over WebRTC DataChannels (no server storage)
- **No Account Required** — Anyone with the link can join instantly
- **Brandable** — Customize the app name via `PUBLIC_BRAND_NAME`
- **Self-Hosted Backend** — Bundled LiveKit server and Valkey via Docker Compose

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | SvelteKit, Svelte 5, Tailwind CSS, Lucide Icons |
| WebRTC Client | `livekit-client` |
| Backend / API | SvelteKit API routes, `livekit-server-sdk` |
| Infrastructure | Docker, Docker Compose, LiveKit Server, Valkey |

## Getting Started (Local Development)

The easiest way to run the full stack locally is with Docker Compose, which starts LiveKit, Valkey, and the ZooMeet app in one command.

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and Docker Compose
- Node.js 22+ (only needed if running the frontend outside of Docker)

### Running the Full Stack

1. Clone the repository:
   ```bash
   git clone https://github.com/anatoliy-t7/zoo-meet.git
   cd zoo-meet
   ```

2. **Create the Compose network Dokploy uses** (once per machine; harmless if it already exists):
   ```bash
   docker network create dokploy-network
   ```

3. Start everything:
   ```bash
   docker compose up --build
   ```

   This starts three containers:
   - `livekit` — WebRTC media server (ports `7880`, `7881`, `50000–60000/udp`)
   - `valkey` — In-memory state store for LiveKit
   - `ZooMeet` — SvelteKit web application

4. Open **[http://localhost:3000](http://localhost:3000)** in your browser.

### Running the Frontend Separately (HMR / Dev Mode)

If you want hot module replacement during development, run LiveKit in Docker and the frontend locally:

1. Create the network if needed, then start only the backend services:
   ```bash
   docker network create dokploy-network 2>/dev/null || true
   docker compose up livekit valkey -d
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Start the dev server:
   ```bash
   pnpm dev
   ```

4. Open **[http://localhost:5173](http://localhost:5173)** in your browser.

## Environment Variables

The project ships with a `.env` file pre-configured for local development:

```env
# Used by zoomeet and injected into LiveKit config from livekit.yaml.template at container start
LIVEKIT_API_KEY=devkey
LIVEKIT_API_SECRET=your_secret_here

# WebSocket URL of the LiveKit server (use wss:// in production)
PUBLIC_LIVEKIT_URL=ws://127.0.0.1:7880

# Brand name shown in the UI, page titles, and OG meta tags
PUBLIC_BRAND_NAME=ZooMeet
```

### Variable Reference

| Variable | Required | Description |
|---|---|---|
| `LIVEKIT_API_KEY` | Yes | LiveKit API key id; must match the secret you set next to `keys:` in the **rendered** server config (same value is baked in via `livekit.yaml.template` at startup) |
| `LIVEKIT_API_SECRET` | Yes | LiveKit API secret; paired with `LIVEKIT_API_KEY` for token signing and for `keys:` in the rendered config |
| `PUBLIC_LIVEKIT_URL` | Yes | WebSocket URL of your LiveKit server, visible to the browser |
| `PUBLIC_BRAND_NAME` | No | App name rendered in the UI, `<title>`, and Open Graph tags. Defaults to `ZooMeet` |

> **Production**: Use strong random `LIVEKIT_*` values. Keep them only in Dokploy (or your secrets store), not in the repo.

## Deploying with Dokploy

This stack is one Docker Compose project: **LiveKit**, **Valkey**, and **ZooMeet**. Dokploy pulls your repo, runs Compose, and exposes services through **Traefik** on **`dokploy-network`**.

### Prerequisites

- A server with [Dokploy](https://dokploy.com/) installed and the **`dokploy-network`** Docker network present (Dokploy creates this on the host).
- DNS **A** (or **AAAA**) records for at least two hostnames (recommended), e.g. `meet.example.com` and `livekit.example.com`, pointing at your server’s public IP.
- Host or cloud firewall allowing:
  - **TCP** `443` (HTTPS via Traefik), and
  - **UDP** **50000–60000** (LiveKit WebRTC media, see `livekit.yaml.template`).

### Steps

1. **Create a project** in Dokploy, then add a **Compose** service and choose **Docker Compose** (not Docker Stack unless you intend to use Swarm).

2. **Connect Git**: link this repository (GitHub, GitLab, Gitea, Bitbucket, etc.), select the **branch** to deploy, and set the compose file path to **`docker-compose.yml`**.

3. **Environment variables**: in the Compose app’s **Environment** (or **.env**) section, define at least:
   - `LIVEKIT_API_KEY` — API key **id** (any strong string; it becomes the LiveKit `keys:` map key).
   - `LIVEKIT_API_SECRET` — matching secret (must stay in sync with the key id).
   - `PUBLIC_LIVEKIT_URL` — WebSocket URL **as** **the browser** will use it in production, e.g. `wss://livekit.example.com` (scheme, host, and port must match your LiveKit domain and TLS setup).
   - `PUBLIC_BRAND_NAME` — optional (defaults apply if unset).

   Do **not** commit production `LIVEKIT_*` values to Git. On startup, the **LiveKit** container renders **`livekit.yaml.template`** with `envsubst` into `/etc/livekit.yaml` inside the container, so **`keys:`** always matches **`LIVEKIT_API_KEY`** / **`LIVEKIT_API_SECRET`**.

4. **Deploy**: trigger a deploy and wait until all three services are healthy. Fix compose or build errors from the deployment logs if needed.

5. **Domains** (recommended): use the **Domains** tab for this Compose app so Dokploy wires Traefik for you ([Compose domains](https://docs.dokploy.com/docs/core/docker-compose/domains)):
   - **ZooMeet (UI):** hostname e.g. `meet.example.com` → service **`zoomeet`**, container port **3000**, HTTPS / Let’s Encrypt as Dokploy offers.
   - **LiveKit (signaling):** hostname e.g. `livekit.example.com` → service **`livekit`**, container port **7880**, HTTPS so clients can use **`wss://`**.
   - Set **`PUBLIC_LIVEKIT_URL`** to that **`wss://`** URL exactly (no trailing path unless your proxy uses one).

   Alternatively you can add [Traefik `labels`](https://docs.dokploy.com/docs/core/docker-compose/example) on those services yourself; use **unique** router and service names per route.

6. **Verify**: open the app URL, join a room from two networks if possible. In browser devtools, confirm the LiveKit connection uses **`wss://`** and check for firewall-related media failures if the room connects but video/audio fails.

### Troubleshooting

| Symptom | Things to check |
|--------|-------------------|
| `401` / invalid token | `LIVEKIT_API_KEY` / `LIVEKIT_API_SECRET` in Dokploy wrong or changed without redeploy; must match rendered `keys:` |
| WebSocket fails | `PUBLIC_LIVEKIT_URL` must match the public **`wss://`** host; TLS and DNS for the LiveKit domain |
| One-way or no media | **UDP** **50000–60000** not open on host; NAT or overly wide ICE range vs published ports |

Official reference: [Dokploy Docker Compose](https://docs.dokploy.com/docs/core/docker-compose).

## License

MIT License
