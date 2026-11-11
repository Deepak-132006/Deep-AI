/// <reference types="vite-plugin-electron/electron-env" />

declare namespace NodeJS {
  interface ProcessEnv {
    /**
     * The built directory structure
     *
     * ```tree
     * ├─┬─┬ dist
     * │ │ └── index.html
     * │ │
     * │ ├─┬ dist-electron
     * │ │ ├── main.js
     * │ │ └── preload.js
     * │
     * ```
     */
    APP_ROOT: string;
    /** /dist/ or /public/ */
    VITE_PUBLIC: string;
  }
}

// Used in Renderer process, expose in `preload.ts`

interface Window {
  deepAI: {
    getAppVersion: () => Promise<string>;
    minimizeWindow: () => void;

    showOrb: () => Promise<void>;
    showChat: () => Promise<void>;
    minimizeOrb: () => Promise<void>;
    closeOrb: () => Promise<void>;

    moveOrbBy: (deltaX: number, deltaY: number) => void;
    setOrbMouseInteractive: (interactive: boolean) => void;

    onBackendStatus: (callback: (status: string) => void) => () => void;
  };
}
