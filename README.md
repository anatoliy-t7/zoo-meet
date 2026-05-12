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

| Variable             | Required | Description                                                                                                                                                         |
| -------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `LIVEKIT_API_KEY`    | Yes      | LiveKit API key id; must match the secret you set next to `keys:` in the **rendered** server config (same value is baked in via `livekit.yaml.template` at startup) |
| `LIVEKIT_API_SECRET` | Yes      | LiveKit API secret; paired with `LIVEKIT_API_KEY` for token signing and for `keys:` in the rendered config                                                          |
| `PUBLIC_LIVEKIT_URL` | Yes      | WebSocket URL of your LiveKit server, visible to the browser                                                                                                        |
| `PUBLIC_BRAND_NAME`  | No       | App name rendered in the UI, `<title>`, and Open Graph tags. Defaults to `ZooMeet`                                                                                  |

> **Production**: Use strong random `LIVEKIT_*` values. Keep them only in Dokploy (or your secrets store), not in the repo.

### Deploy with the image (no app build on the server)

Compose layout:

| File                                                   | Role                                                 |
| ------------------------------------------------------ | ---------------------------------------------------- |
| [`docker-compose.stack.yml`](docker-compose.stack.yml) | LiveKit + Valkey + `dokploy-network` (shared)        |
| [`docker-compose.yml`](docker-compose.yml)             | **include** stack + **build** ZooMeet from source    |
| [`docker-compose.hub.yml`](docker-compose.hub.yml)     | **include** stack + **pull** ZooMeet from Docker Hub |

Set **`ZOOMEET_IMAGE`** to the image you pushed, e.g. `anatoliydev7/zoomeet:latest`, and use **`docker-compose.hub.yml`** as the compose file (Dokploy or local). Still set **`LIVEKIT_*`** and **`PUBLIC_LIVEKIT_URL`** the same way as below.

## Deploying with Dokploy

This stack is one Docker Compose project: **LiveKit**, **Valkey**, and **ZooMeet**. Dokploy pulls your repo, runs Compose, and exposes services through **Traefik** on **`dokploy-network`**.

### Separate applications (three services)

You can run **each image as its own Dokploy application** (Docker source) instead of a single Compose file. Use this when you want separate deploy buttons, versions, or scaling per tier.

**Requirements:**

- Every app must attach to the same **`dokploy-network`** as Traefik (see [Dokploy networking / Docker](https://docs.dokploy.com/docs/core/docker-compose); mirror the same pattern your UI offers for **Applications** so traffic and service DNS stay consistent).
- LiveKit must reach Valkey by **hostname + port** on that network (not `localhost`). After deploying Valkey, resolve the name containers use (for example **`docker network inspect dokploy-network`**) or assign a predictable alias if your setup allows it. Put that hostname in **`LIVEKIT_CONFIG`** → **`redis.address`** (see below).
- LiveKit needs **TCP** **7880** / **7881** and **UDP** **50000–60000** published on the host the same way as in [`livekit.yaml.template`](livekit.yaml.template) — ensure Dokploy’s port / Docker options cover signaling and WebRTC.

**Suggested order:**

1. **Valkey** (Application → source **Docker**)
   - **Image:** `valkey/valkey:7-alpine`
   - **Network:** attach **`dokploy-network`**. Prefer **not** publishing **6379** to the public internet.
   - Deploy, then note the **internal hostname** other containers will use (depends on Dokploy/Docker naming).

2. **LiveKit** (Application → source **Docker**)
   - **Image:** `livekit/livekit-server:latest`
   - **Network:** **`dokploy-network`** (same as Valkey).
   - **Command / entrypoint:** default `livekit-server` (no args required if you use env-only config below).
   - **Environment** (align **`LIVEKIT_*`** with ZooMeet later):
     - **`LIVEKIT_KEYS`** — API key line in LiveKit’s format: **`{keyId}: {secret}`** (same logical pair as **`LIVEKIT_API_KEY`** / **`LIVEKIT_API_SECRET`** on ZooMeet). Example: `myprodkey: yourLongRandomSecret`. For multiple keys, use newline-separated lines; see [LiveKit server flags](https://github.com/livekit/livekit/blob/master/cmd/server/main.go).
     - **`LIVEKIT_CONFIG`** — YAML body (ports, RTC, Redis, etc.). Replace **`YOUR_VALKEY_HOST`** with the internal hostname from step 1. Omit a **`keys:`** section when using **`LIVEKIT_KEYS`** (or define keys in only one place):

       ```yaml
       port: 7880
       bind_addresses:
         - ''
       rtc:
         tcp_port: 7881
         port_range_start: 50000
         port_range_end: 60000
         use_external_ip: true
         enable_loopback_candidate: true
       redis:
         address: YOUR_VALKEY_HOST:6379
         username: ''
         password: ''
         db: 0
       ```

       Redundant **`REDIS_HOST`** env is optional if `redis.address` is set here; see LiveKit’s config merging if you use both.

   - **Domain in Dokploy:** map your signaling host (e.g. `livekit.example.com`) to container port **7880** with HTTPS so browsers use **`wss://`**.

3. **ZooMeet** (Application → source **Docker**)
   - **Image:** your published image, e.g. **`anatoliydev7/zoomeet:latest`** (see [Deploy with the image](#deploy-with-the-image-no-app-build-on-the-server)).
   - **Network:** **`dokploy-network`**.
   - **Environment:** **`LIVEKIT_API_KEY`**, **`LIVEKIT_API_SECRET`** (must match the id/secret in **`LIVEKIT_KEYS`**), **`PUBLIC_LIVEKIT_URL`** (**`wss://`** to the **same** host you exposed for LiveKit in step 2), and optional **`PUBLIC_BRAND_NAME`** if you build the image accordingly.
   - **Domain:** map the UI host (e.g. `meet.example.com`) to port **3000**.

**Tradeoffs:** Three apps mean you must keep **Redis DNS**, **UDP**, and **`LIVEKIT_*`** / **`LIVEKIT_KEYS`** in sync yourself. A **single Compose** (`docker-compose.yml` or `docker-compose.hub.yml`) avoids Redis hostname discovery and keeps [`livekit.yaml.template`](livekit.yaml.template) in one place.

### Prerequisites (single Compose stack)

- A server with [Dokploy](https://dokploy.com/) installed and the **`dokploy-network`** Docker network present (Dokploy creates this on the host).
- DNS **A** (or **AAAA**) records for at least two hostnames (recommended), e.g. `meet.example.com` and `livekit.example.com`, pointing at your server’s public IP.
- Host or cloud firewall allowing:
  - **TCP** `443` (HTTPS via Traefik), and
  - **UDP** **50000–60000** (LiveKit WebRTC media, see `livekit.yaml.template`).

### Steps (single Compose stack)

1. **Create a project** in Dokploy, then add a **Compose** service and choose **Docker Compose** (not Docker Stack unless you intend to use Swarm).

2. **Connect Git**: link this repository (GitHub, GitLab, Gitea, Bitbucket, etc.), select the **branch** to deploy, and set the **Compose file** to one of:
   - **`docker-compose.yml`** — builds the ZooMeet image on the server (needs enough CPU/RAM and Node build dependencies via Docker).
   - **`docker-compose.hub.yml`** — pulls a pre-built ZooMeet image from Docker Hub; set **`ZOOMEET_IMAGE`** (see [Deploy with the image](#deploy-with-the-image-no-app-build-on-the-server)).

3. **Environment variables**: in the Compose app’s **Environment** (or **.env**) section, define at least:
   - **`LIVEKIT_API_KEY`** — API key **id** (any strong string; it becomes the LiveKit `keys:` map key).
   - **`LIVEKIT_API_SECRET`** — matching secret (must stay in sync with the key id).
   - **`PUBLIC_LIVEKIT_URL`** — WebSocket URL **as** **the browser** will use it in production, e.g. `wss://livekit.example.com` (scheme, host, and port must match your LiveKit domain and TLS setup).
   - **`PUBLIC_BRAND_NAME`** — optional for a **locally built** app; for a **Docker Hub** image, public branding is fixed at **image build** time unless you rebuild with custom build args.
   - **`ZOOMEET_IMAGE`** — required only for **`docker-compose.hub.yml`**, e.g. `anatoliydev7/zoomeet:latest`.

   Do **not** commit production `LIVEKIT_*` values to Git. On startup, the **LiveKit** container renders **`livekit.yaml.template`** with `envsubst` into `/etc/livekit.yaml` inside the container, so **`keys:`** always matches **`LIVEKIT_API_KEY`** / **`LIVEKIT_API_SECRET`**.

4. **Deploy**: trigger a deploy and wait until all three services are healthy. Fix compose or build errors from the deployment logs if needed.

5. **Domains** (recommended): use the **Domains** tab for this Compose app so Dokploy wires Traefik for you ([Compose domains](https://docs.dokploy.com/docs/core/docker-compose/domains)):
   - **ZooMeet (UI):** hostname e.g. `meet.example.com` → service **`zoomeet`**, container port **3000**, HTTPS / Let’s Encrypt as Dokploy offers.
   - **LiveKit (signaling):** hostname e.g. `livekit.example.com` → service **`livekit`**, container port **7880**, HTTPS so clients can use **`wss://`**.
   - Set **`PUBLIC_LIVEKIT_URL`** to that **`wss://`** URL exactly (no trailing path unless your proxy uses one).

   Alternatively you can add [Traefik `labels`](https://docs.dokploy.com/docs/core/docker-compose/example) on those services yourself; use **unique** router and service names per route.

6. **Verify**: open the app URL, join a room from two networks if possible. In browser devtools, confirm the LiveKit connection uses **`wss://`** and check for firewall-related media failures if the room connects but video/audio fails.

### Troubleshooting

| Symptom                   | Things to check                                                                                                    |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `401` / invalid token     | `LIVEKIT_API_KEY` / `LIVEKIT_API_SECRET` in Dokploy wrong or changed without redeploy; must match rendered `keys:` |
| WebSocket fails           | `PUBLIC_LIVEKIT_URL` must match the public **`wss://`** host; TLS and DNS for the LiveKit domain                   |
| LiveKit can’t reach Redis | **`YOUR_VALKEY_HOST`** wrong for separate apps; all services must share **`dokploy-network`**                      |

Official reference: [Dokploy Docker Compose](https://docs.dokploy.com/docs/core/docker-compose).

## License

MIT License
