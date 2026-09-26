export type RoomShapeType = "triangle_vertical" | "slope_run" | "hourglass" | "vertical_shaft" | "normal";
export type TrapType = "shege_spike" | "sapa_drop" | "japa_door" | "gwg_key" | "reverse_zone";
export type TrapDirection = "up" | "down" | "left" | "right";
export type RoomTrap = { type: TrapType; x: number; y: number; direction?: TrapDirection };
export type RoomPoint = { x: number; y: number };
export type RoomData = {
  id: string;
  name: string;
  width: number;
  height: number;
  shapeType: RoomShapeType;
  spawnPoint: RoomPoint;
  exitPoint: RoomPoint;
  tiles: number[][];
  traps: RoomTrap[];
};

export const TILE_EMPTY = 0;
export const TILE_SOLID = 1;
export const TILE_SLOPE_L = 2;
export const TILE_SLOPE_R = 3;
export const TILE_SIZE = 32;

function blank(width: number, height: number) {
  return Array.from({ length: height }, () => Array<number>(width).fill(TILE_EMPTY));
}
function withFloor(tiles: number[][], y: number, from = 0, to = tiles[0].length - 1) {
  for (let x = Math.max(0, from); x <= Math.min(to, tiles[0].length - 1); x += 1) tiles[y][x] = TILE_SOLID;
}
function roomBase(id: string, name: string, width: number, height: number, shapeType: RoomShapeType): RoomData {
  return { id, name, width, height, shapeType, spawnPoint: { x: 1, y: height - 2 }, exitPoint: { x: width - 2, y: 1 }, tiles: blank(width, height), traps: [] };
}

function pyramidRoom(): RoomData {
  const room = roomBase("room_pyramid_climb_01", "Pyramid Climb", 20, 24, "triangle_vertical");
  for (let y = 4; y < 24; y += 1) { const inset = Math.floor((y - 4) * 0.42); withFloor(room.tiles, y, inset, room.width - inset - 1); }
  for (let y = 5; y < 22; y += 4) { const inset = Math.floor((y - 4) * 0.42); room.tiles[y][inset + 2] = TILE_SLOPE_R; room.tiles[y][room.width - inset - 3] = TILE_SLOPE_L; }
  room.spawnPoint = { x: 9, y: 22 }; room.exitPoint = { x: 9, y: 3 };
  room.traps = [{ type: "shege_spike", x: 9, y: 18, direction: "up" }, { type: "sapa_drop", x: 6, y: 14 }, { type: "gwg_key", x: 9, y: 9 }, { type: "japa_door", x: 9, y: 3 }];
  return room;
}
function slopeRunRoom(): RoomData {
  const room = roomBase("room_sloped_run_01", "Sloped Run", 36, 16, "slope_run");
  withFloor(room.tiles, 14);
  for (let x = 1; x < 35; x += 1) { const y = 13 - Math.floor(x / 6); if (y >= 2) room.tiles[y][x] = x % 2 ? TILE_SLOPE_R : TILE_SLOPE_L; }
  room.spawnPoint = { x: 2, y: 12 }; room.exitPoint = { x: 33, y: 3 };
  room.traps = [4, 11, 18, 26].map((x) => ({ type: "shege_spike" as const, x, y: 12, direction: "up" as const }));
  room.traps.push({ type: "reverse_zone", x: 22, y: 10 }, { type: "japa_door", x: 33, y: 3 });
  return room;
}
function hourglassRoom(): RoomData {
  const room = roomBase("room_hourglass_bottleneck_01", "The Hourglass Bottleneck", 28, 22, "hourglass");
  for (let y = 4; y < 22; y += 1) { const distance = Math.abs(y - 12); const half = Math.min(13, 3 + distance); withFloor(room.tiles, y, 14 - half, 13 + half); }
  withFloor(room.tiles, 12, 10, 17);
  room.spawnPoint = { x: 4, y: 20 }; room.exitPoint = { x: 23, y: 2 };
  room.traps = [{ type: "sapa_drop", x: 13, y: 12 }, { type: "reverse_zone", x: 14, y: 12 }, { type: "shege_spike", x: 16, y: 12, direction: "up" }, { type: "gwg_key", x: 20, y: 6 }, { type: "japa_door", x: 23, y: 2 }];
  return room;
}
function shaftRoom(): RoomData {
  const room = roomBase("room_vertical_shaft_01", "Tall Vertical Shaft", 15, 45, "vertical_shaft");
  for (let y = 2; y < 45; y += 1) { room.tiles[y][0] = TILE_SOLID; room.tiles[y][14] = TILE_SOLID; if (y % 3 === 0) withFloor(room.tiles, y, y % 2 ? 2 : 7, y % 2 ? 7 : 12); }
  room.spawnPoint = { x: 2, y: 42 }; room.exitPoint = { x: 6, y: 2 };
  room.traps = [{ type: "shege_spike", x: 6, y: 36, direction: "down" }, { type: "sapa_drop", x: 3, y: 27 }, { type: "reverse_zone", x: 8, y: 18 }, { type: "gwg_key", x: 5, y: 9 }, { type: "japa_door", x: 6, y: 2 }];
  return room;
}
function normalRoom(): RoomData {
  const room = roomBase("room_normal_struggle_01", "Normal Struggle", 24, 16, "normal");
  withFloor(room.tiles, 14); for (const [x, y] of [[4, 11], [9, 9], [14, 7], [18, 5]]) room.tiles[y][x] = TILE_SOLID;
  room.spawnPoint = { x: 2, y: 12 }; room.exitPoint = { x: 21, y: 3 }; room.traps = [{ type: "shege_spike", x: 8, y: 13, direction: "up" }, { type: "gwg_key", x: 17, y: 4 }, { type: "japa_door", x: 21, y: 3 }];
  return room;
}

export const ROOM_PREFABS: RoomData[] = [pyramidRoom(), slopeRunRoom(), hourglassRoom(), shaftRoom(), normalRoom()];
export const createEmptyRoom = (width = 20, height = 15): RoomData => ({ ...roomBase("custom_room", "Untitled Shege Room", width, height, "normal"), spawnPoint: { x: 1, y: height - 2 }, exitPoint: { x: width - 2, y: 1 } });
export function cloneRoom(room: RoomData): RoomData { return JSON.parse(JSON.stringify(room)) as RoomData; }
export function validateRoom(room: RoomData): string[] {
  const issues: string[] = [];
  if (!room.id.trim()) issues.push("Room id is required.");
  if (!room.name.trim()) issues.push("Room name is required.");
  if (room.width < 15 || room.width > 60 || room.height < 15 || room.height > 60) issues.push("Room dimensions must be between 15 and 60 tiles.");
  if (room.tiles.length !== room.height || room.tiles.some((row) => row.length !== room.width)) issues.push("Tile array dimensions do not match width and height.");
  if (room.spawnPoint.x < 0 || room.spawnPoint.x >= room.width || room.spawnPoint.y < 0 || room.spawnPoint.y >= room.height) issues.push("Spawn point must be inside the room tile grid.");
  if (room.exitPoint.x < 0 || room.exitPoint.x >= room.width || room.exitPoint.y < 0 || room.exitPoint.y >= room.height) issues.push("Exit point must be inside the room tile grid.");
  room.tiles.flat().forEach((tile) => { if (![TILE_EMPTY, TILE_SOLID, TILE_SLOPE_L, TILE_SLOPE_R].includes(tile)) issues.push(`Unknown tile value: ${tile}`); });
  return Array.from(new Set(issues));
}
