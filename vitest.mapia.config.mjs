import { cloudflareTest } from "@cloudflare/vitest-plugin";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [
    cloudflareTest({
      wrangler: {
        configPath: "./workers/mapia-quota/wrangler.test.jsonc"
      }
    })
  ],
  test: {
    include: ["workers/mapia-quota/test/**/*.test.mjs"]
  }
});
