import { useEffect, useMemo, useState } from "react";
import { cloneRoom, createEmptyRoom, ROOM_PREFABS, TILE_EMPTY, TILE_SIZE, TILE_SLOPE_L, TILE_SLOPE_R, TILE_SOLID, validateRoom, type RoomData, type RoomShapeType, type TrapType } from "../game/roomData";

type Tool = "solid" | "box" | "slope_l" | "slope_r" | "one_way" | "shege_spike" | "sapa_drop" | "japa_door" | "gwg_key" | "reverse_zone" | "spawn" | "exit" | "eraser";
const TOOLS: Array<{ id: Tool; label: string; color: string }> = [
  { id: "solid", label: "Solid Ground", color: "#6dc47a" }, { id: "box", label: "Solid Box", color: "#c89b6b" }, { id: "slope_l", label: "Slope ◢", color: "#8cb7e8" }, { id: "slope_r", label: "Slope ◣", color: "#8cb7e8" }, { id: "one_way", label: "One-Way", color: "#f0d36c" },
  { id: "shege_spike", label: "Shege Spike", color: "#f06d5f" }, { id: "sapa_drop", label: "Sapa Drop", color: "#d39167" }, { id: "japa_door", label: "Japa Door", color: "#6fe19a" }, { id: "gwg_key", label: "GWG Key", color: "#f1e4a0" }, { id: "reverse_zone", label: "Reverse Zone", color: "#c09af7" }, { id: "spawn", label: "Spawn", color: "#6fe19a" }, { id: "exit", label: "Exit", color: "#f0c86b" }, { id: "eraser", label: "Eraser", color: "#9da8a3" },
];
const SHAPES: RoomShapeType[] = ["triangle_vertical", "slope_run", "hourglass", "vertical_shaft", "normal"];

function trapType(tool: Tool): TrapType | null { return ["shege_spike", "sapa_drop", "japa_door", "gwg_key", "reverse_zone"].includes(tool) ? tool as TrapType : null; }
function tileFor(tool: Tool) { if (tool === "solid" || tool === "box" || tool === "one_way") return TILE_SOLID; if (tool === "slope_l") return TILE_SLOPE_L; if (tool === "slope_r") return TILE_SLOPE_R; return TILE_EMPTY; }

export default function LevelEditor() {
  const [room, setRoom] = useState<RoomData>(() => cloneRoom(ROOM_PREFABS[0]));
  const [tool, setTool] = useState<Tool>("solid");
  const [widthDraft, setWidthDraft] = useState(room.width); const [heightDraft, setHeightDraft] = useState(room.height);
  const [importText, setImportText] = useState(""); const [notice, setNotice] = useState("");
  useEffect(() => { if (sessionStorage.getItem("nnl-editor-admin") !== "true") window.location.replace("/"); }, []);
  const issues = useMemo(() => validateRoom(room), [room]);
  const updateCell = (x: number, y: number) => {
    setRoom((current) => {
      const next = cloneRoom(current);
      if (tool === "spawn") { next.spawnPoint = { x, y }; return next; }
      if (tool === "exit") { next.exitPoint = { x, y }; return next; }
      const trap = trapType(tool);
      if (trap) { next.traps = [...next.traps.filter((item) => item.x !== x || item.y !== y), { type: trap, x, y, direction: trap === "shege_spike" ? "up" : undefined }]; return next; }
      next.traps = next.traps.filter((item) => item.x !== x || item.y !== y);
      next.tiles[y][x] = tool === "eraser" ? TILE_EMPTY : tileFor(tool);
      return next;
    });
  };
  const resizeRoom = () => {
    const width = Math.max(15, Math.min(60, Math.round(widthDraft))); const height = Math.max(15, Math.min(60, Math.round(heightDraft)));
    const next = createEmptyRoom(width, height); next.id = room.id; next.name = room.name; next.shapeType = room.shapeType; setRoom(next); setWidthDraft(width); setHeightDraft(height); setNotice(`New ${width}×${height} room ready.`);
  };
  const loadPrefab = (id: string) => { const found = ROOM_PREFABS.find((item) => item.id === id); if (found) { const next = cloneRoom(found); setRoom(next); setWidthDraft(next.width); setHeightDraft(next.height); setNotice(`${next.name} loaded.`); } };
  const exportJson = () => {
    const validation = validateRoom(room);
    if (validation.some((item) => item.includes("Spawn point") || item.includes("Exit point"))) { alert("Export blocked: place both a Spawn Point and an Exit Point on the grid first."); return; }
    if (validation.length) { alert(`Export blocked:\n${validation.join("\n")}`); return; }
    const blob = new Blob([JSON.stringify(room, null, 2)], { type: "application/json" }); const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = `${room.id || "level-shege-room"}.json`; link.click(); URL.revokeObjectURL(url); setNotice("Clean room JSON exported.");
  };
  const importJson = () => { try { const parsed = JSON.parse(importText) as RoomData; const validation = validateRoom(parsed); if (validation.length) { setNotice(`Import rejected: ${validation.join(" ")}`); return; } setRoom(cloneRoom(parsed)); setWidthDraft(parsed.width); setHeightDraft(parsed.height); setImportText(""); setNotice("Room JSON imported."); } catch { setNotice("Import rejected: invalid JSON."); } };
  return <main className="editor-shell">
    <header className="editor-header"><div><p className="editor-kicker">NNL // ADMIN ACCESS</p><h1>LEVEL SHEGE / ROOM EDITOR</h1><p>Paint geometry, place traps, export clean JSON. God mode only.</p></div><button className="editor-button muted" onClick={() => window.location.assign("/")}>EXIT EDITOR</button></header>
    <section className="editor-controls"><label>WIDTH <input type="number" min={15} max={60} value={widthDraft} onChange={(event) => setWidthDraft(Number(event.target.value))} /></label><label>HEIGHT <input type="number" min={15} max={60} value={heightDraft} onChange={(event) => setHeightDraft(Number(event.target.value))} /></label><button className="editor-button" onClick={resizeRoom}>APPLY DIMENSIONS</button><select value={room.shapeType} onChange={(event) => setRoom({ ...room, shapeType: event.target.value as RoomShapeType })}>{SHAPES.map((shape) => <option key={shape}>{shape}</option>)}</select><select value="" onChange={(event) => loadPrefab(event.target.value)}><option value="">LOAD PREFAB…</option>{ROOM_PREFABS.map((prefab) => <option value={prefab.id} key={prefab.id}>{prefab.name}</option>)}</select></section>
    <section className="editor-meta"><label>ID <input value={room.id} onChange={(event) => setRoom({ ...room, id: event.target.value })} /></label><label>NAME <input value={room.name} onChange={(event) => setRoom({ ...room, name: event.target.value })} /></label><span className={issues.length ? "validation bad" : "validation good"}>{issues.length ? `${issues.length} validation issue(s)` : "ROOM VALID"}</span></section>
    <section className="editor-stage"><div className="grid-scroll"><div className="tile-grid" style={{ gridTemplateColumns: `repeat(${room.width}, ${TILE_SIZE}px)`, gridTemplateRows: `repeat(${room.height}, ${TILE_SIZE}px)` }}>{room.tiles.map((row, y) => row.map((tile, x) => { const trap = room.traps.find((item) => item.x === x && item.y === y); const point = room.spawnPoint.x === x && room.spawnPoint.y === y ? "S" : room.exitPoint.x === x && room.exitPoint.y === y ? "E" : trap ? trap.type === "shege_spike" ? "^" : trap.type === "gwg_key" ? "K" : trap.type === "japa_door" ? "D" : trap.type === "reverse_zone" ? "R" : "·" : ""; return <button aria-label={`tile ${x},${y}`} key={`${x}-${y}`} onPointerDown={() => updateCell(x, y)} className={`tile tile-${tile} ${point ? "tile-marked" : ""}`}><span>{point}</span></button>; }))}</div></div><aside className="editor-side"><h2>ROOM OUTPUT</h2><p>{room.width}×{room.height} · {room.shapeType}</p><p>SPAWN {room.spawnPoint.x >= 0 ? `${room.spawnPoint.x},${room.spawnPoint.y}` : "NOT PLACED"}</p><p>EXIT {room.exitPoint.x >= 0 ? `${room.exitPoint.x},${room.exitPoint.y}` : "NOT PLACED"}</p><div className="editor-mini-actions"><button className="editor-button muted" onClick={() => setRoom({ ...room, spawnPoint: { x: -1, y: -1 } })}>CLEAR SPAWN</button><button className="editor-button muted" onClick={() => setRoom({ ...room, exitPoint: { x: -1, y: -1 } })}>CLEAR EXIT</button></div><p>{room.traps.length} trap/trigger nodes</p><button className="editor-button primary" onClick={exportJson}>EXPORT JSON</button><textarea value={importText} onChange={(event) => setImportText(event.target.value)} placeholder="Paste exported room JSON here…" /><button className="editor-button" onClick={importJson}>IMPORT JSON</button>{notice && <p className="editor-notice">{notice}</p>}</aside></section>
    <nav className="editor-toolbar" aria-label="Tile tools">{TOOLS.map((item) => <button key={item.id} onClick={() => setTool(item.id)} className={tool === item.id ? "tool active" : "tool"} style={{ borderColor: item.color }}><b>{item.id === "eraser" ? "✖" : item.id === "spawn" ? "S" : item.id === "exit" ? "E" : "·"}</b>{item.label}</button>)}</nav>
  </main>;
}
