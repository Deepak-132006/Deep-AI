"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("deepAI", {
  getAppVersion: () => electron.ipcRenderer.invoke("app:get-version"),
  minimizeWindow: () => electron.ipcRenderer.send("window:minimize"),
  showOrb: () => electron.ipcRenderer.invoke("window:show-orb"),
  minimizeOrb: () => electron.ipcRenderer.invoke("window:minimize-orb"),
  closeOrb: () => electron.ipcRenderer.invoke("window:close-orb"),
  showChat: () => electron.ipcRenderer.invoke("window:show-chat"),
  moveOrbBy: (deltaX, deltaY) => electron.ipcRenderer.send("window:move-orb", deltaX, deltaY),
  setOrbMouseInteractive: (interactive) => electron.ipcRenderer.send("orb:set-mouse-interactive", interactive),
  onBackendStatus: (callback) => {
    const listener = (_event, status) => {
      callback(status);
    };
    electron.ipcRenderer.on("backend:status", listener);
    return () => {
      electron.ipcRenderer.removeListener("backend:status", listener);
    };
  }
});
