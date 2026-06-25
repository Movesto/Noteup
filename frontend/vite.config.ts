import { vitePlugin as remix } from "@remix-run/dev";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [
    remix({
      future: {
        v3_fetcherPersist: true,
        v3_relativeSplatPath: true,
        v3_throwAbortReason: true,
      },
    }),
    tsconfigPaths(),
  ],
  server: {
    host: "0.0.0.0",
    port: 5173,
  },
  optimizeDeps: {
    include: [
      "react-force-graph-2d",
      "@tiptap/extension-task-list",
      "@tiptap/extension-task-item",
      "@tiptap/extension-font-family",
      "@tiptap/extension-underline",
      "@tiptap/extension-image",
      "@tiptap/extension-table",
      "@tiptap/extension-table-row",
      "@tiptap/extension-table-header",
      "@tiptap/extension-table-cell",
    ],
  },
  ssr: {
    external: ["react-force-graph-2d", "force-graph"],
  },
});
