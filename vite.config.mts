import { defineConfig } from "vite";
import { nodePolyfills } from "vite-plugin-node-polyfills";
import pkg from "./package.json";

export default defineConfig({
  root: "public",
  build: {
    outDir: "../dist/public",
    emptyOutDir: false,
    rollupOptions: {
      output: {
        entryFileNames: "js/bundle.[hash].min.js",
        chunkFileNames: "js/[name].[hash].js",
        assetFileNames: (assetInfo) => {
          const name = assetInfo.name ?? "";
          if (/\.(png|jpg|jpeg|gif|svg|ico|webp)$/.test(name)) return "img/[name][extname]";
          if (/\.css$/.test(name)) return "css/[name][extname]";
          return "assets/[name][extname]";
        },
      },
    },
  },
  plugins: [
    nodePolyfills({
      include: ["buffer", "events", "stream", "util", "process", "timers", "os", "url"],
      globals: {
        Buffer: true,
        process: true,
      },
    }),
    {
      name: "inject-app-version",
      transformIndexHtml(html: string) {
        return html.replace(/__APP_VERSION__/g, pkg.version);
      },
    },
  ],
});
