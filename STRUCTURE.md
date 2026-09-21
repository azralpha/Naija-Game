# Naija Normal Level — Structure

The game uses React only as the full-screen host. `GameCanvas.tsx` owns the canvas lifecycle and a compact framework-agnostic simulation loop.

- **GameCanvas**: owns resize handling, pointer/keyboard input, render loop, and menu/game state.
- **GameState**: menu, worldSelect, options, credits, playing, paused, dead, clear.
- **SaveData**: persistent Gbese debt, collected Japa Keys, highest unlocked world.
- **Stage**: generated from a data-driven world theme and hazard list.
- **Player**: velocity, gravity, ground contact, control modifiers, spawn point.
- **Hazards**: all traps share a `kind`, `penalty`, bounds, and optional animation state.
- **Audio**: Web Audio scheduler creates the loopable 8-bit/Fuji-inspired backing pattern after first user gesture.

Rendering is intentionally pixel-forward: the simulation uses a 960×540 virtual viewport and draws crisp shapes with `imageSmoothingEnabled = false`, then scales to the device canvas.
