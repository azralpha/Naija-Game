import express from "express";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";
import { createHmac, randomUUID, timingSafeEqual } from "crypto";
import { COSMETIC_COSTS, GU_PACKAGES, isTipPackage } from "./economy";
import { Server as SocketIOServer, Socket } from "socket.io";

type TrapType = "sapa_floor" | "shege_spike" | "awoof_platform";
type PlayerState = {
  id: string;
  name: string;
  x: number;
  y: number;
  direction: -1 | 0 | 1;
  jumping: boolean;
  gbese: number;
  level: number;
  eliminated: boolean;
  traps: Record<TrapType, number>;
};
type Trap = { id: string; ownerId: string; x: number; y: number; trapType: TrapType; expiresAt: number };
type Room = { id: string; players: Map<string, PlayerState>; traps: Map<string, Trap> };
type Profile = { userId: string; username: string; guBalance: number; gbeseBalance: number; equippedSkinTop: string; equippedSkinBottom: string; supporter: boolean; inventory: Set<string> };
type Transaction = { reference: string; gateway: "paystack" | "flutterwave"; userId: string; amountPaidNgn: number; guAwarded: number; isTip: boolean; status: "pending" | "success" | "failed" };
const profiles = new Map<string, Profile>();
const transactions = new Map<string, Transaction>();
const rawBody = Symbol("rawBody");
function profileFor(userId: string, username = "Sapa Soldier") { let profile = profiles.get(userId); if (!profile) { profile = { userId, username, guBalance: 0, gbeseBalance: 0, equippedSkinTop: "default", equippedSkinBottom: "default", supporter: false, inventory: new Set() }; profiles.set(userId, profile); } return profile; }
function safeSignature(value: unknown, secret: string, signature: unknown) { if (typeof signature !== "string" || !secret) return false; const expected = createHmac("sha512", secret).update(typeof value === "string" ? value : JSON.stringify(value)).digest("hex"); const a = Buffer.from(expected); const b = Buffer.from(signature); return a.length === b.length && timingSafeEqual(a, b); }
function userIdFrom(req: express.Request) { return String(req.header("x-user-id") || req.body?.user_id || req.body?.metadata?.user_id || "guest").slice(0, 80); }
function transactionPayload(profile: Profile) { return { userId: profile.userId, username: profile.username, guBalance: profile.guBalance, gbeseBalance: profile.gbeseBalance, supporter: profile.supporter, inventory: Array.from(profile.inventory), equippedSkinTop: profile.equippedSkinTop, equippedSkinBottom: profile.equippedSkinBottom }; }

const rooms = new Map<string, Room>();
const watchers = new Map<string, { stop: () => void }>();
const MAX_PLAYERS = 50;
const TRAP_REWARD = 500;
const TRAP_TYPES: TrapType[] = ["sapa_floor", "shege_spike", "awoof_platform"];
const COMMANDS = new Set(["echoke", "upnepa", "villagepeople", "godabeg"]);

function getRoom(roomId: string) {
  let room = rooms.get(roomId);
  if (!room) { room = { id: roomId, players: new Map(), traps: new Map() }; rooms.set(roomId, room); }
  return room;
}

function roomPayload(room: Room) {
  return Array.from(room.players.values()).map(({ traps: _traps, ...player }) => player);
}
function leaderboardPayload(room: Room) {
  return Array.from(room.players.values()).map((player) => ({ id: player.id, name: player.name, gbese: player.gbese, level: player.level })).sort((a, b) => a.gbese - b.gbese || b.level - a.level).slice(0, 10);
}
function broadcastRoom(io: SocketIOServer, room: Room) {
  io.to(room.id).emit("room_players", roomPayload(room));
  io.to(room.id).emit("leaderboard_update", leaderboardPayload(room));
}
function emitStreamerEvent(io: SocketIOServer, roomId: string, command: string, by: string) {
  if (!COMMANDS.has(command)) return false;
  io.to(roomId).emit("streamer_event", { command, by });
  return true;
}

async function resolveLiveChatId(apiKey: string, videoId?: string, channelHandle?: string) {
  let resolvedVideoId = videoId;
  if (!resolvedVideoId && channelHandle) {
    const channelUrl = new URL("https://www.googleapis.com/youtube/v3/channels");
    channelUrl.searchParams.set("part", "id"); channelUrl.searchParams.set("forHandle", channelHandle.replace(/^@/, "")); channelUrl.searchParams.set("key", apiKey);
    const channelData = await fetch(channelUrl).then((response) => response.json()) as { items?: Array<{ id: string }> };
    const channelId = channelData.items?.[0]?.id;
    if (!channelId) throw new Error("YouTube channel handle was not found");
    const searchUrl = new URL("https://www.googleapis.com/youtube/v3/search");
    searchUrl.searchParams.set("part", "id"); searchUrl.searchParams.set("channelId", channelId); searchUrl.searchParams.set("eventType", "live"); searchUrl.searchParams.set("type", "video"); searchUrl.searchParams.set("maxResults", "1"); searchUrl.searchParams.set("key", apiKey);
    const searchData = await fetch(searchUrl).then((response) => response.json()) as { items?: Array<{ id: { videoId: string } }> };
    resolvedVideoId = searchData.items?.[0]?.id.videoId;
  }
  if (!resolvedVideoId) throw new Error("Provide a YouTube video ID or channel handle");
  const videoUrl = new URL("https://www.googleapis.com/youtube/v3/videos");
  videoUrl.searchParams.set("part", "liveStreamingDetails"); videoUrl.searchParams.set("id", resolvedVideoId); videoUrl.searchParams.set("key", apiKey);
  const videoData = await fetch(videoUrl).then((response) => response.json()) as { items?: Array<{ liveStreamingDetails?: { activeLiveChatId?: string } }> };
  const liveChatId = videoData.items?.[0]?.liveStreamingDetails?.activeLiveChatId;
  if (!liveChatId) throw new Error("No active live chat was found for that broadcast");
  return liveChatId;
}

function startYouTubeWatcher(io: SocketIOServer, roomId: string, liveChatId: string, apiKey: string) {
  watchers.get(roomId)?.stop();
  let stopped = false; let pageToken = ""; let timeout: ReturnType<typeof setTimeout> | undefined;
  const poll = async () => {
    if (stopped) return;
    try {
      const url = new URL("https://www.googleapis.com/youtube/v3/liveChat/messages");
      url.searchParams.set("part", "snippet,authorDetails"); url.searchParams.set("liveChatId", liveChatId); url.searchParams.set("maxResults", "2000"); url.searchParams.set("key", apiKey); if (pageToken) url.searchParams.set("pageToken", pageToken);
      const data = await fetch(url).then((response) => response.json()) as { nextPageToken?: string; pollingIntervalMillis?: number; items?: Array<{ snippet?: { displayMessage?: string }; authorDetails?: { displayName?: string } }> };
      pageToken = data.nextPageToken || pageToken;
      for (const item of data.items || []) {
        const command = (item.snippet?.displayMessage || "").trim().toLowerCase().split(/\s+/)[0];
        if (command.startsWith("!")) emitStreamerEvent(io, roomId, command.slice(1), item.authorDetails?.displayName || "YouTube chat");
      }
      timeout = setTimeout(poll, Math.max(1000, data.pollingIntervalMillis || 5000));
    } catch (error) {
      io.to(roomId).emit("arena_notice", { message: error instanceof Error ? `YouTube chat paused: ${error.message}` : "YouTube chat paused." });
      timeout = setTimeout(poll, 10000);
    }
  };
  const stop = () => { stopped = true; if (timeout) clearTimeout(timeout); watchers.delete(roomId); };
  watchers.set(roomId, { stop }); void poll();
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: "64kb", verify: (req, _res, buffer) => { (req as express.Request & { rawBody?: string }).rawBody = buffer.toString("utf8"); } }));
  const server = createServer(app);
  const io = new SocketIOServer(server, { cors: { origin: true, credentials: true }, transports: ["websocket", "polling"] });
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const staticPath = process.env.NODE_ENV === "production" ? path.resolve(__dirname, "public") : path.resolve(__dirname, "..", "dist", "public");

  app.post("/api/streamer/trigger", (req, res) => {
    const roomId = typeof req.body?.roomId === "string" ? req.body.roomId.trim() : "";
    const command = typeof req.body?.command === "string" ? req.body.command.trim().toLowerCase().replace(/^!/, "") : "";
    if (!roomId || !COMMANDS.has(command)) return res.status(400).json({ ok: false, error: "roomId and a supported command are required" });
    const ok = emitStreamerEvent(io, roomId, command, "API trigger");
    return res.json({ ok, roomId, command });
  });

  app.get("/api/player/sync", (req, res) => { const profile = profileFor(userIdFrom(req)); return res.json({ ok: true, profile: transactionPayload(profile) }); });
  app.post("/api/shop/buy", (req, res) => { const itemId = typeof req.body?.item_id === "string" ? req.body.item_id : ""; const cost = COSMETIC_COSTS[itemId]; const profile = profileFor(userIdFrom(req)); if (!cost) return res.status(400).json({ ok: false, error: "UNKNOWN_ITEM" }); if (profile.inventory.has(itemId)) return res.json({ ok: true, ...transactionPayload(profile) }); if (profile.guBalance < cost) return res.status(402).json({ ok: false, error: "INSUFFICIENT_GU", guBalance: profile.guBalance }); profile.guBalance -= cost; profile.inventory.add(itemId); return res.json({ ok: true, ...transactionPayload(profile) }); });
  app.post("/api/player/update-gbese", (req, res) => { const profile = profileFor(userIdFrom(req)); const delta = Number(req.body?.delta); if (!Number.isFinite(delta)) return res.status(400).json({ ok: false, error: "delta is required" }); profile.gbeseBalance = Math.max(0, Math.round(profile.gbeseBalance + delta)); return res.json({ ok: true, ...transactionPayload(profile) }); });
  app.post("/api/developer/tip-intent", (req, res) => { const packageId = typeof req.body?.package_id === "string" ? req.body.package_id : ""; const pack = (GU_PACKAGES as Record<string, { amountNgn: number; tip?: boolean }>)[packageId]; if (!pack?.tip) return res.status(400).json({ ok: false, error: "UNKNOWN_TIP" }); const reference = `tip-${randomUUID()}`; transactions.set(reference, { reference, gateway: "paystack", userId: userIdFrom(req), amountPaidNgn: pack.amountNgn, guAwarded: 0, isTip: true, status: "pending" }); return res.json({ ok: true, reference, amountNgn: pack.amountNgn }); });

  app.post("/api/paystack/webhook", async (req, res) => {
    const raw = (req as express.Request & { rawBody?: string }).rawBody || JSON.stringify(req.body);
    if (!safeSignature(raw, process.env.PAYSTACK_SECRET_KEY || "", req.header("x-paystack-signature"))) return res.status(401).json({ ok: false, error: "INVALID_SIGNATURE" });
    if (req.body?.event !== "charge.success") return res.json({ ok: true, ignored: true });
    const data = req.body?.data || {}; const reference = String(data.reference || ""); const metadata = data.metadata || {}; const packageId = String(metadata.gu_package_id || ""); const pack = (GU_PACKAGES as Record<string, { amountNgn: number; gu?: number; tip?: boolean }>)[packageId]; if (!reference || !pack) return res.status(400).json({ ok: false, error: "INVALID_PACKAGE" });
    if (transactions.get(reference)?.status === "success") return res.json({ ok: true, duplicate: true });
    if (!process.env.PAYSTACK_SECRET_KEY) return res.status(503).json({ ok: false, error: "PAYSTACK_NOT_CONFIGURED" });
    const verification = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, { headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` } }); const verified = await verification.json() as { status?: boolean; data?: { status?: string; amount?: number; currency?: string; reference?: string } };
    if (!verification.ok || verified.status !== true || verified.data?.status !== "success" || verified.data.currency !== "NGN" || verified.data.amount !== pack.amountNgn * 100) return res.status(402).json({ ok: false, error: "VERIFICATION_FAILED" });
    const profile = profileFor(String(metadata.user_id || "guest")); const transaction: Transaction = { reference, gateway: "paystack", userId: profile.userId, amountPaidNgn: pack.amountNgn, guAwarded: pack.gu || 0, isTip: Boolean(pack.tip), status: "success" }; transactions.set(reference, transaction); if (pack.tip) profile.supporter = true; else profile.guBalance += pack.gu || 0; return res.json({ ok: true, ...transactionPayload(profile) });
  });

  app.post("/api/flutterwave/webhook", async (req, res) => {
    const secret = process.env.FLUTTERWAVE_SECRET_HASH || process.env.FLUTTERWAVE_SECRET_KEY || "";
    if (!safeSignature((req as express.Request & { rawBody?: string }).rawBody || JSON.stringify(req.body), secret, req.header("verif-hash"))) return res.status(401).json({ ok: false, error: "INVALID_SIGNATURE" });
    const event = req.body?.event; const data = req.body?.data || {}; if (event !== "charge.completed" || data.status !== "successful") return res.json({ ok: true, ignored: true });
    const reference = String(data.tx_ref || data.id || ""); const packageId = String(data.meta?.find?.((entry: { metaname?: string }) => entry.metaname === "gu_package_id")?.metavalue || data.meta?.gu_package_id || ""); const pack = (GU_PACKAGES as Record<string, { amountNgn: number; gu?: number; tip?: boolean }>)[packageId]; if (!reference || !pack) return res.status(400).json({ ok: false, error: "INVALID_PACKAGE" });
    if (transactions.get(reference)?.status === "success") return res.json({ ok: true, duplicate: true });
    if (!process.env.FLUTTERWAVE_SECRET_KEY) return res.status(503).json({ ok: false, error: "FLUTTERWAVE_NOT_CONFIGURED" });
    const verification = await fetch(`https://api.flutterwave.com/v3/transactions/${encodeURIComponent(String(data.id))}/verify`, { headers: { Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}` } }); const verified = await verification.json() as { status?: string; data?: { status?: string; amount?: number; currency?: string; tx_ref?: string } };
    if (!verification.ok || verified.status !== "success" || verified.data?.status !== "successful" || verified.data.currency !== "NGN" || Number(verified.data.amount) < pack.amountNgn || verified.data.tx_ref !== reference) return res.status(402).json({ ok: false, error: "VERIFICATION_FAILED" });
    const profile = profileFor(String(data.meta?.user_id || "guest")); const transaction: Transaction = { reference, gateway: "flutterwave", userId: profile.userId, amountPaidNgn: pack.amountNgn, guAwarded: pack.gu || 0, isTip: Boolean(pack.tip), status: "success" }; transactions.set(reference, transaction); if (pack.tip) profile.supporter = true; else profile.guBalance += pack.gu || 0; return res.json({ ok: true, ...transactionPayload(profile) });
  });

  app.post("/api/streamer/connect", async (req, res) => {
    const roomId = typeof req.body?.roomId === "string" ? req.body.roomId.trim() : "";
    const videoId = typeof req.body?.videoId === "string" ? req.body.videoId.trim() : undefined;
    const channelHandle = typeof req.body?.channelHandle === "string" ? req.body.channelHandle.trim() : undefined;
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!roomId || (!videoId && !channelHandle)) return res.status(400).json({ ok: false, error: "roomId plus videoId or channelHandle is required" });
    if (!apiKey) return res.status(503).json({ ok: false, error: "YOUTUBE_API_KEY is not configured on the server" });
    try {
      const liveChatId = await resolveLiveChatId(apiKey, videoId, channelHandle);
      startYouTubeWatcher(io, roomId, liveChatId, apiKey);
      return res.json({ ok: true, roomId, liveChatId });
    } catch (error) {
      return res.status(502).json({ ok: false, error: error instanceof Error ? error.message : "Unable to connect YouTube chat" });
    }
  });

  io.on("connection", (socket: Socket) => {
    let currentRoom: Room | undefined;
    let playerId = socket.id;
    socket.on("quick_match", (payload: { roomId?: string; playerName?: string }) => {
      const requested = typeof payload?.roomId === "string" ? payload.roomId.trim().slice(0, 32) : "";
      const roomId = requested || Array.from(rooms.values()).find((room) => room.players.size < MAX_PLAYERS)?.id || `arena-${randomUUID().slice(0, 6)}`;
      const room = getRoom(roomId);
      if (room.players.size >= MAX_PLAYERS) return socket.emit("arena_notice", { message: "That arena is full. Try quick-match again." });
      playerId = socket.id;
      const player: PlayerState = { id: playerId, name: String(payload?.playerName || `Player ${playerId.slice(0, 4)}`).slice(0, 18), x: 70, y: 420, direction: 0, jumping: false, gbese: 0, level: 1, eliminated: false, traps: { sapa_floor: 1, shege_spike: 1, awoof_platform: 1 } };
      currentRoom = room; room.players.set(playerId, player); socket.join(room.id);
      socket.emit("room_joined", { roomId: room.id, playerId, players: roomPayload(room) }); broadcastRoom(io, room);
    });
    socket.on("player_state", (payload: Partial<PlayerState>) => {
      const player = currentRoom?.players.get(playerId); if (!player) return;
      player.x = Math.max(0, Math.min(4320, Number(payload.x) || 0)); player.y = Math.max(-200, Math.min(600, Number(payload.y) || 0)); player.direction = payload.direction === -1 || payload.direction === 1 ? payload.direction : 0; player.jumping = Boolean(payload.jumping); if (typeof payload.gbese === "number") player.gbese = Math.max(0, Math.min(999999, Math.round(payload.gbese))); if (typeof payload.level === "number") player.level = Math.max(1, Math.min(40, Math.round(payload.level)));
    });
    socket.on("place_trap", (payload: { x: number; y: number; trapType: TrapType }) => {
      const player = currentRoom?.players.get(playerId); if (!currentRoom || !player || !TRAP_TYPES.includes(payload?.trapType)) return;
      if ((player.traps[payload.trapType] || 0) < 1) return socket.emit("arena_notice", { message: "You have already used that trap token." });
      const x = Number(payload.x); const y = Number(payload.y); if (!Number.isFinite(x) || !Number.isFinite(y) || x < 0 || x > 4320 || y < 0 || y > 540) return;
      player.traps[payload.trapType] -= 1;
      const trap: Trap = { id: randomUUID(), ownerId: playerId, x, y, trapType: payload.trapType, expiresAt: Date.now() + 45000 }; currentRoom.traps.set(trap.id, trap); io.to(currentRoom.id).emit("spawn_global_trap", trap); socket.emit("arena_notice", { message: `${payload.trapType.replace("_", " ")} dropped.` });
    });
    socket.on("trap_hit", (payload: { trapId: string; victimId?: string }) => {
      const room = currentRoom; const trap = room?.traps.get(payload?.trapId); if (!room || !trap || trap.ownerId === playerId) return;
      const victim = room.players.get(playerId); const owner = room.players.get(trap.ownerId); if (!victim || !owner) return;
      victim.gbese += TRAP_REWARD; owner.gbese = Math.max(0, owner.gbese - TRAP_REWARD); broadcastRoom(io, room); io.to(room.id).emit("arena_notice", { message: `${owner.name} collected a ₦${TRAP_REWARD} trap reward from ${victim.name}.` }); room.traps.delete(trap.id);
    });
    socket.on("chat_trigger", (payload: { command: string }) => { if (currentRoom) emitStreamerEvent(io, currentRoom.id, String(payload?.command || "").replace(/^!/, "").toLowerCase(), playerId); });
    socket.on("ghost_hazard", (payload: { command: string }) => { if (!currentRoom) return; const command = String(payload?.command || "").toLowerCase(); if (!["upnepa", "villagepeople", "godabeg"].includes(command)) return; io.to(currentRoom.id).emit("streamer_event", { command, by: `${currentRoom.players.get(playerId)?.name || "Ghost"} (spectator)` }); });
    socket.on("leave_room", () => { if (currentRoom) { currentRoom.players.delete(playerId); broadcastRoom(io, currentRoom); if (!currentRoom.players.size) { watchers.get(currentRoom.id)?.stop(); rooms.delete(currentRoom.id); } currentRoom = undefined; } });
    socket.on("disconnect", () => { if (currentRoom) { currentRoom.players.delete(playerId); broadcastRoom(io, currentRoom); if (!currentRoom.players.size) { watchers.get(currentRoom.id)?.stop(); rooms.delete(currentRoom.id); } } });
  });

  setInterval(() => {
    const now = Date.now();
    Array.from(rooms.values()).forEach((room) => {
      Array.from(room.traps.entries()).forEach(([trapId, trap]) => { if (trap.expiresAt < now) room.traps.delete(trapId); });
      broadcastRoom(io, room);
    });
  }, 50);

  app.use(express.static(staticPath));
  app.get("*", (_req, res) => res.sendFile(path.join(staticPath, "index.html")));
  const port = process.env.PORT || 3000;
  server.listen(port, () => console.log(`NNL arena server listening on http://localhost:${port}`));
}

startServer().catch(console.error);
