import "./styles.css";
import { GameApp } from "./game/GameApp";

function showFatalError(error: unknown): void {
  const root = document.querySelector<HTMLDivElement>("#error-root");
  const message = error instanceof Error ? `${error.message}\n\n${error.stack ?? ""}` : String(error);
  if (root) root.textContent = message;
  console.error(error);
}

async function main(): Promise<void> {
  const canvas = document.querySelector<HTMLCanvasElement>("#game-canvas");
  if (!canvas) throw new Error("Missing #game-canvas element.");
  const app = new GameApp(canvas);
  try {
    await app.start();
    (globalThis as typeof globalThis & { __KODU_APP__?: GameApp }).__KODU_APP__ = app;
  } catch (error) {
    app.dispose();
    throw error;
  }
}

main().catch(showFatalError);
