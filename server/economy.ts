export type Gateway = "paystack" | "flutterwave";
export type TransactionStatus = "pending" | "success" | "failed";

export const GU_PACKAGES = {
  flex_starter: { amountNgn: 300, gu: 350 },
  oga_bundle: { amountNgn: 1000, gu: 1500 },
  chairman_pack: { amountNgn: 2000, gu: 3200 },
  dev_water: { amountNgn: 1000, tip: true },
  dev_masa: { amountNgn: 2000, tip: true },
  dev_generator: { amountNgn: 5000, tip: true },
  oga_chairman_support: { amountNgn: 10000, tip: true },
} as const;

export const COSMETIC_COSTS: Record<string, number> = {
  "b-top-silver": 300, "b-bottom-silver": 300, "b-top-chrome": 300, "b-bottom-chrome": 300,
  "b-top-gunmetal": 300, "b-bottom-gunmetal": 300, "b-top-pewter": 300, "b-bottom-pewter": 300,
  "b-top-titanium": 300, "b-bottom-titanium": 300, "b-top-pearl": 300, "b-bottom-pearl": 300,
  "b-top-electrum": 300, "b-bottom-electrum": 300, "b-top-emerald": 300, "b-bottom-emerald": 300,
  "b-top-sapphire": 300, "b-bottom-sapphire": 300, "b-top-midnight": 300, "b-bottom-midnight": 300,
  "title_oga_boss": 200,
};

export const isTipPackage = (packageId: string): boolean => Boolean((GU_PACKAGES as Record<string, { tip?: boolean }>)[packageId]?.tip);
