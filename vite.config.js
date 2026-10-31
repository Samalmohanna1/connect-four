import { defineConfig } from "vite";

export default defineConfig({
    build: {
        outDir: "dist",
        assetsDir: "assets",
        emptyOutDir: true,
        // Phaser alone is about 1.5 MB. Playroom loads in its own chunk, so a
        // warning here likely means it was pulled back into the main bundle.
        chunkSizeWarningLimit: 1600,
    },
});
