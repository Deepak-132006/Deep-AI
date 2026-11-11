import { ipcMain, app, BrowserWindow, screen } from "electron";
import { fileURLToPath } from "node:url";
import path from "node:path";
const __dirname$1 = path.dirname(fileURLToPath(import.meta.url));
process.env.APP_ROOT = path.join(__dirname$1, "..");
const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, "public") : RENDERER_DIST;
let chatWindow = null;
let orbWindow = null;
function loadRenderer(window, mode) {
  if (VITE_DEV_SERVER_URL) {
    window.loadURL(
      mode === "orb" ? `${VITE_DEV_SERVER_URL}#orb` : VITE_DEV_SERVER_URL
    );
  } else {
    window.loadFile(path.join(RENDERER_DIST, "index.html"), {
      hash: mode === "orb" ? "orb" : ""
    });
  }
}
function createChatWindow() {
  chatWindow = new BrowserWindow({
    width: 1e3,
    height: 700,
    minWidth: 700,
    minHeight: 500,
    show: true,
    icon: path.join(process.env.VITE_PUBLIC, "electron-vite.svg"),
    webPreferences: {
      preload: path.join(__dirname$1, "preload.mjs")
    }
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
      preload: path.join(__dirname$1, "preload.mjs")
    }
  });
  orbWindow.setIgnoreMouseEvents(true, { forward: true });
  loadRenderer(orbWindow, "orb");
  orbWindow.once("ready-to-show", () => {
    orbWindow == null ? void 0 : orbWindow.show();
  });
  orbWindow.on("closed", () => {
    orbWindow = null;
  });
}
ipcMain.handle("window:show-orb", () => {
  createOrbWindow();
  chatWindow == null ? void 0 : chatWindow.hide();
});
ipcMain.handle("window:show-chat", () => {
  if (!chatWindow || chatWindow.isDestroyed()) {
    createChatWindow();
  } else {
    chatWindow.show();
    chatWindow.focus();
  }
  orbWindow == null ? void 0 : orbWindow.hide();
});
ipcMain.handle("app:get-version", () => app.getVersion());
ipcMain.on("window:minimize", () => {
  chatWindow == null ? void 0 : chatWindow.minimize();
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
  orbWindow == null ? void 0 : orbWindow.minimize();
});
ipcMain.handle("window:close-orb", () => {
  if (chatWindow && !chatWindow.isDestroyed()) {
    chatWindow.show();
    chatWindow.focus();
  }
  orbWindow == null ? void 0 : orbWindow.close();
});
ipcMain.on("window:move-orb", (event, deltaX, deltaY) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win || win.isDestroyed()) return;
  if (!Number.isFinite(deltaX) || !Number.isFinite(deltaY)) return;
  const [x, y] = win.getPosition();
  win.setPosition(
    x + Math.round(deltaX),
    y + Math.round(deltaY)
  );
});
ipcMain.on("orb:set-mouse-interactive", (_event, interactive) => {
  if (!orbWindow || orbWindow.isDestroyed()) return;
  orbWindow.setIgnoreMouseEvents(!interactive, { forward: true });
});
export {
  MAIN_DIST,
  RENDERER_DIST,
  VITE_DEV_SERVER_URL
};
