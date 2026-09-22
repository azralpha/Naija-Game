# Naija Normal Level

Nigeria level devil — a pixel rage platformer about surviving the shege.

> Fuck around and Sabi am

## Modes

- **Offline Mode:** Classic platforming across Sapa Nation, Shege Pro Max, and Trenches & Katakata with Gbese scoring, Japa Keys, hazards, touch controls, keyboard controls, pause/options/credits screens, and synthesized Web Audio music.
- **Online Arena:** Socket.IO rooms for up to 50 players, remote-player synchronization, live Gbese leaderboards, server-validated sabotage traps, and streamer-triggered hazards.

## Stack

Canvas API, React, TypeScript, Vite, Web Audio API, Express, and Socket.IO.

## Development

```bash
pnpm install
pnpm dev
```

Run checks and build the production bundle with:

```bash
pnpm check
pnpm build
```

## Streamer integration

The server supports YouTube Live Chat through the official YouTube Data API. Configure the server-only `YOUTUBE_API_KEY` secret before connecting a live broadcast. Supported chat triggers are `!echoke`, `!upnepa`, `!villagepeople`, and `!godabeg`.

## Developer

Azamen (Alpha Collective Corporation)
