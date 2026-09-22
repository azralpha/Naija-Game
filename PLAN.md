# Naija Normal Level — Build Plan

## Product target
A complete, mobile-browser-friendly 2D rage platformer with high-contrast pixel styling, touch controls, instant retry flow, Nigerian-themed worlds, debt scoring, collectible Japa Keys, and generated Web Audio chiptune.

## Risk slices
1. **Core movement and collision**: fixed virtual 960×540 canvas, responsive scaling, keyboard/touch input, platform collision, camera follow, exit detection.
2. **Hazard readability**: one data-driven hazard representation with penalty values and distinct visuals; death state holds the game for 0.9s, updates Gbese, then respawns.
3. **Menu and persistence**: menu → world select → game → clear/pause transitions; localStorage carries Gbese, keys, and unlocked worlds.
4. **Audio and mobile**: Web Audio begins only after first pointer/keyboard input; canvas touch zones are large and visible.

## Verification criteria
- `/` shows branded title screen and responds to pointer/tap.
- World Select shows Sapa Nation, Shege Pro Max, Trenches & Katakata, plus Soft Life locked as “Coming Soon”.
- A playable stage has visible platforms, spikes, hazards, exit door, key collectibles, camera motion, and touch controls.
- Dying updates Gbese with the correct trap penalty and respawns after a short message overlay.
- Reaching the exit clears the level and applies the ₦2,000 payout.
- `?demo` starts the first stage with a deterministic auto-run showcase.
- `pnpm check` passes with no TypeScript errors.

## Hybrid arena slice completed

The first multiplayer slice adds Socket.IO room management with a 50-player cap, 20 Hz player snapshots, live Gbese leaderboard broadcasts, three server-validated trap tokens, remote-player rendering, and touch-ready trap placement. The client also supports `!echoke`, `!upnepa`, `!villagepeople`, and `!godabeg` event handling. YouTube Live Chat support is implemented through the official API flow, with the server-side `YOUTUBE_API_KEY` still required before a creator can connect a live broadcast.
