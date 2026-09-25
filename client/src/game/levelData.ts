export type WorldIndex = 0 | 1 | 2 | 3;
export type LevelHazardKind = "spike" | "disappear" | "movingWall" | "lateSpike" | "reverse" | "gravityFlip" | "multi" | "teleporter" | "jumpPad" | "safetyTile" | "glue" | "boulder" | "shoker" | "fakeKey" | "fakeCoin" | "mudSweep";
export type LevelPlatform = { x: number; y: number; w: number; h: number; color: string };
export type LevelHazard = { kind: LevelHazardKind; x: number; y: number; w: number; h: number; penalty: number; label: string; phase?: number };
export const RAGE_MECHANICS = [
  "fake-solid-floor", "sinking-ledges", "awoof-gravity-coin", "door-teleport-left", "fade-platform", "permanent-reverse", "glue-lock", "walk-only-bridge", "fake-door-pair", "apex-disintegration",
  "landing-spikes", "falling-ceiling", "shrinking-platforms", "elastic-ground", "invisible-wall", "key-lock-betrayal", "conveyor-pit", "door-floor-drop", "phantom-spikes", "reverse-clone",
  "air-ui-blackout", "fake-pause-anvil", "camera-flip", "hidden-secondary-door", "zero-friction", "closing-pillars", "apex-expanding-pit", "falling-scare-platform", "delayed-jump", "spike-door",
  "gravity-zones", "jump-blackout", "moving-door", "contact-explosion", "fake-game-over", "backwind", "shifting-respawn", "tiny-platforms", "spike-wall-timer", "gauntlet",
] as const;
export type RageMechanic = typeof RAGE_MECHANICS[number];
export type LevelDefinition = { world: WorldIndex; level: number; name: string; mechanic: RageMechanic; map: string[]; platforms: LevelPlatform[]; hazards: LevelHazard[]; exitX: number; spawn: { x: number; y: number }; width: number };

const WORLD_COLORS = ["#4f413c", "#5b262d", "#2e3d51", "#4a3568"];
const WORLD_NAMES = ["Sapa Nation", "Shege Pro Max", "Trenches & Katakata", "Soft Life Protocol"];
const WORLD_LABELS = ["basic traps", "escalation", "full chaos", "god mode"];

// Each room is an authored 16 x 8 tile map. S = spawn, D = Japa Door, # = solid, ^ = spike.
// M/R/G/X are deliberately authored hazard tiles, so no two rooms share the same physical route.
const ROOM_MAPS: string[][][] = [
  [
    ["................", "................", "................", "......#.........", "..#......#......", "S....#.....#..D.", "################", "################"],
    ["................", "................", "....#...........", "........#.......", "..#.........#...", "S....^....#....D.", "################", "################"],
    ["................", "................", "........#.......", "...#............", ".....#......#...", "S..^....#.....D.", "################", "################"],
    ["................", "......#.........", "...........#....", "...#........#...", ".....#..........", "S..^..M....^..D.", "################", "################"],
    ["................", "..#.............", "......#.........", "..........#.....", "....^.......#...", "S.....#...^...D.", "################", "################"],
    ["................", ".........#......", "...#............", "......#.....#...", "..^......^......", "S....M.....#..D.", "################", "################"],
    ["................", "...#............", "........#.......", "..#.........#...", ".....^.........#", "S..M....#....^D.", "################", "################"],
    ["................", "......#.........", "..#.........#...", "........#.......", "....^....^......", "S..M..#.....#D.", "################", "################"],
    ["................", "....#...........", ".........#......", "..#.........#...", "......^.........", "S..M....^...#D.", "################", "################"],
    ["................", "...#.........#..", "......#.........", "..........#.....", "..^....^........", "S..M..#.....^D.", "################", "################"],
  ],
  [
    ["................", "........#.......", "...#............", "......^.....#...", "..#.............", "S....R....^...D.", "################", "################"],
    ["................", "..#.........#...", "......#.........", "....^......^....", ".........#......", "S..R..#.......D.", "################", "################"],
    ["................", ".....#..........", "..#........#....", "........^.......", "....#.......#...", "S..R...^......D.", "################", "################"],
    ["................", "...#............", "........#.......", "..^.........#...", "......M.........", "S....R....^...D.", "################", "################"],
    ["................", ".........#......", "..#......^......", "......#......#..", "....^...........", "S..R..M......D.", "################", "################"],
    ["................", "..#..........#..", "......#.........", "....^.....^.....", ".........#......", "S..R..M....#..D.", "################", "################"],
    ["................", "......#.........", "..#.........#...", "........^.......", "....#...........", "S.R..M...^....D.", "################", "################"],
    ["................", "...#.......#....", "......^.........", "..#.........#...", ".........M......", "S..R....^....D.", "################", "################"],
    ["................", ".....#..........", "..^.........#...", "........#.......", "....M....^......", "S..R..#.......D.", "################", "################"],
    ["................", "..#......#......", "......^.........", "....#.......#...", ".........M......", "S..R....^....D.", "################", "################"],
  ],
  [
    ["................", "....#....#......", "..^.........#...", "......G.........", "...#....^.......", "S..R..X......D.", "################", "################"],
    ["................", "...#.........#..", "......^.........", "..G.....#.......", ".........^......", "S..R..X.....D.", "################", "################"],
    ["................", "..#......#......", "....^.........#.", "......G.........", "...#......^.....", "S.R...X.......D.", "################", "################"],
    ["................", ".....#..........", "..^.....#.......", "........G..#....", "....X.......^...", "S..R.........D.", "################", "################"],
    ["................", "..#.........#...", ".....G..........", "....^.....#.....", "......X....^....", "S..R.......D.", "################", "################"],
    ["................", "...#.....#......", "..^.....G.......", ".........^......", "....X......#....", "S.R.........D.", "################", "################"],
    ["................", "....#........#..", "......G.........", "..^.......#.....", "........X..^....", "S..R.......D.", "################", "################"],
    ["................", "..#......#......", "....^......G....", ".......X........", ".........^......", "S..R......#..D.", "################", "################"],
    ["................", "...#.........#..", "......G........", "..^.....X.......", ".........^......", "S.R.........D.", "################", "################"],
    ["................", "..#.....#.......", "....^.....G.....", ".......X....#...", ".........^......", "S..R.......D.", "################", "################"],
  ],
  [
    ["................", "..#....G....#...", "...^...X........", "......R.........", "....#......^....", "S..M.........D.", "################", "################"],
    ["................", "...#......#.....", "..G....^........", ".......X....#...", "....R..........", "S..M.......D.", "################", "################"],
    ["................", "..#....#........", "....^....G......", "......X.....#...", ".......R........", "S..M.......D.", "################", "################"],
    ["................", ".....#..........", "..G......^......", "....X.......#...", "......R.........", "S..M....^...D.", "################", "################"],
    ["................", "...#.....G......", "..^.....X....#..", ".......R........", "....#...........", "S..M.......D.", "################", "################"],
    ["................", "..#........#....", "....G...^.......", "......X.........", ".......R...#....", "S..M....^...D.", "################", "################"],
    ["................", "....#..G........", "..^......X......", ".......R....#...", "....M...........", "S...........D.", "################", "################"],
    ["................", "..#....X...#....", "....^...G.......", "......R.........", ".......M...^....", "S..........D.", "################", "################"],
    ["................", "...#...G........", "..^.......X.....", "......R.....#...", "....M...........", "S...........D.", "################", "################"],
    ["................", "..#..G....X.....", "....^...R....#..", "......M.........", ".........^......", "S..........D.", "################", "################"],
  ],
];

function tileRowsToDefinition(world: WorldIndex, level: number, rows: string[]): LevelDefinition {
  const color = WORLD_COLORS[world];
  const platforms: LevelPlatform[] = [];
  const hazards: LevelHazard[] = [];
  let spawn = { x: 48, y: 390 };
  let exitX = 15 * 64;
  rows.forEach((row, rowIndex) => row.split("").forEach((tile, col) => {
    const x = col * 64;
    const y = rowIndex * 64;
    if (tile === "#") platforms.push({ x, y: Math.max(0, y), w: 64, h: rowIndex >= 6 ? 42 : 28, color });
    if (tile === "S") spawn = { x: x + 20, y: y + 28 };
    if (tile === "D") exitX = x;
    const hazard = ({ "^": "spike", "M": "movingWall", "R": "reverse", "G": "gravityFlip", "X": "multi" } as Record<string, LevelHazardKind>)[tile];
    if (hazard) hazards.push({ kind: hazard, x: x + (hazard === "spike" ? 4 : 0), y: hazard === "spike" ? y + 34 : y + 18, w: hazard === "spike" ? 56 : 52, h: hazard === "spike" ? 24 : 80, penalty: 80 + world * 90 + level * 12, label: hazard === "spike" ? "SAPA SPIKE" : hazard === "movingWall" ? "WAHALA WALL" : hazard === "reverse" ? "VILLAGE PEOPLE" : hazard === "gravityFlip" ? "E CHOKE" : "KATAKATA", phase: col * 0.23 });
  }));
  // Sapa Nation starts gently, then introduces the exact Level Devil-style betrayals.
  if (world === 0 && level >= 4) {
    hazards.push({ kind: "lateSpike", x: 600 + level * 34, y: 418, w: 58, h: 26, penalty: 130 + level * 12, label: "GOD ABEG SPIKE" });
    hazards.push({ kind: "teleporter", x: 840 + level * 44, y: 382, w: 52, h: 66, penalty: 180, label: "JAPA WORMHOLE" });
    hazards.push({ kind: "movingWall", x: 300 + level * 46, y: 320, w: 44, h: 128, penalty: 160, label: "WAHALA WALL", phase: level * 0.4 });
  } else if (world === 0 && (level === 2 || level === 3)) {
    hazards.push({ kind: "disappear", x: 320 + level * 46, y: 448, w: 62, h: 24, penalty: 90, label: "SAPA FLOOR" });
  }
  const utilityX = 230 + ((world * 97 + level * 61) % 620);
  hazards.push({ kind: "jumpPad", x: utilityX, y: 430, w: 54, h: 20, penalty: 0, label: "AWOOF JUMP PAD" });
  hazards.push({ kind: "safetyTile", x: Math.min(utilityX + 170, 820), y: 310, w: 54, h: 18, penalty: 0, label: "FLOATING SAFETY TILE" });
  if (level % 3 === 0) hazards.push({ kind: "glue", x: utilityX + 80, y: 430, w: 58, h: 20, penalty: 140, label: "GBESE GLUE" });
  if (world >= 1 && level % 2 === 0) hazards.push({ kind: "boulder", x: 520, y: 250, w: 30, h: 30, penalty: 220, label: "SAPA BOULDER" });
  if (world >= 2 && level % 3 === 1) hazards.push({ kind: "shoker", x: 650, y: 300, w: 62, h: 150, penalty: 260, label: "SHOKER TUNNEL" });
  if (world >= 1 && level % 4 === 0) hazards.push({ kind: "fakeKey", x: 560, y: 350, w: 30, h: 34, penalty: 180, label: "FAKE JAPA KEY" });
  if (world >= 1 && level % 5 === 0) hazards.push({ kind: "fakeCoin", x: 760, y: 348, w: 28, h: 28, penalty: 2000, label: "FAKE COIN DROP" });
  if (world === 2 && level % 2 === 1) hazards.push({ kind: "mudSweep", x: 420, y: 430, w: 260, h: 20, penalty: 190, label: "TRENCHES MUD SWEEP" });
  // The door is intentionally not always on the same tile even when the room ends.
  const mechanic = RAGE_MECHANICS[world * 10 + level - 1];
  const width = 3200 + world * 160 + level * 24;
  exitX = 2680 + ((world * 10 + level) * 97) % 480;
  return { world, level, name: `${WORLD_NAMES[world]} ${level}`, mechanic, map: rows, platforms, hazards, exitX, spawn, width };
}

export const LEVELS: LevelDefinition[] = ROOM_MAPS.flatMap((worldRooms, world) => worldRooms.map((rows, index) => tileRowsToDefinition(world as WorldIndex, index + 1, rows)));
export const getLevel = (world: WorldIndex, level: number) => LEVELS[world * 10 + Math.max(1, Math.min(10, level)) - 1];
export const worldDifficulty = (world: WorldIndex) => WORLD_LABELS[world];
