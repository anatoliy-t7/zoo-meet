# Huddle

Huddle is a secure, open-source video conferencing application powered by LiveKit and SvelteKit.

## Features

- **End-to-End Encryption** (WebRTC)
- **Pre-Join Screen**: Setup your microphone and camera before entering the room
- **Responsive Video Grid**: Auto-scaling layout for multiple participants
- **Screen Sharing**: Present your screen with a click
- **Text Chat**: In-call text messages using WebRTC DataChannels
- **Self-Hosted Backend**: Bundled with a LiveKit server via Docker Compose

## Tech Stack

- **Frontend**: SvelteKit, Svelte 5, Tailwind CSS, Lucide Icons
- **WebRTC Client**: `livekit-client`
- **Backend / API**: SvelteKit API routes, `livekit-server-sdk`
- **Infrastructure**: Docker, Docker Compose, LiveKit Server, Valkey

## Getting Started (Local Development)

The easiest way to get started is by running the entire stack (LiveKit Server, Valkey, and the Huddle App) locally using Docker Compose.

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and Docker Compose
- Node.js 22+ (if you wish to run the frontend outside of Docker)

### Running the Full Stack

1. Clone the repository and navigate into the project directory:
   ```bash
   git clone https://github.com/suitenumerique/meet.git
   cd huddle
   ```

2. Start the Docker Compose stack:
   ```bash
   docker compose up --build
   ```

   This will spin up three containers:
   - `livekit`: The WebRTC backend (binding to ports `7880`, `7881`, and `50000-50050/udp`)
   - `valkey`: State storage for LiveKit
   - `huddle`: The SvelteKit frontend web application

3. Open your browser and navigate to **[http://localhost:3000](http://localhost:3000)**.

### Running Frontend Separately (Without Docker for Huddle)

If you prefer to run the SvelteKit app locally for development (with Hot Module Replacement) while only running LiveKit in Docker:

1. Start only LiveKit and Valkey:
   ```bash
   docker compose up livekit valkey -d
   ```

2. Install dependencies using `pnpm`:
   ```bash
   pnpm install
   ```

3. Start the development server:
   ```bash
   pnpm dev
   ```

4. Open your browser and navigate to `http://localhost:5173`.

## Environment Variables

The project comes with a `.env` file pre-configured for local development. If you deploy this to production, you must update these values:

```env
LIVEKIT_API_KEY=devkey
LIVEKIT_API_SECRET=secret
PUBLIC_LIVEKIT_URL=ws://127.0.0.1:7880
```

> **Note**: For production deployments, `PUBLIC_LIVEKIT_URL` should point to your public LiveKit instance (e.g., `wss://livekit.yourdomain.com`).

## License

MIT License