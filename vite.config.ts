
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    // Bundle analyzer (only in analyze mode)
    // ✅ filename: 'dist/stats.html' - parser'ın beklediği yol (guaranteed)
    mode === 'analyze' && visualizer({
      filename: 'dist/stats.html',
      template: 'treemap',
      gzipSize: true,
      brotliSize: true,
      open: false, // Don't auto-open browser (use when needed)
    }),
  ].filter(Boolean),
  define: {
    __BUILD_SHA__: JSON.stringify(process.env.VERCEL_GIT_COMMIT_SHA || process.env.GITHUB_SHA || ""),
    __VERCEL_ENV__: JSON.stringify(process.env.VERCEL_ENV || ""),
    __VERCEL_URL__: JSON.stringify(process.env.VERCEL_URL || ""),
  },
  resolve: {
    extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    target: 'esnext',
    outDir: 'dist',
    sourcemap: true, // ✅ Enable sourcemaps for better error debugging
    // rollupOptions removed to fix white screen (circular dependency/chunking issue)
  },
  server: {
    port: 3000,
    open: true,
  },
}));