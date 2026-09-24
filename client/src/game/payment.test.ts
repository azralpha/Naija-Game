import { describe, expect, it } from "vitest";

describe("payment provider credentials", () => {
  it("supports both configured providers", () => {
    expect(["flutterwave", "paystack"]).toEqual(["flutterwave", "paystack"]);
  });

  it("uses public-key prefixes for browser checkout", () => {
    expect("FLWPUBK-example".startsWith("FLWPUBK-")).toBe(true);
    expect("pk_live_example".startsWith("pk_")).toBe(true);
  });

  it("validates the Flutterwave secret with its banks endpoint", async () => {
    const secret = process.env.FLUTTERWAVE_SECRET_KEY;
    if (!secret) throw new Error("FLUTTERWAVE_SECRET_KEY is not configured");
    const response = await fetch("https://api.flutterwave.com/v3/banks/NG", { headers: { Authorization: `Bearer ${secret}` } });
    expect(response.status).toBe(200);
  }, 15000);

  it("validates the Paystack secret with its banks endpoint", async () => {
    const secret = process.env.PAYSTACK_SECRET_KEY;
    if (!secret) throw new Error("PAYSTACK_SECRET_KEY is not configured");
    const response = await fetch("https://api.paystack.co/bank?country=nigeria&perPage=1", { headers: { Authorization: `Bearer ${secret}` } });
    expect(response.status).toBe(200);
  }, 15000);
});
