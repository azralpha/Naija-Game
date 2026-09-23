import { io, Socket } from "socket.io-client";

export type RemotePlayer = {
  id: string;
  name: string;
  x: number;
  y: number;
  direction: -1 | 0 | 1;
  jumping: boolean;
  gbese: number;
};

export type ArenaTrap = {
  id: string;
  ownerId: string;
  x: number;
  y: number;
  trapType: "sapa_floor" | "shege_spike" | "awoof_platform";
  expiresAt: number;
};

export type ArenaLeaderboardEntry = { id: string; name: string; gbese: number; level?: number };
export type StreamerEvent = { command: "echoke" | "upnepa" | "villagepeople" | "godabeg"; by: string };

export type ArenaConnection = {
  socket: Socket;
  roomId: string;
  playerId: string;
  playerName: string;
  leave: () => void;
};

export function connectArena(options: {
  roomId?: string;
  playerName: string;
  onRoom: (payload: { roomId: string; playerId: string; players: RemotePlayer[] }) => void;
  onPlayers: (players: RemotePlayer[]) => void;
  onTrap: (trap: ArenaTrap) => void;
  onLeaderboard: (entries: ArenaLeaderboardEntry[]) => void;
  onStreamerEvent: (event: StreamerEvent) => void;
  onNotice: (message: string) => void;
}) {
  const socket = io(window.location.origin, { transports: ["websocket", "polling"], autoConnect: true });
  let roomId = options.roomId || "";
  let playerId = "";
  socket.on("connect", () => {
    socket.emit("quick_match", { roomId, playerName: options.playerName });
  });
  socket.on("room_joined", (payload) => { roomId = payload.roomId; playerId = payload.playerId; options.onRoom(payload); });
  socket.on("room_players", options.onPlayers);
  socket.on("spawn_global_trap", options.onTrap);
  socket.on("leaderboard_update", options.onLeaderboard);
  socket.on("streamer_event", options.onStreamerEvent);
  socket.on("arena_notice", (payload: { message: string }) => options.onNotice(payload.message));
  socket.on("connect_error", () => options.onNotice("Arena server unavailable — solo mode still works."));
  socket.on("disconnect", () => options.onNotice("Arena connection lost. Trying again..."));
  const connection: ArenaConnection = {
    socket,
    get roomId() { return roomId; },
    get playerId() { return playerId; },
    get playerName() { return options.playerName; },
    leave: () => { socket.emit("leave_room"); socket.disconnect(); },
  };
  return connection;
}
