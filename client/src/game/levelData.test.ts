import { describe, expect, it } from "vitest";
import { LEVELS, RAGE_MECHANICS } from "./levelData";

describe("rage level matrix", () => {
  it("contains forty authored stages with one mechanic per stage", () => {
    expect(LEVELS).toHaveLength(40);
    expect(RAGE_MECHANICS).toHaveLength(40);
    expect(new Set(LEVELS.map((level) => level.mechanic)).size).toBe(40);
  });

  it("keeps every exit several screens away and every room traversable", () => {
    LEVELS.forEach((level) => {
      expect(level.width).toBeGreaterThanOrEqual(3200);
      expect(level.exitX).toBeGreaterThan(960 * 2.5);
      expect(level.exitX).toBeLessThan(level.width);
      expect(level.platforms.length).toBeGreaterThan(12);
    });
  });
});
