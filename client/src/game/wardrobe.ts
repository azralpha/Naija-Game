export type WardrobeGroup = "A" | "B";
export type WardrobeItem = { id: string; label: string; color: string; group: WardrobeGroup; price: number };

export const GROUP_A_TOPS: WardrobeItem[] = [
  { id: "a-top-red", label: "Red Top", color: "#FF0000", group: "A", price: 0 },
  { id: "a-top-yellow", label: "Yellow Top", color: "#FFD700", group: "A", price: 0 },
  { id: "a-top-blue", label: "Blue Top", color: "#0000FF", group: "A", price: 0 },
  { id: "a-top-green", label: "Green Top", color: "#008000", group: "A", price: 0 },
];

export const GROUP_A_BOTTOMS: WardrobeItem[] = [
  { id: "a-bottom-red", label: "Red Shorts", color: "#FF0000", group: "A", price: 0 },
  { id: "a-bottom-yellow", label: "Yellow Shorts", color: "#FFD700", group: "A", price: 0 },
  { id: "a-bottom-blue", label: "Blue Shorts", color: "#0000FF", group: "A", price: 0 },
  { id: "a-bottom-green", label: "Green Shorts", color: "#008000", group: "A", price: 0 },
];

const METALS: Array<[string, string, string]> = [
  ["silver", "Silver", "#C0C0C0"], ["chrome", "Chrome", "#E2F0CB"], ["gunmetal", "Gunmetal", "#2A3439"],
  ["pewter", "Pewter", "#899499"], ["titanium", "Titanium", "#878681"], ["pearl", "Pearl", "#FDEEF4"],
  ["electrum", "Electrum", "#D4AF37"], ["emerald", "Metallic Emerald", "#50C878"], ["sapphire", "Sapphire Sparkle", "#0F52BA"], ["midnight", "Metallic Midnight Blue", "#003366"],
];
export const GROUP_B_TOPS: WardrobeItem[] = METALS.map(([id, label, color]) => ({ id: `b-top-${id}`, label: `${label} Top`, color, group: "B", price: 300 }));
export const GROUP_B_BOTTOMS: WardrobeItem[] = METALS.map(([id, label, color]) => ({ id: `b-bottom-${id}`, label: `${label} Shorts`, color, group: "B", price: 300 }));

export const DEFAULT_WARDROBE = {
  username: "Sapa Soldier",
  equippedGroup: "A" as WardrobeGroup,
  topId: GROUP_A_TOPS[3].id,
  bottomId: GROUP_A_BOTTOMS[2].id,
  nameGlow: false,
  titleBadge: "",
  titleBadgeUnlocked: false,
  unlockedB: [] as string[],
  bundleUnlocked: false,
};

export function itemById(id: string) {
  return [...GROUP_A_TOPS, ...GROUP_A_BOTTOMS, ...GROUP_B_TOPS, ...GROUP_B_BOTTOMS].find((item) => item.id === id);
}

export function isUnlocked(item: WardrobeItem, wardrobe: typeof DEFAULT_WARDROBE) {
  return item.group === "A" || wardrobe.bundleUnlocked || wardrobe.unlockedB.includes(item.id);
}

export function equipItem(item: WardrobeItem, wardrobe: typeof DEFAULT_WARDROBE) {
  const next = { ...wardrobe, equippedGroup: item.group };
  if (item.id.includes("top-")) next.topId = item.id;
  else next.bottomId = item.id;
  if (item.group === "A") {
    if (item.id.includes("top-")) next.bottomId = next.bottomId.startsWith("a-") ? next.bottomId : GROUP_A_BOTTOMS[0].id;
    if (item.id.includes("bottom-")) next.topId = next.topId.startsWith("a-") ? next.topId : GROUP_A_TOPS[0].id;
  } else {
    if (item.id.includes("top-")) next.bottomId = next.bottomId.startsWith("b-") ? next.bottomId : GROUP_B_BOTTOMS[0].id;
    if (item.id.includes("bottom-")) next.topId = next.topId.startsWith("b-") ? next.topId : GROUP_B_TOPS[0].id;
  }
  return next;
}
