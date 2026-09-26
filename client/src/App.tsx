import GameCanvas from "./components/GameCanvas";
import LevelEditor from "./pages/LevelEditor";

export default function App() {
  const editorAuthorized = sessionStorage.getItem("nnl-editor-admin") === "true";
  return window.location.pathname === "/editor" && editorAuthorized ? <LevelEditor /> : <GameCanvas />;
}
