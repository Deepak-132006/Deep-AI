import { app, BrowserWindow, ipcMain, screen } from "electron";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

process.env.APP_ROOT = path.join(__dirname, "..");

export const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
export const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
export const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, "public")
  : RENDERER_DIST;

let chatWindow: BrowserWindow | null = null;
let orbWindow: BrowserWindow | null = null;

function loadRenderer(window: BrowserWindow, mode: "chat" | "orb") {
  if (VITE_DEV_SERVER_URL) {
    window.loadURL(
      mode === "orb" ? `${VITE_DEV_SERVER_URL}#orb` : VITE_DEV_SERVER_URL,
    );
  } else {
    window.loadFile(path.join(RENDERER_DIST, "index.html"), {
      hash: mode === "orb" ? "orb" : "",
    });
  }
}

function createChatWindow() {
  chatWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    minWidth: 700,
    minHeight: 500,
    show: true,
    icon: path.join(process.env.VITE_PUBLIC!, "electron-vite.svg"),
    webPreferences: {
      preload: path.join(__dirname, "preload.mjs"),
    },
  });

  chatWindow.maximize();
  loadRenderer(chatWindow, "chat");

  chatWindow.on("closed", () => {
    chatWindow = null;
  });
}

function createOrbWindow() {
  if (orbWindow && !orbWindow.isDestroyed()) {
    orbWindow.show();
    orbWindow.focus();
    return;
  }

  const { workArea } = screen.getPrimaryDisplay();
  const orbSize = 110;
  const margin = 16;

  orbWindow = new BrowserWindow({
    x: workArea.x + workArea.width - orbSize - margin,
    y: workArea.y + workArea.height - orbSize - margin,
    width: orbSize,
    height: orbSize,
    frame: false,
    transparent: true,
    backgroundColor: "#00000000",
    resizable: false,
    maximizable: false,
    minimizable: true,
    alwaysOnTop: true,
    skipTaskbar: false,
    hasShadow: false,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.mjs"),
    },
  });

  orbWindow.setIgnoreMouseEvents(true, { forward: true });

  loadRenderer(orbWindow, "orb");

  orbWindow.once("ready-to-show", () => {
    orbWindow?.show();
  });

  orbWindow.on("closed", () => {
    orbWindow = null;
  });
}

ipcMain.handle("window:show-orb", () => {
  createOrbWindow();
  chatWindow?.hide();
});

ipcMain.handle("window:show-chat", () => {
  if (!chatWindow || chatWindow.isDestroyed()) {
    createChatWindow();
  } else {
    chatWindow.show();
    chatWindow.focus();
  }

  orbWindow?.hide();
});

ipcMain.handle("app:get-version", () => app.getVersion());

ipcMain.on("window:minimize", () => {
  chatWindow?.minimize();
});

app.whenReady().then(() => {
  createChatWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createChatWindow();
    } else if (chatWindow && !chatWindow.isDestroyed()) {
      chatWindow.show();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

ipcMain.handle("window:minimize-orb", () => {
  orbWindow?.minimize();
});

ipcMain.handle("window:close-orb", () => {
  if (chatWindow && !chatWindow.isDestroyed()) {
    chatWindow.show();
    chatWindow.focus();
  }

  orbWindow?.close();
});


ipcMain.on("window:move-orb", (event, deltaX: number, deltaY: number) => {
  const win = BrowserWindow.fromWebContents(event.sender);

  if (!win || win.isDestroyed()) return;
  if (!Number.isFinite(deltaX) || !Number.isFinite(deltaY)) return;

  const [x, y] = win.getPosition();

  win.setPosition(
    x + Math.round(deltaX),
    y + Math.round(deltaY)
  );
});


ipcMain.on("orb:set-mouse-interactive", (_event, interactive: boolean) => {
  if (!orbWindow || orbWindow.isDestroyed()) return;

  orbWindow.setIgnoreMouseEvents(!interactive, { forward: true });
});