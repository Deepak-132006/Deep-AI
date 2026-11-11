import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("deepAI", {
  getAppVersion: () => ipcRenderer.invoke("app:get-version"),

  minimizeWindow: () => ipcRenderer.send("window:minimize"),

  showOrb: () => ipcRenderer.invoke("window:show-orb"),

  minimizeOrb: () => ipcRenderer.invoke("window:minimize-orb"),

  closeOrb: () => ipcRenderer.invoke("window:close-orb"),

  showChat: () => ipcRenderer.invoke("window:show-chat"),

  moveOrbBy: (deltaX: number, deltaY: number) =>
    ipcRenderer.send("window:move-orb", deltaX, deltaY),

  setOrbMouseInteractive: (interactive: boolean) =>
    ipcRenderer.send("orb:set-mouse-interactive", interactive),

  onBackendStatus: (callback: (status: string) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, status: string) => {
      callback(status);
    };

    ipcRenderer.on("backend:status", listener);

    return () => {
      ipcRenderer.removeListener("backend:status", listener);
    };
  },
});
