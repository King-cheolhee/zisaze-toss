import { defineConfig } from "@apps-in-toss/web-framework/config";

export default defineConfig({
  appName: "zisaze",
  brand: {
    displayName: "지사제",
    primaryColor: "#3182F6", // 실제 브랜드블루(icon-512 실측) — 구현계획서 v2 P2-1
    icon: "https://zisaze.com/icon-512.png",
  },
  web: {
    host: "localhost",
    port: 5173,
    commands: {
      dev: "vite dev",
      build: "vite build",
    },
  },
  permissions: [],
  outdir: "dist",
});
