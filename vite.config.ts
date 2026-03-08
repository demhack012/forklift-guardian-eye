import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
    proxy: {
      '/data/events.csv': {
        target: 'http://localhost:8080',
        bypass: (_req, res) => {
          const fs = require('fs');
          const csvPath = '/home/manex/forklift/events.csv';
          try {
            const content = fs.readFileSync(csvPath, 'utf-8');
            res.setHeader('Content-Type', 'text/csv');
            res.end(content);
          } catch {
            res.statusCode = 404;
            res.end('File not found');
          }
        },
      },
    },
    fs: {
      allow: ['.', '/home/manex/forklift'],
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
