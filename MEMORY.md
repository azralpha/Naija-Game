# Naija Normal Level — Memory

The hybrid multiplayer slice is implemented on top of the existing canvas game without removing the offline loop. Socket.IO is installed in `package.json`; `client/src/game/online.ts` is the typed client adapter; `server/index.ts` owns 50-player room state, 20 Hz snapshots, trap validation, leaderboard broadcasts, and streamer endpoints.

The live chat integration follows the official YouTube Data API flow: resolve an active chat from a video ID or `@channel` handle, then consume `liveChatMessages` with the API-provided polling interval. The server requires a secret environment variable named `YOUTUBE_API_KEY`; no key is committed or exposed in the browser.

The WebDev preview serves the Vite client, so the live Socket.IO server is fully built and smoke-tested from the production bundle but requires the published backend process to be running for real multiplayer. For a persistent in-memory room server and YouTube poller, use WebDev Reserved Hosting; the documented full-utilization ceiling is up to $37.50/month before the included $10 monthly usage credit, plus metered egress.

The client supports `?demo` for deterministic solo gameplay. The arena is entered through the red Online Arena button on the title screen; the arena lobby has quick match, streamer configuration, and a back action. The live game HUD adds remote player names, a leaderboard, a Drop Trap action, and global streamer hazards.
