import { defineConfig, loadEnv } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'


function figmaAssetResolver() {
  return {
    name: 'figma-asset-resolver',
    resolveId(id: string) {
      if (id.startsWith('figma:asset/')) {
        const filename = id.replace('figma:asset/', '')
        return path.resolve(__dirname, 'src/assets', filename)
      }
    },
  }
}

export default defineConfig(({ mode }) => {
  // Loaded with no prefix filter so it also picks up server-only secrets
  // (e.g. ANTHROPIC_API_KEY) that intentionally lack the VITE_ prefix —
  // those must never reach import.meta.env / the client bundle.
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [
      figmaAssetResolver(),
      // The React and Tailwind plugins are both required for Make, even if
      // Tailwind is not being actively used – do not remove them
      react(),
      tailwindcss(),
    ],
    // Explicitly inline VITE_* vars so they survive the Vercel build pipeline
    // regardless of whether they come from .env files or process.env.
    define: {
      'import.meta.env.VITE_ENABLE_LIVE_ANALYSIS': JSON.stringify(
        env.VITE_ENABLE_LIVE_ANALYSIS ?? ''
      ),
    },

    resolve: {
      alias: {
        // Alias @ to the src directory
        '@': path.resolve(__dirname, './src'),
      },
    },

    // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
    assetsInclude: ['**/*.svg', '**/*.csv'],

    server: {
      proxy: {
        // Dev-only equivalent of api/anthropic/[...path].ts — keeps the API
        // key server-side (in this Node process) instead of the browser.
        '/api/anthropic': {
          target: 'https://api.anthropic.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/anthropic/, ''),
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              // Strip Origin so Anthropic doesn't treat this as a CORS browser request,
              // and set the header it requires for any request that does carry Origin.
              proxyReq.removeHeader('origin');
              proxyReq.setHeader('anthropic-dangerous-direct-browser-access', 'true');
              proxyReq.setHeader('anthropic-version', '2023-06-01');
              if (env.ANTHROPIC_API_KEY) {
                proxyReq.setHeader('x-api-key', env.ANTHROPIC_API_KEY);
              }
            });
          },
        },
      },
    },
  }
})
