import { useEffect, useRef } from "react";
import { connectArena, type ArenaConnection, type ArenaLeaderboardEntry, type ArenaTrap, type RemotePlayer, type StreamerEvent } from "../game/online";

type Screen = "title" | "worlds" | "arena" | "options" | "credits" | "playing" | "paused" | "dead" | "clear";
type WorldIndex = 0 | 1 | 2 | 3;

type Platform = { x: number; y: number; w: number; h: number; vanish?: boolean; color?: string };
type HazardKind =
  | "spike"
  | "falling"
  | "disappear"
  | "axe"
  | "fakeDoor"
  | "movingWall"
  | "blackout"
  | "lateSpike"
  | "fakeJump"
  | "gravityFlip"
  | "multi"
  | "reverse"
  | "slide"
  | "awoof";
type Hazard = {
  kind: HazardKind;
  x: number;
  y: number;
  w: number;
  h: number;
  penalty: number;
  label: string;
  phase?: number;
  triggered?: boolean;
};
type KeyPickup = { id: string; x: number; y: number; collected: boolean };
type SaveData = { debt: number; keys: number; unlocked: number; keyIds: string[]; adminMode: boolean };
type Stage = {
  world: WorldIndex;
  width: number;
  platforms: Platform[];
  hazards: Hazard[];
  keys: KeyPickup[];
  exitX: number;
  spawn: { x: number; y: number };
};
type Player = { x: number; y: number; w: number; h: number; vx: number; vy: number; grounded: boolean; coyote: number };

const W = 960;
const H = 540;
const STORAGE_KEY = "nnl-save-v1";
const SETTINGS_KEY = "nnl-settings-v1";
const MUSIC_TRACKS = ["OFF", "TRACK 1: Chiptune + Fuji", "TRACK 2: Afro-Beats Rush", "TRACK 3: Street-Pop Chaos"] as const;
const CONTROL_SCALES = [0.8, 1, 1.2] as const;
const ART_REF = "/manus-storage/nnl-visual-target_084dbdec.png";
const DEATH_MESSAGES = [
  "Sapa don catch you!", "You don see Shege!", "Wahala no dey finish o", "God abeg… try again",
  "Village people at work", "Gbese still dey hold you", "E choke you die?", "Trenches no be for soft people",
  "Awoof platform? Really?", "Japa door don run again", "Las las you go still try", "We still dey move… right?",
  "This one na pure wahala", "My eye don red for this level", "Hunger no dey play… neither do these spikes",
  "Omo, you too dey rush", "No gree for this obstacle", "Shege Pro Max activated", "Katakata just burst",
  "Rain don beat shege for your body",
];
const CLEAR_MESSAGES = [
  "You don survive this one!", "Shege cleared... for now", "Sapa no fit hold you forever", "Next door dey wait for you",
];
const WORLD_NAMES = ["Sapa Nation", "Shege Pro Max", "Trenches & Katakata", "Soft Life Protocol"];
const WORLD_SUBTITLES = ["Basic wahala. Heavy drops. Fake peace.", "Sharp things. Red flags. No mercy.", "Gravity gone mad. Katakata everywhere.", "Secret route. Admins only."];
const WORLD_COLORS = ["#8bb174", "#e65c4b", "#e0b94e", "#b78cff"];

function loadSave(): SaveData {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null") as Partial<SaveData> | null;
    return {
      debt: Math.max(0, Number(stored?.debt) || 0),
      keys: Math.max(0, Number(stored?.keys) || 0),
      unlocked: Math.min(3, Math.max(0, Number(stored?.unlocked) || 0)),
      keyIds: Array.isArray(stored?.keyIds) ? stored!.keyIds! : [],
      adminMode: stored?.adminMode === true,
    };
  } catch {
    return { debt: 0, keys: 0, unlocked: 0, keyIds: [], adminMode: false };
  }
}

function persist(save: SaveData) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(save));
}

function loadSettings() {
  try {
    const stored = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "null") as { musicTrack?: number; controlScale?: number } | null;
    return {
      musicTrack: Math.max(0, Math.min(MUSIC_TRACKS.length - 1, Math.round(Number(stored?.musicTrack) || 1))),
      controlScale: CONTROL_SCALES.includes(Number(stored?.controlScale) as typeof CONTROL_SCALES[number]) ? Number(stored?.controlScale) as typeof CONTROL_SCALES[number] : 1,
    };
  } catch {
    return { musicTrack: 1, controlScale: 1 as typeof CONTROL_SCALES[number] };
  }
}

function persistSettings(settings: { musicTrack: number; controlScale: number }) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

function rectsOverlap(a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function stageFor(world: WorldIndex, save: SaveData): Stage {
  const palette = world === 0 ? "#4f413c" : world === 1 ? "#5b262d" : "#2e3d51";
  const floor = (x: number, y = 470, w = 320): Platform => ({ x, y, w, h: 42, color: palette });
  const platforms: Platform[] = [
    floor(0, 470, 300), { x: 370, y: 414, w: 132, h: 22, color: palette }, { x: 555, y: 350, w: 118, h: 22, color: palette },
    { x: 720, y: 427, w: 166, h: 22, color: palette }, floor(950, 470, 248), { x: 1270, y: 394, w: 130, h: 22, color: palette },
    { x: 1475, y: 330, w: 138, h: 22, color: palette }, floor(1700, 470, 292), { x: 2070, y: 390, w: 130, h: 22, color: palette },
    { x: 2270, y: 322, w: 158, h: 22, color: palette }, floor(2500, 470, 330), { x: 2940, y: 410, w: 145, h: 22, color: palette },
    { x: 3145, y: 348, w: 150, h: 22, color: palette }, floor(3380, 470, 470), { x: 3920, y: 390, w: 160, h: 22, color: palette },
  ];
  const hazards: Hazard[] = [
    { kind: "spike", x: 292, y: 450, w: 76, h: 20, penalty: 50, label: "DIRTY GROUND" },
    { kind: "falling", x: 615, y: 170, w: 30, h: 30, penalty: 70, label: "SMALL DROP", phase: 0.4 },
    { kind: "disappear", x: 720, y: 427, w: 166, h: 22, penalty: 100, label: "SAPA FLOOR" },
    { kind: "axe", x: 1100, y: 285, w: 48, h: 120, penalty: 150, label: "SWINGING BLADE", phase: 0.2 },
    { kind: "fakeDoor", x: 1398, y: 342, w: 48, h: 70, penalty: 200, label: "FAKE DOOR" },
    { kind: "movingWall", x: 1588, y: 318, w: 42, h: 152, penalty: 200, label: "MOVING WALL", phase: 0.8 },
    { kind: "lateSpike", x: 1998, y: 450, w: 66, h: 20, penalty: 250, label: "GOD ABEG SPIKE" },
    { kind: "blackout", x: 2206, y: 270, w: 64, h: 115, penalty: 200, label: "UP NEPA" },
    { kind: "fakeJump", x: 2424, y: 430, w: 58, h: 40, penalty: 300, label: "POS DECLINE" },
    { kind: "gravityFlip", x: 2828, y: 425, w: 110, h: 45, penalty: 300, label: "E CHOKE" },
    { kind: "multi", x: 3295, y: 300, w: 84, h: 170, penalty: 300, label: "KATAKATA" },
    { kind: "reverse", x: 3670, y: 425, w: 92, h: 45, penalty: 400, label: "VILLAGE PEOPLE" },
    { kind: "awoof", x: 4080, y: 430, w: 88, h: 40, penalty: 500, label: "AWOOF PLATFORM" },
  ];
  if (world === 1) {
    hazards.push({ kind: "spike", x: 1805, y: 450, w: 120, h: 20, penalty: 50, label: "RED SPIKE" });
    hazards.push({ kind: "axe", x: 2690, y: 260, w: 52, h: 150, penalty: 150, label: "BIG BLADE", phase: 1.5 });
  }
  if (world === 2) {
    hazards.push({ kind: "reverse", x: 860, y: 390, w: 100, h: 60, penalty: 400, label: "REVERSE CONTROLS" });
    hazards.push({ kind: "gravityFlip", x: 1880, y: 380, w: 90, h: 90, penalty: 300, label: "GRAVITY FLIP" });
    hazards.push({ kind: "multi", x: 3040, y: 260, w: 105, h: 210, penalty: 300, label: "KATAKATA ROOM" });
  }
  const rawKeys: KeyPickup[] = [
    { id: `${world}-a`, x: 430, y: 365, collected: false }, { id: `${world}-b`, x: 1540, y: 280, collected: false },
    { id: `${world}-c`, x: 2330, y: 270, collected: false }, { id: `${world}-d`, x: 3210, y: 295, collected: false },
  ].slice(0, world === 0 ? 4 : 3);
  rawKeys.forEach((key) => { key.collected = save.keyIds.includes(key.id); });
  return { world, width: 4320, platforms, hazards, keys: rawKeys, exitX: 4180, spawn: { x: 70, y: 420 } };
}

function createPlayer(stage: Stage): Player {
  return { x: stage.spawn.x, y: stage.spawn.y, w: 16, h: 25, vx: 0, vy: 0, grounded: false, coyote: 0 };
}

class MusicBox {
  ctx: AudioContext | null = null;
  master: GainNode | null = null;
  timer: number | null = null;
  step = 0;
  next = 0;
  track = 1;

  setTrack(track: number) {
    this.track = ((track % MUSIC_TRACKS.length) + MUSIC_TRACKS.length) % MUSIC_TRACKS.length;
    if (!this.master || !this.ctx) return;
    this.master.gain.setTargetAtTime(this.track === 0 ? 0 : 0.13, this.ctx.currentTime, 0.025);
    this.step = 0;
    this.next = this.ctx.currentTime;
  }

  start() {
    if (this.ctx) { void this.ctx.resume(); return; }
    this.ctx = new AudioContext();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.track === 0 ? 0 : 0.13;
    this.master.connect(this.ctx.destination);
    this.next = this.ctx.currentTime;
    const tick = () => {
      if (!this.ctx || !this.master) return;
      while (this.next < this.ctx.currentTime + 0.18) {
        this.schedule(this.next, this.step);
        this.next += 60 / 156 / 2;
        this.step += 1;
      }
    };
    tick();
    this.timer = window.setInterval(tick, 45);
  }

  tone(time: number, freq: number, length: number, type: OscillatorType, gain = 0.2) {
    if (!this.ctx || !this.master) return;
    const osc = this.ctx.createOscillator();
    const amp = this.ctx.createGain();
    osc.type = type; osc.frequency.setValueAtTime(freq, time);
    amp.gain.setValueAtTime(gain, time); amp.gain.exponentialRampToValueAtTime(0.001, time + length);
    osc.connect(amp); amp.connect(this.master); osc.start(time); osc.stop(time + length + 0.02);
  }

  noise(time: number, length: number, gain = 0.12) {
    if (!this.ctx || !this.master) return;
    const buffer = this.ctx.createBuffer(1, this.ctx.sampleRate * length, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
    const source = this.ctx.createBufferSource(); source.buffer = buffer;
    const filter = this.ctx.createBiquadFilter(); filter.type = "highpass"; filter.frequency.value = 1200;
    const amp = this.ctx.createGain(); amp.gain.setValueAtTime(gain, time); amp.gain.exponentialRampToValueAtTime(0.001, time + length);
    source.connect(filter); filter.connect(amp); amp.connect(this.master); source.start(time);
  }

  schedule(time: number, step: number) {
    if (this.track === 0) return;
    const patterns = [
      { bass: [110, 110, 147, 123, 98, 98, 165, 123], lead: [0, 0, 392, 440, 0, 330, 294, 0], type: "square" as OscillatorType, tempo: 156 },
      { bass: [98, 123, 147, 165, 98, 123, 196, 165], lead: [392, 0, 494, 0, 440, 0, 587, 0], type: "sawtooth" as OscillatorType, tempo: 164 },
      { bass: [82, 98, 123, 147, 82, 110, 123, 165], lead: [330, 392, 0, 440, 330, 494, 0, 392], type: "square" as OscillatorType, tempo: 172 },
    ][this.track - 1];
    const bass = patterns.bass[step % 8];
    const lead = patterns.lead[step % 8];
    if (step % 2 === 0) this.tone(time, bass, 0.18, patterns.type, 0.25);
    if (lead) this.tone(time, lead, 0.11, "triangle", 0.12);
    if (step % 4 === 2 || this.track > 1 && step % 2 === 1) this.noise(time, 0.08, this.track === 3 ? 0.16 : 0.13);
    if (step % 8 === 7) this.noise(time, 0.05, 0.08);
  }

  blip(freq = 520, length = 0.08) { if (this.ctx) this.tone(this.ctx.currentTime, freq, length, "square", 0.15); }

  stop() { if (this.timer) window.clearInterval(this.timer); this.timer = null; this.ctx?.close(); this.ctx = null; }
}

function drawText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, size: number, color: string, align: CanvasTextAlign = "left", font = "Space Grotesk") {
  ctx.font = `${size}px ${font}`; ctx.textAlign = align; ctx.textBaseline = "middle"; ctx.fillStyle = color; ctx.fillText(text, x, y);
}

function drawButton(ctx: CanvasRenderingContext2D, label: string, x: number, y: number, w: number, h: number, accent: string, small = false) {
  ctx.fillStyle = "rgba(9,10,12,.9)"; ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = accent; ctx.lineWidth = 2; ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
  ctx.fillStyle = accent; ctx.fillRect(x, y, 5, h);
  ctx.save(); ctx.beginPath(); ctx.rect(x + 10, y + 2, w - 20, h - 4); ctx.clip();
  const maxChars = Math.max(12, Math.floor((w - 38) / (small ? 7.2 : 8.2)));
  const fontSize = Math.min(small ? 13 : 16, Math.max(10, Math.floor((w - 38) / Math.max(1, label.length) * 1.72)));
  if (label.length <= maxChars) drawText(ctx, label, x + 18, y + h / 2, fontSize, "#f7f1e6", "left", "DM Mono");
  else {
    const split = label.lastIndexOf(" ", maxChars);
    const first = split > 4 ? label.slice(0, split) : label.slice(0, maxChars);
    const second = label.slice(first.length).trim();
    drawText(ctx, first, x + 18, y + h / 2 - 8, Math.max(9, fontSize - 1), "#f7f1e6", "left", "DM Mono");
    drawText(ctx, second, x + 18, y + h / 2 + 8, Math.max(9, fontSize - 1), "#f7f1e6", "left", "DM Mono");
  }
  ctx.restore();
}

export default function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = W; canvas.height = H; ctx.imageSmoothingEnabled = false;

    let screen: Screen = new URLSearchParams(window.location.search).has("demo") ? "playing" : "title";
    let onlineMode = false;
    let arenaConnection: ArenaConnection | null = null;
    let remotePlayers: RemotePlayer[] = [];
    let arenaTraps: ArenaTrap[] = [];
    let leaderboard: ArenaLeaderboardEntry[] = [];
    let arenaNotice = "Tap Online Arena to find a room.";
    let streamerEnabled = false;
    let streamerSource = "";
    let world: WorldIndex = 0;
    let save = loadSave();
    let adminMode = save.adminMode;
    let adminToast = "";
    let adminToastUntil = 0;
    const titleTapTimes: number[] = [];
    let stage = stageFor(world, save);
    let player = createPlayer(stage);
    let cameraX = 0;
    let last = performance.now();
    let raf = 0;
    let elapsed = 0;
    let deathUntil = 0;
    let deathMessage = "";
    let deathPenalty = 0;
    let clearMessage = "";
    let clearUntil = 0;
    let blackoutUntil = 0;
    let reverseUntil = 0;
    let fakeJumpUntil = 0;
    let gravityFlipUntil = 0;
    let shake = 0;
    let standStill = 0;
    let demo = new URLSearchParams(window.location.search).has("demo");
    let demoTime = 0;
    let networkAccumulator = 0;
    const keysDown = new Set<string>();
    const touch = { left: false, right: false, jump: false };
    const pressed = { jump: false };
    const music = new MusicBox();
    const settings = loadSettings();
    let musicTrack = settings.musicTrack;
    let controlScale = settings.controlScale;
    music.track = musicTrack;
    const art = new Image(); art.src = ART_REF;
    const dpr = Math.min(2, window.devicePixelRatio || 1);

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, Math.floor(rect.width * dpr)); canvas.height = Math.max(1, Math.floor(rect.height * dpr));
    };
    resize();
    window.addEventListener("resize", resize);

    const canvasPoint = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      return { x: ((event.clientX - rect.left) / rect.width) * W, y: ((event.clientY - rect.top) / rect.height) * H };
    };
    const cycleMusic = () => {
      musicTrack = (musicTrack + 1) % MUSIC_TRACKS.length;
      music.setTrack(musicTrack);
      persistSettings({ musicTrack, controlScale });
      music.start();
    };
    const cycleControls = () => {
      const currentIndex = CONTROL_SCALES.indexOf(controlScale as typeof CONTROL_SCALES[number]);
      controlScale = CONTROL_SCALES[(currentIndex + 1) % CONTROL_SCALES.length];
      persistSettings({ musicTrack, controlScale });
    };
    const enableAdminMode = () => {
      if (adminMode) return;
      adminMode = true;
      save = { ...save, adminMode: true, unlocked: 3, keys: 10, debt: 999999 };
      persist(save);
      music.start();
      if (music.ctx) {
        const time = music.ctx.currentTime;
        music.tone(time, 660, 0.12, "triangle", 0.22);
        music.tone(time + 0.12, 880, 0.16, "triangle", 0.24);
        music.tone(time + 0.28, 1320, 0.25, "sine", 0.2);
      }
      adminToast = "Admin Mode Activated: You don buy the game.";
      adminToastUntil = performance.now() + 4200;
    };
    const registerTitleTap = (now: number) => {
      titleTapTimes.push(now);
      while (titleTapTimes.length && now - titleTapTimes[0] > 1500) titleTapTimes.shift();
      if (titleTapTimes.length >= 5) {
        titleTapTimes.length = 0;
        enableAdminMode();
      }
    };
    const onStreamerEvent = (event: StreamerEvent) => {
      if (event.command === "upnepa") blackoutUntil = performance.now() + 2000;
      if (event.command === "echoke") gravityFlipUntil = performance.now() + 1600;
      if (event.command === "villagepeople") reverseUntil = performance.now() + 5000;
      if (event.command === "godabeg") fakeJumpUntil = performance.now() + 2200;
      arenaNotice = `STREAMER WAHALA: !${event.command}`;
    };
    const activateConfiguredStreamer = async () => {
      if (!arenaConnection || !streamerSource) return;
      const payload = streamerSource.startsWith("@") ? { roomId: arenaConnection.roomId, channelHandle: streamerSource } : { roomId: arenaConnection.roomId, videoId: streamerSource };
      try {
        const response = await fetch("/api/streamer/connect", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
        const data = await response.json() as { ok?: boolean; error?: string };
        arenaNotice = data.ok ? "YouTube chat connected. Commands are live." : data.error || "Streamer connection failed.";
      } catch { arenaNotice = "Streamer API unavailable in this preview."; }
    };
    const enterArena = () => {
      onlineMode = true; screen = "arena"; music.start(); arenaConnection?.leave();
      arenaConnection = connectArena({
        playerName: `NNL-${Math.floor(Math.random() * 900 + 100)}`,
        onRoom: (payload) => { arenaNotice = `Room ${payload.roomId} · ${payload.players.length}/50 connected`; remotePlayers = payload.players.filter((remote) => remote.id !== payload.playerId); void activateConfiguredStreamer(); },
        onPlayers: (players) => { remotePlayers = players.filter((remote) => remote.id !== arenaConnection?.playerId); },
        onTrap: (trap) => { arenaTraps = [...arenaTraps.filter((existing) => existing.id !== trap.id), trap]; },
        onLeaderboard: (entries) => { leaderboard = entries; },
        onStreamerEvent,
        onNotice: (message) => { arenaNotice = message; },
      });
    };
    const leaveArena = () => { arenaConnection?.leave(); arenaConnection = null; onlineMode = false; remotePlayers = []; arenaTraps = []; leaderboard = []; screen = "title"; };
    const configureStreamer = async () => {
      const source = window.prompt("YouTube Live Video ID or @channel handle", streamerSource);
      if (!source) return;
      streamerSource = source.trim(); streamerEnabled = true;
      if (!arenaConnection) { arenaNotice = "Streamer source saved. Join an arena to activate chat."; return; }
      const payload = streamerSource.startsWith("@") ? { roomId: arenaConnection.roomId, channelHandle: streamerSource } : { roomId: arenaConnection.roomId, videoId: streamerSource };
      try {
        const response = await fetch("/api/streamer/connect", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
        const data = await response.json() as { ok?: boolean; error?: string };
        arenaNotice = data.ok ? "YouTube chat connected. Commands are live." : data.error || "Streamer connection failed.";
      } catch { arenaNotice = "Streamer API unavailable in this preview."; }
    };
    const placeTrap = () => {
      if (!onlineMode || !arenaConnection) return;
      const trapType: ArenaTrap["trapType"] = arenaTraps.some((trap) => trap.ownerId === arenaConnection?.playerId && trap.trapType === "sapa_floor") ? (arenaTraps.some((trap) => trap.ownerId === arenaConnection?.playerId && trap.trapType === "shege_spike") ? "awoof_platform" : "shege_spike") : "sapa_floor";
      arenaConnection.socket.emit("place_trap", { x: player.x + 34, y: 448, trapType });
    };
    const startGame = (selectedWorld: WorldIndex) => {
      onlineMode = false; world = selectedWorld; stage = stageFor(world, save); player = createPlayer(stage); cameraX = 0; screen = "playing"; demoTime = 0; music.start();
    };
    const resetLevel = () => { stage = stageFor(world, save); player = createPlayer(stage); cameraX = 0; screen = "playing"; demoTime = 0; };
    const skipLevel = () => {
      if (!adminMode || onlineMode) return;
      player.x = stage.exitX;
      player.y = 390;
      player.vx = 0;
      player.vy = 0;
      cameraX = Math.max(0, Math.min(stage.width - W, player.x - 275));
      screen = "playing";
      adminToast = "Level skipped. Admin wahala no dey.";
      adminToastUntil = performance.now() + 2200;
    };
    const die = (hazard: Hazard | { penalty: number; label: string }) => {
      if (screen !== "playing") return;
      deathPenalty = hazard.penalty; save.debt += hazard.penalty; persist(save);
      deathMessage = DEATH_MESSAGES[Math.floor(Math.random() * DEATH_MESSAGES.length)]; deathUntil = performance.now() + 900;
      screen = "dead"; shake = 10; music.blip(110, 0.18);
    };
    const clearLevel = () => {
      save.debt = Math.max(0, save.debt - 2000); if (world < 2) save.unlocked = Math.max(save.unlocked, world + 1); persist(save);
      clearMessage = world === 0 ? "You don graduate from Sapa Nation. Welcome to Shege Pro Max." : CLEAR_MESSAGES[Math.floor(Math.random() * CLEAR_MESSAGES.length)];
      clearUntil = performance.now() + 7000; screen = "clear"; music.blip(740, 0.18);
    };
    const goBack = () => { screen = screen === "playing" || screen === "paused" || screen === "dead" ? "worlds" : "title"; };

    const handlePointerDown = (event: PointerEvent) => {
      event.preventDefault(); music.start();
      const p = canvasPoint(event);
      if (screen === "playing") {
        if (p.y > H - 135) {
          const leftWidth = 175 * controlScale; const rightStart = 212 - (controlScale - 1) * 50; const rightEnd = rightStart + 175 * controlScale;
          const trapStart = 500 - (controlScale - 1) * 45; const trapEnd = 720 + (controlScale - 1) * 45; const jumpStart = 744 - (controlScale - 1) * 40;
          if (p.x < 22 + leftWidth) touch.left = true; else if (p.x > rightStart && p.x < rightEnd) touch.right = true; else if (onlineMode && p.x > trapStart && p.x < trapEnd) placeTrap(); else if (p.x > jumpStart) { touch.jump = true; pressed.jump = true; }
        } else if (p.x > W - 88 && p.y < 80) screen = "paused";
        else if (p.x > W - 160 && p.y > H - 95) screen = "paused";
        return;
      }
      if (screen === "title") {
        if (p.x >= 70 && p.x <= 450 && p.y >= 105 && p.y <= 275) registerTitleTap(performance.now());
        if (p.x > 520 && p.y > 300 && p.y < 390) enterArena();
        else if (p.y > 285 && p.y < 345) screen = "worlds";
        else if (p.y > 350 && p.y < 405) screen = "options";
        else if (p.y > 410 && p.y < 465) screen = "credits";
      } else if (screen === "arena") {
        if (p.y > 260 && p.y < 325) { world = 0; stage = stageFor(world, save); player = createPlayer(stage); screen = "playing"; arenaNotice = "Arena live. Sabotage tokens ready."; }
        else if (p.y > 345 && p.y < 405) void configureStreamer();
        else if (p.y > 435) leaveArena();
      } else if (screen === "worlds") {
        if (p.y > 145 && p.y < 350) {
          const pick = Math.floor((p.x - 70) / 220) as WorldIndex;
          if (pick >= 0 && pick <= 3 && pick <= save.unlocked) startGame(pick);
        } else if (p.y > 450) screen = "title";
      } else if (screen === "options" || screen === "credits") {
        if (screen === "options" && p.y > 155 && p.y < 225) cycleMusic();
        else if (screen === "options" && p.y > 225 && p.y < 295) cycleControls();
        else if (screen === "options" && p.y > 295 && p.y < 370) void configureStreamer();
        else if (p.y > 440) screen = "title";
      } else if (screen === "paused") {
        if (p.y > 165 && p.y < 225) screen = "playing";
        else if (p.y > 230 && p.y < 290) resetLevel();
        else if (adminMode && !onlineMode && p.y > 295 && p.y < 355) skipLevel();
        else if (p.y > (adminMode && !onlineMode ? 360 : 295) && p.y < (adminMode && !onlineMode ? 425 : 355)) goBack();
      } else if (screen === "dead") {
        if (p.y > 420) resetLevel();
      } else if (screen === "clear") {
        if (p.y > 360 || performance.now() > clearUntil) screen = "worlds";
      }
    };
    const handlePointerUp = (event: PointerEvent) => {
      event.preventDefault();
      touch.left = false; touch.right = false; touch.jump = false;
    };
    const keydown = (event: KeyboardEvent) => {
      music.start(); keysDown.add(event.key.toLowerCase());
      if (["arrowup", "w", " "].includes(event.key.toLowerCase())) pressed.jump = true;
      if (event.key.toLowerCase() === "escape" && screen === "playing") screen = "paused";
      if (event.key.toLowerCase() === "enter" && screen === "title") screen = "worlds";
    };
    const keyup = (event: KeyboardEvent) => { keysDown.delete(event.key.toLowerCase()); };
    canvas.addEventListener("pointerdown", handlePointerDown, { passive: false });
    canvas.addEventListener("pointerup", handlePointerUp, { passive: false });
    canvas.addEventListener("pointercancel", handlePointerUp, { passive: false });
    window.addEventListener("keydown", keydown);
    window.addEventListener("keyup", keyup);

    const input = () => {
      if (demo) { demoTime += 1 / 60; return { left: false, right: demoTime % 7 < 6.3, jump: demoTime % 2.1 < 0.08 }; }
      return { left: touch.left || keysDown.has("arrowleft") || keysDown.has("a"), right: touch.right || keysDown.has("arrowright") || keysDown.has("d"), jump: touch.jump || keysDown.has("arrowup") || keysDown.has("w") || keysDown.has(" ") };
    };

    const update = (dt: number, now: number) => {
      if (screen === "dead") { if (now > deathUntil) resetLevel(); return; }
      if (screen !== "playing") return;
      const control = input();
      const reverse = now < reverseUntil;
      const left = reverse ? control.right : control.left;
      const right = reverse ? control.left : control.right;
      const direction = (right ? 1 : 0) - (left ? 1 : 0);
      if (direction === 0) standStill += dt; else standStill = 0;
      const gravity = now < gravityFlipUntil ? -1450 : 1450;
      player.vx += direction * 1700 * dt;
      player.vx *= player.grounded ? 0.82 : 0.93;
      player.vx = Math.max(-270, Math.min(270, player.vx));
      player.vy += gravity * dt;
      if (control.jump && (pressed.jump || demo) && (player.grounded || player.coyote > 0)) {
        if (now < fakeJumpUntil) { music.blip(150, 0.08); } else { player.vy = gravity > 0 ? -570 : 570; player.grounded = false; player.coyote = 0; music.blip(660, 0.06); }
      }
      pressed.jump = false;
      const prevBottom = player.y + player.h;
      player.x += player.vx * dt; player.y += player.vy * dt;
      player.grounded = false; player.coyote = Math.max(0, player.coyote - dt);
      for (const platform of stage.platforms) {
        const disappearing = platform.vanish && platform.w < 0;
        if (disappearing) continue;
        if (player.vy >= 0 && prevBottom <= platform.y + 6 && player.y + player.h >= platform.y && player.x + player.w > platform.x && player.x < platform.x + platform.w) {
          player.y = platform.y - player.h; player.vy = 0; player.grounded = true; player.coyote = 0.09;
        }
        if (player.vy < 0 && player.y <= platform.y + platform.h && player.y + player.h > platform.y + platform.h && player.x + player.w > platform.x && player.x < platform.x + platform.w) {
          player.y = platform.y + platform.h; player.vy = 0;
        }
      }
      for (const hazard of stage.hazards) {
        if (hazard.kind === "falling") hazard.y = 155 + Math.abs(Math.sin(elapsed * 2 + (hazard.phase || 0))) * 125;
        if (hazard.kind === "axe") hazard.phase = (hazard.phase || 0) + dt * 4;
        if (hazard.kind === "movingWall") hazard.x = 1588 + Math.sin(elapsed * 1.4) * 80;
        if (hazard.kind === "lateSpike" && standStill > 1.1) hazard.triggered = true;
        if (hazard.kind === "disappear" && rectsOverlap(player, hazard) && player.grounded) { hazard.triggered = true; }
        const box = hazard.kind === "axe" ? { x: hazard.x - 18, y: hazard.y, w: hazard.w + 36, h: hazard.h } : hazard;
        if (hazard.kind === "reverse" && rectsOverlap(player, box)) reverseUntil = now + 4300;
        if (hazard.kind === "blackout" && rectsOverlap(player, box)) blackoutUntil = now + 1400;
        if (hazard.kind === "gravityFlip" && rectsOverlap(player, box)) { gravityFlipUntil = now + 1200; die(hazard); }
        if (hazard.kind === "disappear" && hazard.triggered && rectsOverlap(player, { ...hazard, y: hazard.y - 4 })) die(hazard);
        if (hazard.kind === "lateSpike" && hazard.triggered && rectsOverlap(player, { ...hazard, y: hazard.y - 10 })) die(hazard);
        if (hazard.kind !== "reverse" && hazard.kind !== "blackout" && hazard.kind !== "gravityFlip" && hazard.kind !== "disappear" && hazard.kind !== "lateSpike" && rectsOverlap(player, box)) die(hazard);
      }
      if (onlineMode && arenaConnection) {
        for (const trap of arenaTraps) {
          if (trap.ownerId !== arenaConnection.playerId && rectsOverlap(player, { x: trap.x - 18, y: trap.y - 18, w: 36, h: 36 })) {
            arenaConnection.socket.emit("trap_hit", { trapId: trap.id, victimId: arenaConnection.playerId });
            die({ penalty: 200, label: "PLAYER TRAP" });
          }
        }
        networkAccumulator += dt;
        if (networkAccumulator >= 0.05) {
          networkAccumulator = 0;
          arenaConnection.socket.emit("player_state", { x: player.x, y: player.y, direction: player.vx === 0 ? 0 : player.vx > 0 ? 1 : -1, jumping: !player.grounded, gbese: save.debt });
        }
      }
      for (const key of stage.keys) {
        if (!key.collected && rectsOverlap(player, { x: key.x - 10, y: key.y - 14, w: 20, h: 28 })) {
          key.collected = true; save.keys += 1; save.keyIds.push(key.id); persist(save); music.blip(880, 0.12);
        }
      }
      if (player.x > stage.exitX - 55 && player.x < stage.exitX + 55 && player.y > 395) clearLevel();
      if (player.y > H + 55) die({ penalty: 50, label: "DIRTY GROUND" });
      player.x = Math.max(0, Math.min(stage.width - player.w, player.x));
      cameraX += (Math.max(0, Math.min(stage.width - W, player.x - 275)) - cameraX) * Math.min(1, dt * 7);
      shake = Math.max(0, shake - dt * 18);
    };

    const drawBackground = () => {
      const palettes = world === 0 ? ["#101316", "#1e2528", "#3a302c"] : world === 1 ? ["#190f15", "#451b27", "#762b32"] : ["#111a25", "#26344a", "#4b2d4f"];
      const grad = ctx.createLinearGradient(0, 0, 0, H); grad.addColorStop(0, palettes[0]); grad.addColorStop(0.55, palettes[1]); grad.addColorStop(1, palettes[2]); ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 0.18;
      for (let i = 0; i < 18; i += 1) { const x = (i * 83 - cameraX * 0.18) % (W + 100); const y = 130 + ((i * 71) % 220); ctx.fillStyle = i % 2 ? "#9db5a1" : "#d7a26f"; ctx.fillRect(x, y, 28 + (i % 4) * 9, 3); ctx.fillRect(x + 9, y - 18, 3, 18); }
      ctx.globalAlpha = 0.12; ctx.fillStyle = "#ffffff";
      for (let y = 0; y < H; y += 6) ctx.fillRect(0, y, W, 1);
      ctx.globalAlpha = 1;
    };

    const drawWorld = (now: number) => {
      drawBackground();
      ctx.save();
      const jitter = shake ? Math.sin(now / 20) * shake : 0; ctx.translate(-cameraX + jitter, 0);
      ctx.fillStyle = "#252124"; ctx.fillRect(0, 510, stage.width, 30);
      for (const platform of stage.platforms) {
        ctx.fillStyle = platform.color || "#4f413c"; ctx.fillRect(platform.x, platform.y, platform.w, platform.h);
        ctx.fillStyle = world === 1 ? "#b8413d" : world === 2 ? "#bf9c41" : "#8b725f"; ctx.fillRect(platform.x, platform.y, platform.w, 5);
        ctx.fillStyle = "rgba(7,8,10,.45)"; for (let x = platform.x + 10; x < platform.x + platform.w - 5; x += 27) ctx.fillRect(x, platform.y + 10, 12, 3);
      }
      for (const key of stage.keys) {
        if (key.collected) continue;
        const bob = Math.sin(elapsed * 6 + key.x) * 3;
        ctx.fillStyle = "#24aa5d"; ctx.fillRect(key.x - 7, key.y - 14 + bob, 14, 26); ctx.fillStyle = "#f8f2d9"; ctx.fillRect(key.x - 7, key.y - 5 + bob, 14, 7); ctx.fillStyle = "#ffffff"; ctx.fillRect(key.x - 2, key.y - 11 + bob, 5, 5); ctx.fillStyle = "#123d27"; ctx.fillRect(key.x + 3, key.y - 1 + bob, 4, 10);
      }
      for (const hazard of stage.hazards) {
        const active = hazard.kind !== "lateSpike" || hazard.triggered;
        if (!active) { ctx.strokeStyle = "#8a6c54"; ctx.setLineDash([5, 5]); ctx.strokeRect(hazard.x, hazard.y, hazard.w, hazard.h); ctx.setLineDash([]); continue; }
        if (hazard.kind === "spike" || hazard.kind === "lateSpike") {
          ctx.fillStyle = world === 1 ? "#ffb23f" : "#df7745"; for (let x = hazard.x; x < hazard.x + hazard.w; x += 15) { ctx.beginPath(); ctx.moveTo(x, hazard.y + hazard.h); ctx.lineTo(x + 8, hazard.y); ctx.lineTo(x + 16, hazard.y + hazard.h); ctx.closePath(); ctx.fill(); }
        } else if (hazard.kind === "falling") {
          ctx.fillStyle = "#a2a6a7"; ctx.fillRect(hazard.x, hazard.y, hazard.w, hazard.h); ctx.fillStyle = "#e45b47"; ctx.fillRect(hazard.x + 6, hazard.y + 6, hazard.w - 12, 5); ctx.fillStyle = "#4a4f52"; ctx.fillRect(hazard.x + 3, hazard.y + hazard.h, 4, 24); ctx.fillRect(hazard.x + 23, hazard.y + hazard.h, 4, 24);
        } else if (hazard.kind === "disappear") {
          ctx.globalAlpha = hazard.triggered ? 0.16 : 0.92; ctx.fillStyle = "#b1a05c"; ctx.fillRect(hazard.x, hazard.y, hazard.w, hazard.h); ctx.globalAlpha = 1; drawText(ctx, "SAPA", hazard.x + hazard.w / 2, hazard.y + 11, 10, "#352d22", "center", "DM Mono");
        } else if (hazard.kind === "axe") {
          ctx.save(); ctx.translate(hazard.x + hazard.w / 2, hazard.y + 22); ctx.rotate(Math.sin(hazard.phase || 0) * 0.75); ctx.fillStyle = "#d2c6a9"; ctx.fillRect(-3, 0, 6, 92); ctx.fillStyle = "#d44a44"; ctx.fillRect(-22, 74, 44, 22); ctx.fillStyle = "#2b171b"; ctx.fillRect(-16, 78, 32, 12); ctx.restore();
        } else if (hazard.kind === "fakeDoor") {
          ctx.fillStyle = "#2c6653"; ctx.fillRect(hazard.x, hazard.y, hazard.w, hazard.h); ctx.fillStyle = "#80ca86"; ctx.fillRect(hazard.x + 7, hazard.y + 7, hazard.w - 14, hazard.h - 14); ctx.fillStyle = "#d44a44"; ctx.fillRect(hazard.x + 20, hazard.y + 27, 8, 8); drawText(ctx, "?", hazard.x + 24, hazard.y + 20, 18, "#17241f", "center", "DM Mono");
        } else if (hazard.kind === "movingWall") {
          ctx.fillStyle = "#b54545"; ctx.fillRect(hazard.x, hazard.y, hazard.w, hazard.h); ctx.fillStyle = "#f2a23a"; for (let y = hazard.y + 8; y < hazard.y + hazard.h; y += 20) ctx.fillRect(hazard.x + 8, y, hazard.w - 16, 5);
        } else if (hazard.kind === "blackout") {
          ctx.strokeStyle = "#eedc75"; ctx.lineWidth = 3; ctx.strokeRect(hazard.x, hazard.y, hazard.w, hazard.h); drawText(ctx, "UP", hazard.x + hazard.w / 2, hazard.y + 29, 13, "#eedc75", "center", "DM Mono"); drawText(ctx, "NEPA", hazard.x + hazard.w / 2, hazard.y + 48, 12, "#eedc75", "center", "DM Mono");
        } else if (hazard.kind === "fakeJump") {
          ctx.fillStyle = "#bd8b46"; ctx.fillRect(hazard.x, hazard.y, hazard.w, hazard.h); drawText(ctx, "POS", hazard.x + hazard.w / 2, hazard.y + 18, 10, "#221a16", "center", "DM Mono");
        } else if (hazard.kind === "gravityFlip") {
          ctx.fillStyle = "#8b58b9"; ctx.fillRect(hazard.x, hazard.y, hazard.w, hazard.h); drawText(ctx, "↕", hazard.x + hazard.w / 2, hazard.y + hazard.h / 2, 32, "#f4d86e", "center", "DM Mono");
        } else if (hazard.kind === "multi") {
          ctx.fillStyle = "#d5543e"; ctx.fillRect(hazard.x, hazard.y, hazard.w, hazard.h); ctx.fillStyle = "#f4d86e"; for (let yy = hazard.y + 8; yy < hazard.y + hazard.h; yy += 20) ctx.fillRect(hazard.x + 8, yy, hazard.w - 16, 4); drawText(ctx, "!!!", hazard.x + hazard.w / 2, hazard.y + 30, 15, "#28151a", "center", "DM Mono");
        } else if (hazard.kind === "reverse") {
          ctx.fillStyle = "#3ca77b"; ctx.fillRect(hazard.x, hazard.y, hazard.w, hazard.h); drawText(ctx, "← →", hazard.x + hazard.w / 2, hazard.y + 22, 15, "#12231c", "center", "DM Mono");
        } else if (hazard.kind === "awoof") {
          ctx.fillStyle = "#7ba961"; ctx.fillRect(hazard.x, hazard.y, hazard.w, hazard.h); ctx.fillStyle = "#f7e4a0"; ctx.fillRect(hazard.x + 12, hazard.y + 8, hazard.w - 24, 5); drawText(ctx, "AWOOF", hazard.x + hazard.w / 2, hazard.y + 26, 10, "#1c3022", "center", "DM Mono");
        }
      }
      // Exit door and route markers
      ctx.fillStyle = "#123d2c"; ctx.fillRect(stage.exitX, 390, 58, 80); ctx.fillStyle = "#62d477"; ctx.fillRect(stage.exitX + 7, 397, 44, 73); ctx.fillStyle = "#dff6af"; ctx.fillRect(stage.exitX + 13, 406, 32, 51); ctx.fillStyle = "#1d4d34"; ctx.fillRect(stage.exitX + 37, 431, 4, 4); drawText(ctx, "JAPA", stage.exitX + 29, 382, 11, "#8ce49a", "center", "DM Mono");
      // Player
      ctx.fillStyle = "#12161c"; ctx.fillRect(player.x - 2, player.y + 7, 20, 18); ctx.fillStyle = "#e7a56e"; ctx.fillRect(player.x + 3, player.y, 11, 9); ctx.fillStyle = "#141518"; ctx.fillRect(player.x + 2, player.y - 2, 13, 4); ctx.fillStyle = world === 1 ? "#dc5145" : world === 2 ? "#e1b44e" : "#65bb71"; ctx.fillRect(player.x + 1, player.y + 9, 14, 11); ctx.fillStyle = "#f3ddba"; ctx.fillRect(player.x + 2, player.y + 21, 5, 5); ctx.fillRect(player.x + 10, player.y + 21, 5, 5);
      if (onlineMode) {
        for (const remote of remotePlayers) {
          ctx.globalAlpha = 0.58; ctx.fillStyle = "#5cc7b2"; ctx.fillRect(remote.x - 2, remote.y + 7, 20, 18); ctx.fillStyle = "#d49b76"; ctx.fillRect(remote.x + 3, remote.y, 11, 9); ctx.fillStyle = "#23786d"; ctx.fillRect(remote.x + 1, remote.y + 9, 14, 11); ctx.globalAlpha = 1;
          drawText(ctx, remote.name, remote.x + 8, remote.y - 12, 9, "#a8f1d2", "center", "DM Mono");
        }
        for (const trap of arenaTraps) {
          ctx.globalAlpha = 0.9; ctx.fillStyle = trap.ownerId === arenaConnection?.playerId ? "#f3c75a" : "#e65c4b";
          if (trap.trapType === "shege_spike") { ctx.beginPath(); ctx.moveTo(trap.x - 18, trap.y + 18); ctx.lineTo(trap.x, trap.y - 18); ctx.lineTo(trap.x + 18, trap.y + 18); ctx.closePath(); ctx.fill(); }
          else { ctx.fillRect(trap.x - 18, trap.y - 8, 36, 16); }
          ctx.globalAlpha = 1;
        }
      }
      ctx.restore();
      // HUD
      ctx.fillStyle = "rgba(7,8,10,.88)"; ctx.fillRect(0, 0, W, 64); ctx.fillStyle = WORLD_COLORS[world]; ctx.fillRect(0, 61, W, 3);
      drawText(ctx, `WORLD 0${world + 1}`, 24, 19, 12, "#a6ada7", "left", "DM Mono"); drawText(ctx, WORLD_NAMES[world].toUpperCase(), 24, 42, 16, "#f7f1e6", "left", "Space Grotesk");
      drawText(ctx, `GBESE  ₦${save.debt.toLocaleString("en-NG")}`, 450, 27, 16, "#f5d078", "center", "DM Mono"); drawText(ctx, `JAPA KEYS  ${save.keys}/10`, 790, 27, 14, "#72d88b", "center", "DM Mono");
      drawText(ctx, "Ⅱ", 930, 28, 19, "#f7f1e6", "center", "DM Mono");
      if (now < reverseUntil) { ctx.fillStyle = "rgba(38,165,115,.9)"; ctx.fillRect(326, 74, 308, 32); drawText(ctx, "VILLAGE PEOPLE: CONTROLS REVERSED", 480, 90, 12, "#07120e", "center", "DM Mono"); }
      if (now < blackoutUntil) { ctx.fillStyle = "rgba(0,0,0,.96)"; ctx.fillRect(0, 0, W, H); drawText(ctx, "UP NEPA", W / 2, H / 2 - 15, 30, "#d6c15e", "center", "DM Mono"); drawText(ctx, "blackout wahala...", W / 2, H / 2 + 22, 14, "#8f8f7e", "center", "DM Mono"); }
      if (screen === "playing") {
        const controlY = H - 100; const leftWidth = 175 * controlScale; const rightStart = 212 - (controlScale - 1) * 50; const rightWidth = 175 * controlScale; const jumpStart = 744 - (controlScale - 1) * 40; const jumpWidth = 185 * controlScale;
        ctx.globalAlpha = 0.86; ctx.fillStyle = "#111418"; ctx.fillRect(22, controlY, leftWidth, 66 * controlScale); ctx.fillRect(rightStart, controlY, rightWidth, 66 * controlScale); if (onlineMode) ctx.fillRect(500 - (controlScale - 1) * 45, H - 111, 220 * controlScale, 77 * controlScale); ctx.fillRect(jumpStart, H - 111, jumpWidth, 77 * controlScale); ctx.globalAlpha = 1;
        drawText(ctx, "◀", 22 + leftWidth / 2, controlY + 33 * controlScale, 30 * controlScale, "#e8e2d6", "center", "DM Mono"); drawText(ctx, "▶", rightStart + rightWidth / 2, controlY + 33 * controlScale, 30 * controlScale, "#e8e2d6", "center", "DM Mono"); drawText(ctx, "JUMP", jumpStart + jumpWidth / 2, H - 72, 20 * controlScale, WORLD_COLORS[world], "center", "DM Mono");
        if (onlineMode) { const trapStart = 500 - (controlScale - 1) * 45; drawText(ctx, "DROP TRAP", trapStart + 110 * controlScale, H - 77, 16 * controlScale, "#e65c4b", "center", "DM Mono"); drawText(ctx, "SAPA · SPIKE · AWOOF", trapStart + 110 * controlScale, H - 48, 9 * controlScale, "#a5aaa1", "center", "DM Mono"); }
        drawText(ctx, "A / D or touch", 110, H - 18, 10, "#81877e", "center", "DM Mono"); drawText(ctx, "SPACE", 836, H - 18, 10, "#81877e", "center", "DM Mono");
        if (onlineMode) { drawText(ctx, arenaNotice, 480, 82, 11, "#f0c86b", "center", "DM Mono"); leaderboard.slice(0, 4).forEach((entry, index) => drawText(ctx, `${index + 1}. ${entry.name}  ₦${entry.gbese}`, 780, 100 + index * 16, 10, index === 0 ? "#f0c86b" : "#a5aaa1", "left", "DM Mono")); }
      }
    };

    const drawOverlay = () => {
      ctx.fillStyle = "rgba(6,7,9,.88)"; ctx.fillRect(0, 0, W, H); ctx.fillStyle = WORLD_COLORS[world]; ctx.fillRect(0, 0, 8, H); ctx.fillRect(W - 8, 0, 8, H);
    };
    const drawTitle = () => {
      if (art.complete && art.naturalWidth) { ctx.globalAlpha = 0.58; ctx.drawImage(art, 0, 0, W, H); ctx.globalAlpha = 1; }
      else drawBackground();
      ctx.fillStyle = "rgba(9,10,12,.72)"; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#71be79"; ctx.fillRect(58, 66, 8, 172); ctx.fillStyle = "#f2d374"; ctx.fillRect(58, 246, 8, 70);
      drawText(ctx, "NNL // 001", 90, 74, 13, "#8bcf8c", "left", "DM Mono"); drawText(ctx, "NAIJA", 90, 136, 64, "#f7f1e6", "left", "Space Grotesk"); drawText(ctx, "NORMAL", 90, 194, 64, "#f7f1e6", "left", "Space Grotesk"); drawText(ctx, "LEVEL", 90, 252, 64, "#73c27c", "left", "Space Grotesk");
      drawText(ctx, "A pixel rage platformer about surviving the shege.", 92, 288, 14, "#c1beb1", "left", "DM Mono"); drawText(ctx, "Fuck around and Sabi am", 92, 307, 13, "#f2d374", "left", "DM Mono");
      drawButton(ctx, "OFFLINE MODE  //  CLASSIC STRUGGLE", 90, 322, 340, 50, "#72c67f"); drawButton(ctx, "ADJUST YOUR WAHALA", 90, 382, 300, 44, "#c7a657", true); drawButton(ctx, "PEOPLE WEY HELP BUILD THIS SHEGE", 90, 436, 300, 44, "#73858b", true); drawButton(ctx, "ONLINE ARENA  //  50-PLAYER SABOTAGE", 560, 322, 320, 50, "#e65c4b");
      ctx.fillStyle = "rgba(7,8,10,.82)"; ctx.fillRect(690, 390, 190, 74); drawText(ctx, "CURRENT GBese", 710, 410, 11, "#8e978c", "left", "DM Mono"); drawText(ctx, `₦${save.debt.toLocaleString("en-NG")}`, 710, 440, 24, "#f3cc65", "left", "DM Mono"); drawText(ctx, "tap anywhere to wake audio", 90, 504, 11, "#7c877e", "left", "DM Mono");
    };
    const drawArena = () => {
      drawOverlay(); drawText(ctx, "ONLINE ARENA", 72, 70, 36, "#e65c4b", "left", "Space Grotesk"); drawText(ctx, "50-player sabotage · real-time wahala", 74, 103, 13, "#b5a79d", "left", "DM Mono");
      ctx.fillStyle = "rgba(20,24,26,.95)"; ctx.fillRect(72, 150, 530, 250); ctx.strokeStyle = "#e65c4b"; ctx.strokeRect(73, 151, 528, 248);
      drawText(ctx, "QUICK-MATCH QUEUE", 100, 190, 13, "#f0c86b", "left", "DM Mono"); drawText(ctx, "Find an open arena or create one.", 100, 226, 18, "#f7f1e6", "left", "Space Grotesk"); drawText(ctx, arenaNotice, 100, 258, 12, "#a5aaa1", "left", "DM Mono");
      drawButton(ctx, "ENTER LIVE ROOM", 100, 286, 270, 48, "#e65c4b"); drawText(ctx, "Room capacity: 50 players", 100, 368, 12, "#8d9890", "left", "DM Mono");
      ctx.fillStyle = "rgba(20,24,26,.95)"; ctx.fillRect(632, 150, 248, 250); ctx.strokeStyle = "#f0c86b"; ctx.strokeRect(633, 151, 246, 248); drawText(ctx, "STREAMER WAHALA", 655, 190, 13, "#f0c86b", "left", "DM Mono"); drawText(ctx, streamerEnabled ? "CONNECTED" : "NOT CONNECTED", 655, 225, 21, streamerEnabled ? "#72c67f" : "#9b8278", "left", "Space Grotesk"); drawButton(ctx, "CONNECT YOUTUBE CHAT", 655, 270, 190, 46, "#72c67f", true); drawText(ctx, "!echoke  !upnepa", 655, 354, 11, "#a5aaa1", "left", "DM Mono"); drawText(ctx, "!villagepeople  !godabeg", 655, 375, 11, "#a5aaa1", "left", "DM Mono");
      drawButton(ctx, "JAPA FROM ARENA", 72, 455, 210, 42, "#73858b", true);
    };
    const drawWorlds = () => {
      drawOverlay(); drawText(ctx, "SELECT YOUR WAHALA", 70, 68, 32, "#f7f1e6", "left", "Space Grotesk"); drawText(ctx, "three zones of increasing disrespect", 72, 101, 13, "#8e978c", "left", "DM Mono");
      for (let i = 0; i < 4; i += 1) {
        const x = 70 + i * 220; const locked = i > save.unlocked; const accent = WORLD_COLORS[i] || "#626865";
        ctx.fillStyle = locked ? "rgba(27,30,31,.75)" : "rgba(20,24,24,.96)"; ctx.fillRect(x, 150, 195, 245); ctx.strokeStyle = accent; ctx.lineWidth = 2; ctx.strokeRect(x + 1, 151, 193, 243); ctx.fillStyle = accent; ctx.fillRect(x, 150, 195, 8);
        drawText(ctx, `0${i + 1}`, x + 18, 184, 20, accent, "left", "DM Mono"); drawText(ctx, WORLD_NAMES[i], x + 18, 225, 16, locked ? "#788079" : "#f7f1e6", "left", "Space Grotesk");
        drawText(ctx, locked ? "LOCKED" : WORLD_SUBTITLES[i], x + 18, 263, 10, locked ? "#747a73" : "#9ca499", "left", "DM Mono");
        ctx.fillStyle = locked ? "#4b514e" : accent; ctx.fillRect(x + 18, 302, 156, 3); drawText(ctx, locked ? "clear the previous zone" : "ENTER", x + 18, 340, 11, locked ? "#666e67" : accent, "left", "DM Mono");
      }
      drawText(ctx, `GBESE ₦${save.debt.toLocaleString("en-NG")}  ·  JAPA KEYS ${save.keys}/10`, 72, 431, 13, "#f3cc65", "left", "DM Mono"); drawButton(ctx, "I DON TIRE — BACK", 70, 466, 205, 42, "#73858b", true);
    };
    const drawOptions = () => { drawOverlay(); drawText(ctx, "ADJUST YOUR WAHALA", 80, 80, 32, "#f7f1e6", "left", "Space Grotesk"); drawText(ctx, "the controls are already stressful enough", 82, 113, 13, "#8e978c", "left", "DM Mono"); drawButton(ctx, `MUSIC  //  ${MUSIC_TRACKS[musicTrack]}`, 82, 168, 420, 52, musicTrack === 0 ? "#73858b" : "#72c67f"); drawButton(ctx, `TOUCH CONTROLS  //  ${controlScale.toFixed(1)}x ${controlScale === 0.8 ? "SMALL" : controlScale === 1 ? "MEDIUM" : "LARGE"}`, 82, 236, 420, 52, "#c7a657"); drawButton(ctx, `STREAMER MODE  //  ${streamerEnabled ? "ON" : "OFF"}`, 82, 304, 420, 52, streamerEnabled ? "#72c67f" : "#73858b"); drawText(ctx, "tap a button to cycle. settings persist on this device.", 82, 402, 13, "#98a094", "left", "DM Mono"); drawButton(ctx, "BACK TO MENU", 82, 462, 188, 42, "#73858b", true); };
    const drawCredits = () => { drawOverlay(); drawText(ctx, "PEOPLE WEY HELP BUILD THIS SHEGE", 74, 58, 26, "#f7f1e6", "left", "Space Grotesk"); drawText(ctx, "A tiny arcade built with big wahala.", 76, 88, 12, "#8e978c", "left", "DM Mono"); drawText(ctx, "DESIGN", 80, 132, 11, "#72c67f", "left", "DM Mono"); drawText(ctx, "You + The Village People", 80, 153, 16, "#f7f1e6", "left", "Space Grotesk"); drawText(ctx, "ENGINE", 80, 190, 11, "#c7a657", "left", "DM Mono"); drawText(ctx, "Canvas API · Vite · React · TypeScript", 80, 211, 14, "#f7f1e6", "left", "Space Grotesk"); drawText(ctx, "Web Audio API · Express + Socket.io", 80, 231, 14, "#f7f1e6", "left", "Space Grotesk"); drawText(ctx, "MUSIC", 80, 270, 11, "#73858b", "left", "DM Mono"); drawText(ctx, "Chiptune + Fuji · Afro-Beats Rush", 80, 291, 14, "#f7f1e6", "left", "Space Grotesk"); drawText(ctx, "Street-Pop Chaos", 80, 311, 14, "#f7f1e6", "left", "Space Grotesk"); drawText(ctx, "Frantic Talking Drum Dept.", 80, 331, 12, "#a5aaa1", "left", "DM Mono"); drawText(ctx, "DEVELOPER", 80, 370, 11, "#e65c4b", "left", "DM Mono"); drawText(ctx, "Azamen (Alpha Collective Corporation)", 80, 394, 17, "#f7f1e6", "left", "Space Grotesk"); drawButton(ctx, "BACK TO MENU", 80, 454, 188, 42, "#73858b", true); };
    const drawPause = () => { drawOverlay(); drawText(ctx, "HOLD ON SMALL", W / 2, 95, 34, "#f7f1e6", "center", "Space Grotesk"); drawText(ctx, "the shege is still here when you return", W / 2, 130, 13, "#9aa297", "center", "DM Mono"); drawButton(ctx, "WE MOVE", 335, 170, 290, 48, WORLD_COLORS[world]); drawButton(ctx, "TRY THIS SHEGE AGAIN", 335, 235, 290, 48, "#c7a657"); if (adminMode && !onlineMode) drawButton(ctx, "SKIP LEVEL  //  ADMIN MODE", 335, 300, 290, 48, "#b78cff"); drawButton(ctx, "JAPA FROM THE GAME", 335, adminMode && !onlineMode ? 365 : 300, 290, 48, "#73858b"); if (adminMode && !onlineMode) drawText(ctx, "OFFLINE GOD MODE ENABLED", W / 2, 445, 11, "#b78cff", "center", "DM Mono"); };
    const drawDead = () => { drawWorld(performance.now()); ctx.fillStyle = "rgba(71,20,26,.72)"; ctx.fillRect(0, 0, W, H); drawText(ctx, deathMessage, W / 2, 208, 26, "#fff0dc", "center", "Space Grotesk"); drawText(ctx, `GBESE +₦${deathPenalty}`, W / 2, 250, 18, "#ffbc6b", "center", "DM Mono"); drawText(ctx, "respawning in a blink...", W / 2, 300, 12, "#efb7a4", "center", "DM Mono"); };
    const drawClear = () => { drawOverlay(); drawText(ctx, "LEVEL CLEAR", W / 2, 115, 38, "#72c67f", "center", "Space Grotesk"); drawText(ctx, clearMessage, W / 2, 168, 17, "#f7f1e6", "center", "Space Grotesk"); drawText(ctx, "PAYOUT  +₦2,000", W / 2, 238, 21, "#f3cc65", "center", "DM Mono"); drawText(ctx, `GBESE NOW  ₦${save.debt.toLocaleString("en-NG")}`, W / 2, 274, 14, "#a3aea1", "center", "DM Mono"); drawButton(ctx, "NEXT DOOR", 355, 355, 250, 50, WORLD_COLORS[world]); };

    const draw = (now: number) => {
      ctx.save(); ctx.setTransform(canvas.width / W, 0, 0, canvas.height / H, 0, 0); ctx.clearRect(0, 0, W, H);
      if (screen === "title") drawTitle(); else if (screen === "worlds") drawWorlds(); else if (screen === "arena") drawArena(); else if (screen === "options") drawOptions(); else if (screen === "credits") drawCredits(); else if (screen === "playing") drawWorld(now); else if (screen === "paused") { drawWorld(now); drawPause(); } else if (screen === "dead") drawDead(); else if (screen === "clear") drawClear();
      if (adminToast && now < adminToastUntil) { ctx.fillStyle = "rgba(19,13,31,.96)"; ctx.fillRect(170, 24, 620, 48); ctx.strokeStyle = "#b78cff"; ctx.lineWidth = 2; ctx.strokeRect(171, 25, 618, 46); drawText(ctx, adminToast, W / 2, 48, 15, "#f0ddff", "center", "DM Mono"); }
      ctx.restore();
    };
    const loop = (now: number) => { const dt = Math.min(0.034, (now - last) / 1000); last = now; elapsed += dt; update(dt, now); draw(now); raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); arenaConnection?.leave(); window.removeEventListener("resize", resize); canvas.removeEventListener("pointerdown", handlePointerDown); canvas.removeEventListener("pointerup", handlePointerUp); canvas.removeEventListener("pointercancel", handlePointerUp); window.removeEventListener("keydown", keydown); window.removeEventListener("keyup", keyup); music.stop(); };
  }, []);

  return <canvas ref={canvasRef} aria-label="Naija Normal Level game canvas" />;
}
