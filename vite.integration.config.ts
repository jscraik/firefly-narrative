import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [tailwindcss(), react()],
  test: {
    name: "integration",
    environment: "jsdom",
    setupFiles: "./src/setupTests.ts",
    globals: true,
    include: ["src/**/*.integration.test.ts", "src/**/*.integration.test.tsx"],
    exclude: ["node_modules/", "src-tauri/", "e2e/"],
    passWithNoTests: false
  }
});
