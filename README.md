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

| Layer          | Technology                                     |
| -------------- | ---------------------------------------------- |
| Frontend       | SvelteKit, Svelte 5, Tailwind CSS              |
| WebRTC Client  | `livekit-client`                               |
| Backend / API  | SvelteKit API routes, `livekit-server-sdk`     |
| Infrastructure | Docker, Docker Compose, LiveKit Server, Valkey |

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

| Variable             | Required | Description                                                                                                                                                         |
| -------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `LIVEKIT_API_KEY`    | Yes      | LiveKit API key id; must match the secret you set next to `keys:` in the **rendered** server config (same value is baked in via `livekit.yaml.template` at startup) |
| `LIVEKIT_API_SECRET` | Yes      | LiveKit API secret; paired with `LIVEKIT_API_KEY` for token signing and for `keys:` in the rendered config                                                          |
| `PUBLIC_LIVEKIT_URL` | Yes      | WebSocket URL of your LiveKit server, visible to the browser                                                                                                        |
| `PUBLIC_BRAND_NAME`  | No       | App name rendered in the UI, `<title>`, and Open Graph tags. Defaults to `ZooMeet`                                                                                  |

> **Production**: Use strong random `LIVEKIT_*` values. Keep them only in your secrets store, not in the repo.

## Deployment

The stack runs as two Docker images — **LiveKit** (plus Valkey) and **ZooMeet**. You can easily deploy it using Docker Compose.

### Prerequisites

- A server with Docker and Docker Compose installed.
- A reverse proxy (e.g., Caddy, Nginx, or Traefik) to handle HTTPS.
- DNS records for two hostnames pointing at your server (e.g., `meet.example.com` and `livekit.example.com`).
- Firewall allowing **TCP 443** (HTTPS), **TCP 7880–7881**, and **UDP 40000–40100** (WebRTC media).

### Steps

1. Clone the repository on your server:

   ```bash
   git clone https://github.com/anatoliy-t7/zoo-meet.git
   cd zoo-meet
   ```

2. Create the external Docker network required by the compose files:

   ```bash
   docker network create dokploy-network
   ```
   *(Attach your reverse proxy to this network to route traffic to the containers).*

3. Create a `.env` file with your production values:

   ```env
   LIVEKIT_API_KEY=your_random_api_key
   LIVEKIT_API_SECRET=your_random_secret
   PUBLIC_LIVEKIT_URL=wss://livekit.example.com
   ZOOMEET_IMAGE=anatoliydev7/zoomeet:latest
   ```

   *The LiveKit container renders [`livekit.yaml.template`](livekit.yaml.template) at startup, so its config always stays in sync with your env vars.*

4. Start the stack in the background:

   ```bash
   docker compose -f docker-compose.hub.yml up -d
   ```

5. Configure your reverse proxy to route traffic:
   - **ZooMeet (UI)**: Route `meet.example.com` to port **3000** on the `zoomeet` container.
   - **LiveKit (Signaling)**: Route `livekit.example.com` to port **7880** on the `livekit` container (ensure WebSockets are supported so clients can connect via `wss://`).

6. Open the app URL and verify. In browser devtools, confirm the LiveKit connection uses `wss://`.

### Troubleshooting

| Symptom                   | Things to check                                                                                                    |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `401` / invalid token     | `LIVEKIT_API_KEY` / `LIVEKIT_API_SECRET` wrong or changed without redeploy; must match rendered `keys:`            |
| WebSocket fails           | `PUBLIC_LIVEKIT_URL` must match the public `wss://` host; check TLS and DNS for the LiveKit domain                 |
| LiveKit can't reach Redis | Ensure `valkey` is running; check Docker network connectivity                                                      |

## Development

Run **LiveKit + Valkey** in Docker, and **ZooMeet** locally with hot module replacement.

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and Docker Compose
- Node.js 22+
- pnpm

### Steps

1. Clone the repo and install dependencies:

   ```bash
   git clone https://github.com/anatoliy-t7/zoo-meet.git
   cd zoo-meet
   pnpm install
   ```

2. Start the backend services (LiveKit + Valkey):

   ```bash
   docker network create dokploy-network 2>/dev/null || true
   docker compose up livekit valkey -d
   ```

3. Start the dev server:

   ```bash
   pnpm dev
   ```

4. Open **[http://localhost:5173](http://localhost:5173)** — changes to `src/` reflect instantly via HMR.

> The `.env` file is pre-configured for this setup (`ws://127.0.0.1:7880`, dev keys). No changes needed.

## License

MIT License
