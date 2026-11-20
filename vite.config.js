import { defineConfig } from "vite";

export default defineConfig({
  // Relative assets so the built site works on GitHub Pages project URLs.
  base: "./",
  server: {
    port: 5173,
    strictPort: false,
  },
});
