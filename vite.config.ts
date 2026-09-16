import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  // Where the Cloudflare Worker (wrangler dev) is listening. Override with
  // VITE_DEV_API_TARGET when the API runs elsewhere.
  const apiTarget = env.VITE_DEV_API_TARGET || "http://127.0.0.1:8787";

  return {
    server: {
      host: "0.0.0.0",
      port: 8080,
      strictPort: false,
      hmr: {
        clientPort: 443,
      },
      // Allow all hosts for preview environments (Arena, tunnels, LAN)
      // @ts-ignore
      allowedHosts: true as any,
      proxy: {
        // The frontend always calls relative `/api/...` paths: the dev server
        // proxies them to the local Worker so previews work from any domain.
        "/api": {
          target: apiTarget,
          changeOrigin: true,
          secure: false,
          ws: true,
        },
        // Media served straight out of R2 through the Worker.
        "/uploads/file": {
          target: apiTarget,
          changeOrigin: true,
          secure: false,
        },
      },
    },
    preview: {
      host: "0.0.0.0",
      port: 8080,
      // @ts-ignore
      allowedHosts: true as any,
      proxy: {
        "/api": { target: apiTarget, changeOrigin: true, secure: false, ws: true },
        "/uploads/file": { target: apiTarget, changeOrigin: true, secure: false },
      },
    },
    plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    build: {
      outDir: "dist",
      sourcemap: mode !== "production",
    },
    define: {
      __APP_ENV__: JSON.stringify(env.VITE_ENV ?? mode),
    },
  };
});
