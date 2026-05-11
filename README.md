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

2. Start everything:
   ```bash
   docker compose up --build
   ```

   This starts three containers:
   - `livekit` — WebRTC media server (ports `7880`, `7881`, `50000–50050/udp`)
   - `valkey` — In-memory state store for LiveKit
   - `ZooMeet` — SvelteKit web application

3. Open **[http://localhost:3000](http://localhost:3000)** in your browser.

### Running the Frontend Separately (HMR / Dev Mode)

If you want hot module replacement during development, run LiveKit in Docker and the frontend locally:

1. Start only the backend services:
   ```bash
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
# LiveKit server credentials — must match the `keys:` map in livekit.yaml (key id and secret)
LIVEKIT_API_KEY=devkey
LIVEKIT_API_SECRET=secret

# WebSocket URL of the LiveKit server (use wss:// in production)
PUBLIC_LIVEKIT_URL=ws://127.0.0.1:7880

# Brand name shown in the UI, page titles, and OG meta tags
PUBLIC_BRAND_NAME=ZooMeet
```

### Variable Reference

| Variable | Required | Description |
|---|---|---|
| `LIVEKIT_API_KEY` | Yes | API key used to sign LiveKit access tokens (server-side only) |
| `LIVEKIT_API_SECRET` | Yes | API secret used to sign LiveKit access tokens (server-side only) |
| `PUBLIC_LIVEKIT_URL` | Yes | WebSocket URL of your LiveKit server, visible to the browser |
| `PUBLIC_BRAND_NAME` | No | App name rendered in the UI, `<title>`, and Open Graph tags. Defaults to `ZooMeet` |

> **Production note**: Set `PUBLIC_LIVEKIT_URL` to your public LiveKit instance (e.g., `wss://livekit.yourdomain.com`) and replace the default `LIVEKIT_API_KEY` / `LIVEKIT_API_SECRET` with strong, randomly generated values.

## License

MIT License
