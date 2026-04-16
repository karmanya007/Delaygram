import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default {
  test: {
    environment: "node",
    globals: true,
    include: ["tests/**/*.test.ts"],
    clearMocks: true,
    pool: "threads",
    maxWorkers: 1,
    fileParallelism: false,
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/lib/**/*.ts", "src/actions/**/*.ts", "src/server/**/*.ts"],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
};
