import { describe, expect, it } from "vitest";
import { ROOM_PREFABS, addPlatform, snapToGrid, validateRoomPrefab } from "./roomPrefabs";

describe("room prefab editor primitives", () => {
  it("ships anchored modular rooms with valid platform geometry", () => {
    expect(ROOM_PREFABS.length).toBeGreaterThanOrEqual(4);
    ROOM_PREFABS.forEach((room) => expect(validateRoomPrefab(room)).toEqual([]));
  });
  it("snaps new platform instances to the tile grid", () => {
    const room = ROOM_PREFABS[0];
    expect(snapToGrid(47, room.tileSize)).toBe(32);
    const next = addPlatform(room, { kind: "one-way", x: 47, y: 145, w: 96, h: 20, color: "#fff", trapSlots: [] });
    expect(next.platforms.at(-1)?.x).toBe(32);
    expect(next.platforms.at(-1)?.y).toBe(160);
  });
});
