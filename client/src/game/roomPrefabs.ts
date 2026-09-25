export type PlatformKind = "solid" | "one-way" | "moving";
export type Anchor = { x: number; y: number; label: string };
export type Waypoint = { x: number; y: number };
export type PlatformInstance = {
  id: string;
  kind: PlatformKind;
  x: number;
  y: number;
  w: number;
  h: number;
  waypoints?: Waypoint[];
  trapSlots?: string[];
  color: string;
};
export type RoomPrefab = {
  id: string;
  label: string;
  cols: number;
  rows: number;
  tileSize: number;
  entry: Anchor;
  exit: Anchor;
  platforms: PlatformInstance[];
};

const base = (id: string, x: number, y: number, w: number, h: number, kind: PlatformKind = "solid"): PlatformInstance => ({ id, kind, x, y, w, h, color: "#4f413c", trapSlots: [] });

export const ROOM_PREFABS: RoomPrefab[] = [
  { id: "tunnel-escape", label: "Tunnel Escape", cols: 20, rows: 8, tileSize: 32, entry: { x: 32, y: 384, label: "ENTRY" }, exit: { x: 608, y: 384, label: "EXIT" }, platforms: [base("floor", 0, 416, 640, 32), base("roof", 0, 96, 640, 24), base("ledge-a", 128, 320, 128, 20, "one-way"), base("ledge-b", 352, 256, 128, 20, "one-way")] },
  { id: "double-jump-tower", label: "Double-Jump Tower", cols: 16, rows: 12, tileSize: 32, entry: { x: 32, y: 352, label: "ENTRY" }, exit: { x: 448, y: 64, label: "EXIT" }, platforms: [base("floor", 0, 384, 512, 32), base("step-a", 96, 304, 128, 20, "one-way"), base("step-b", 288, 224, 128, 20, "one-way"), base("step-c", 96, 144, 128, 20, "one-way"), { ...base("moving-lift", 320, 96, 96, 20, "moving"), waypoints: [{ x: 320, y: 96 }, { x: 416, y: 96 }] }] },
  { id: "trap-alley", label: "Trap Alley", cols: 24, rows: 8, tileSize: 32, entry: { x: 32, y: 384, label: "ENTRY" }, exit: { x: 736, y: 384, label: "EXIT" }, platforms: [base("floor", 0, 416, 768, 32), base("safe-a", 96, 320, 96, 20, "one-way"), base("safe-b", 320, 288, 96, 20, "one-way"), base("safe-c", 544, 336, 96, 20, "one-way")] },
  { id: "one-way-platform-climb", label: "One-Way Platform Climb", cols: 22, rows: 12, tileSize: 32, entry: { x: 32, y: 384, label: "ENTRY" }, exit: { x: 640, y: 64, label: "EXIT" }, platforms: [base("floor", 0, 416, 704, 32), base("one-way-1", 64, 336, 160, 20, "one-way"), base("one-way-2", 288, 272, 160, 20, "one-way"), base("one-way-3", 512, 208, 160, 20, "one-way"), { ...base("patrol", 352, 112, 128, 20, "moving"), waypoints: [{ x: 352, y: 112 }, { x: 480, y: 112 }] }] },
];

export function snapToGrid(value: number, tileSize = 32) { return Math.round(value / tileSize) * tileSize; }
export function addPlatform(room: RoomPrefab, input: Omit<PlatformInstance, "id">): RoomPrefab {
  const id = `${room.id}-platform-${room.platforms.length + 1}`;
  return { ...room, platforms: [...room.platforms, { ...input, id, x: snapToGrid(input.x, room.tileSize), y: snapToGrid(input.y, room.tileSize) }] };
}
export function validateRoomPrefab(room: RoomPrefab) {
  const issues: string[] = [];
  if (!room.entry || !room.exit) issues.push("Entry and exit anchors are required.");
  if (!room.platforms.some((platform) => platform.x <= room.entry.x && platform.x + platform.w >= room.entry.x)) issues.push("Entry anchor is not supported by a platform.");
  if (!room.platforms.some((platform) => platform.x <= room.exit.x && platform.x + platform.w >= room.exit.x)) issues.push("Exit anchor is not supported by a platform.");
  room.platforms.forEach((platform) => { if (platform.w <= 0 || platform.h <= 0) issues.push(`${platform.id} has invalid dimensions.`); if (platform.kind === "moving" && !platform.waypoints?.length) issues.push(`${platform.id} needs waypoint nodes.`); });
  return issues;
}
