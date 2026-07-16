import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";
import { mockApi } from "./scripts/mock-api";

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    tailwindcss(),
    // `npm run dev:demo` — in-memory API so the UI runs with zero setup (data is NOT saved)
    ...(mode === "demo" ? [mockApi()] : []),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icons/favicon.svg", "icons/apple-touch-icon.png"],
      manifest: {
        name: "Litter Watch",
        short_name: "Litter Watch",
        description: "Kitten litter growth tracker",
        start_url: "/",
        display: "standalone",
        background_color: "#f7f4ee",
        theme_color: "#f7f4ee",
        icons: [
          { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        importScripts: ["push-sw.js"],
        globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            // Photos/videos are immutable once uploaded — cache aggressively.
            urlPattern: /\/api\/media\//,
            handler: "CacheFirst",
            options: {
              cacheName: "lw-media",
              expiration: { maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 90 },
              cacheableResponse: { statuses: [200] },
              rangeRequests: true,
            },
          },
          {
            // Data reads fall back to the last good response when offline.
            urlPattern: /\/api\/(kittens|weigh-ins|settings)/,
            handler: "NetworkFirst",
            options: {
              cacheName: "lw-api",
              networkTimeoutSeconds: 4,
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 * 7 },
              cacheableResponse: { statuses: [200] },
            },
          },
        ],
      },
    }),
  ],
}));
