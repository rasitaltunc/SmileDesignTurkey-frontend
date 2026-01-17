
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
        'vaul@1.1.2': 'vaul',
        // Sonner stub: prevent Sonner from entering bundle (Safari TDZ crash fix)
        'sonner': path.resolve(__dirname, './src/lib/sonnerStub.tsx'),
        'sonner@2.0.3': path.resolve(__dirname, './src/lib/sonnerStub.tsx'),
        'recharts@2.15.2': 'recharts',
        'react-resizable-panels@2.1.7': 'react-resizable-panels',
        'react-hook-form@7.55.0': 'react-hook-form',
        'react-day-picker@8.10.1': 'react-day-picker',
        'next-themes@0.4.6': 'next-themes',
        'lucide-react@0.487.0': 'lucide-react',
        'input-otp@1.4.2': 'input-otp',
        'embla-carousel-react@8.6.0': 'embla-carousel-react',
        'cmdk@1.1.1': 'cmdk',
        'class-variance-authority@0.7.1': 'class-variance-authority',
        '@radix-ui/react-tooltip@1.1.8': '@radix-ui/react-tooltip',
        '@radix-ui/react-toggle@1.1.2': '@radix-ui/react-toggle',
        '@radix-ui/react-toggle-group@1.1.2': '@radix-ui/react-toggle-group',
        '@radix-ui/react-tabs@1.1.3': '@radix-ui/react-tabs',
        '@radix-ui/react-switch@1.1.3': '@radix-ui/react-switch',
        '@radix-ui/react-slot@1.1.2': '@radix-ui/react-slot',
        '@radix-ui/react-slider@1.2.3': '@radix-ui/react-slider',
        '@radix-ui/react-separator@1.1.2': '@radix-ui/react-separator',
        '@radix-ui/react-select@2.1.6': '@radix-ui/react-select',
        '@radix-ui/react-scroll-area@1.2.3': '@radix-ui/react-scroll-area',
        '@radix-ui/react-radio-group@1.2.3': '@radix-ui/react-radio-group',
        '@radix-ui/react-progress@1.1.2': '@radix-ui/react-progress',
        '@radix-ui/react-popover@1.1.6': '@radix-ui/react-popover',
        '@radix-ui/react-navigation-menu@1.2.5': '@radix-ui/react-navigation-menu',
        '@radix-ui/react-menubar@1.1.6': '@radix-ui/react-menubar',
        '@radix-ui/react-label@2.1.2': '@radix-ui/react-label',
        '@radix-ui/react-hover-card@1.1.6': '@radix-ui/react-hover-card',
        '@radix-ui/react-dropdown-menu@2.1.6': '@radix-ui/react-dropdown-menu',
        '@radix-ui/react-dialog@1.1.6': '@radix-ui/react-dialog',
        '@radix-ui/react-context-menu@2.2.6': '@radix-ui/react-context-menu',
        '@radix-ui/react-collapsible@1.1.3': '@radix-ui/react-collapsible',
        '@radix-ui/react-checkbox@1.1.4': '@radix-ui/react-checkbox',
        '@radix-ui/react-avatar@1.1.3': '@radix-ui/react-avatar',
        '@radix-ui/react-aspect-ratio@1.1.2': '@radix-ui/react-aspect-ratio',
        '@radix-ui/react-alert-dialog@1.1.6': '@radix-ui/react-alert-dialog',
        '@radix-ui/react-accordion@1.2.3': '@radix-ui/react-accordion',
        '@': path.resolve(__dirname, './src'),
      },
    },
    build: {
      target: 'esnext',
      outDir: 'dist',
      sourcemap: true, // ✅ Enable sourcemaps for better error debugging
      rollupOptions: {
        output: {
          manualChunks: (id) => {
            if (!id) return;

            // 1) Admin-only: sadece admin ekranları + admin alt yapıları
            // Bu sayfalar admin chunk'a girmemeli: Home, Onboarding, Navbar, Pricing, Contact, Process, vb.
            const isAdmin =
              id.includes('/src/pages/AdminLeads') ||
              id.includes('/src/pages/AdminPatientProfile') ||
              id.includes('/src/pages/admin/') ||
              id.includes('/src/components/admin-leads/') ||
              id.includes('/src/hooks/admin-leads/') ||
              id.includes('/src/lib/admin-leads/');

            if (isAdmin) return 'admin';

            // 1.5) Doctor-only: doctor ekranları + doctor alt yapıları
            // Public sayfalar doctor chunk'a girmemeli
            const isDoctor =
              id.includes('/src/pages/Doctor') ||
              id.includes('/src/pages/doctor/') ||
              id.includes('/src/components/doctor/') ||
              id.includes('/src/hooks/doctor/') ||
              id.includes('/src/lib/doctor/');

            if (isDoctor) return 'doctor';

            // 2) Vendor chunks - daha stabil cache
            if (id.includes('node_modules')) {
              // React + React DOM + Router
              if (id.includes('node_modules/react') || id.includes('node_modules/react-dom') || id.includes('node_modules/react-router')) {
                return 'react-vendor';
              }
              // Supabase
              if (id.includes('node_modules/@supabase')) {
                return 'supabase-vendor';
              }
              // UI components (Radix + Lucide + CMDK)
              if (id.includes('node_modules/@radix-ui') || id.includes('node_modules/lucide-react') || id.includes('node_modules/cmdk')) {
                return 'ui-vendor';
              }
              // Charts (recharts + dependencies)
              if (id.includes('node_modules/recharts') || id.includes('node_modules/d3-')) {
                return 'charts-vendor';
              }
              // PDF libraries (pdf-lib + dependencies)
              if (id.includes('node_modules/pdf-lib') || id.includes('node_modules/pdfjs-dist')) {
                return 'pdf-vendor';
              }
              // Forms (react-hook-form + react-day-picker)
              if (id.includes('node_modules/react-hook-form') || id.includes('node_modules/react-day-picker') || id.includes('node_modules/@hookform')) {
                return 'forms-vendor';
              }
              // Analytics (posthog + dependencies)
              if (id.includes('node_modules/posthog-js') || id.includes('node_modules/posthog')) {
                return 'analytics-vendor';
              }
              // State management (zustand)
              if (id.includes('node_modules/zustand') || id.includes('node_modules/immer')) {
                return 'state-vendor';
              }
              // Other node_modules go to vendor
              return 'vendor';
            }

            // 3) Shared/common components için ayrı chunk (opsiyonel)
            // Şu an shared chunk yok, public sayfalar route-level lazy yükleniyor
          },
        },
      },
    },
    server: {
      port: 3000,
      open: true,
    },
  }));