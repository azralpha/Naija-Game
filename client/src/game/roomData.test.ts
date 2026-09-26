import { describe, expect, it } from "vitest";
import { createEmptyRoom, ROOM_PREFABS, TILE_EMPTY, TILE_SOLID, TILE_SLOPE_L, TILE_SLOPE_R, validateRoom } from "./roomData";

describe("Level Shege room data", () => {
  it("ships five diverse geometry prefabs with valid JSON-compatible shapes", () => {
    expect(ROOM_PREFABS).toHaveLength(5);
    ROOM_PREFABS.forEach((room) => {
      expect(room.tiles).toHaveLength(room.height);
      expect(room.tiles.every((row) => row.length === room.width)).toBe(true);
      expect(room.tiles.flat().every((tile) => [TILE_EMPTY, TILE_SOLID, TILE_SLOPE_L, TILE_SLOPE_R].includes(tile))).toBe(true);
      expect(validateRoom(room)).toEqual([]);
    });
  });
  it("creates custom rooms at editor-safe dimensions", () => {
    const room = createEmptyRoom(60, 60);
    expect(room.width).toBe(60);
    expect(room.height).toBe(60);
    expect(validateRoom(room)).toEqual([]);
    expect(validateRoom({ ...room, spawnPoint: { x: -1, y: -1 } })).toContain("Spawn point must be inside the room tile grid.");
    expect(validateRoom({ ...room, exitPoint: { x: 99, y: 99 } })).toContain("Exit point must be inside the room tile grid.");
  });
});
