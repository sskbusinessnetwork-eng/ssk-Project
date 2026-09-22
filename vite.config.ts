import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    envPrefix: ['VITE_', 'NEXT_PUBLIC_'],
    plugins: [react(), tailwindcss()],
    build: {
      target: 'es2022',
      cssCodeSplit: true,
      sourcemap: true,
      modulePreload: {
        polyfill: false,
      },
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('vite/') || id.includes('commonjsHelpers') || id.includes('plugin-vue') || id.includes('\x00')) {
              return 'vendor-framework';
            }
            if (id.includes('node_modules')) {
              if (id.includes('react') || id.includes('react-dom') || id.includes('react-router') || id.includes('clsx') || id.includes('tailwind-merge') || id.includes('scheduler')) {
                return 'vendor-framework';
              }
              if (id.includes('@supabase')) {
                return 'vendor-supabase';
              }
              if (id.includes('lucide-react')) {
                return 'vendor-icons';
              }
              if (id.includes('motion')) {
                return 'vendor-motion';
              }
              if (id.includes('recharts')) {
                return 'vendor-charts';
              }
              if (id.includes('jspdf') || id.includes('xlsx') || id.includes('docx') || id.includes('canvg') || id.includes('fflate')) {
                return 'vendor-documents';
              }
            }
          },
        },
      },
      chunkSizeWarningLimit: 1200,
    },
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
        'firebase/app': path.resolve(__dirname, './src/lib/supabaseClient.ts'),
        'firebase/firestore': path.resolve(__dirname, './src/lib/supabaseClient.ts'),
        'firebase/auth': path.resolve(__dirname, './src/lib/supabaseClient.ts'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
