import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    // 개발 환경 CORS 우회: rich1 CORS는 tossmini 오리진만 허용하므로(P1-1),
    // localhost 개발은 vite 프록시로 same-origin화한다. 프로덕션(.ait)은 절대 URL 직호출.
    proxy: {
      "/api": {
        target: "https://www.zisaze.com",
        changeOrigin: true,
      },
    },
  },
});
