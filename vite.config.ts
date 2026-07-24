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

// Dev-only "capture a design straight from a URL" endpoint, so end users
// don't have to screenshot long/many pages by hand before uploading them.
// Backed by Playwright (already a devDependency for scripts/ui-walkthrough.mjs).
//
// Deliberately dev-only: `playwright` is imported dynamically, inside the
// request handler, never at module top level — so `vite build` never touches
// it even if devDependencies are pruned in a production install. There is no
// production counterpart to this endpoint (unlike /api/anthropic, which has
// a matching api/anthropic/[...path].ts for Vercel) — it only runs locally
// via `npm run dev`. The frontend hides the "capture from a URL" UI outside
// dev (`import.meta.env.DEV`) so there's nothing broken to stumble into.
function screenshotEndpoint() {
  let browserPromise: Promise<import('playwright').Browser> | null = null

  return {
    name: 'screenshot-endpoint',
    configureServer(server: import('vite').ViteDevServer) {
      server.middlewares.use('/api/screenshot', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405
          res.setHeader('content-type', 'application/json')
          res.end(JSON.stringify({ error: 'Method not allowed' }))
          return
        }

        let body = ''
        req.on('data', (chunk) => { body += chunk })
        req.on('end', async () => {
          res.setHeader('content-type', 'application/json')
          try {
            const { url } = JSON.parse(body || '{}')
            if (!url || typeof url !== 'string') {
              res.statusCode = 400
              res.end(JSON.stringify({ error: 'Missing "url" in request body' }))
              return
            }

            let parsed: URL
            try {
              parsed = new URL(url)
            } catch {
              res.statusCode = 400
              res.end(JSON.stringify({ error: 'That doesn\'t look like a valid URL' }))
              return
            }
            if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
              res.statusCode = 400
              res.end(JSON.stringify({ error: 'Only http:// and https:// URLs are supported' }))
              return
            }

            const { chromium } = await import('playwright')
            if (!browserPromise) browserPromise = chromium.launch()
            const browser = await browserPromise

            const viewportWidth = 1440
            const viewportHeight = 900
            const context = await browser.newContext({
              viewport: { width: viewportWidth, height: viewportHeight },
              // NOTE: deliberately NOT setting reducedMotion: 'reduce' here.
              // It was tried to defeat scroll-hijacking libraries, but it
              // also disables the Web Animations API, which modern Framer
              // Motion versions use internally for opacity/transform —
              // freezing entrance animations mid-interpolation (a washed-out,
              // partially-faded capture) instead of letting them complete.
              // Not worth it: this site doesn't use a scroll-hijacking
              // library at all (confirmed against its own source), so there
              // was nothing here for reducedMotion to fix in the first place.
            })
            try {
              const page = await context.newPage()
              // 'networkidle' can hang/timeout on pages with persistent
              // connections (chat widgets, analytics beacons) that never go
              // quiet. 'load' + a short explicit settle is more reliable.
              await page.goto(parsed.toString(), { waitUntil: 'load', timeout: 20000 })
              await page.waitForTimeout(500)

              // Trigger every scroll-reveal animation (Framer Motion
              // `whileInView` with `viewport: { once: true }`, used site-wide)
              // before the real capture pass below. Without this, a section
              // that's still mid fade-in when its slice gets screenshotted
              // comes out looking like missing content, an oversized gap, or
              // "low contrast" text — none of which are real; it's just this
              // capture racing an animation that hasn't finished. Because
              // `once: true` means each animation fires exactly once and then
              // stays in its revealed state, one fast priming scroll to the
              // bottom — with enough dwell time per step for entrance
              // transitions to complete — permanently resolves every section
              // before slice-by-slice capture starts, so that loop never has
              // to race anything again.
              const primeScrollReveals = async () => {
                const pageHeight = await page.evaluate(() => document.documentElement.scrollHeight)
                const steps = Math.ceil(pageHeight / (viewportHeight * 0.85))
                for (let i = 0; i < steps; i++) {
                  await page.evaluate((step) => window.scrollBy(0, step), viewportHeight * 0.85)
                  // Framer Motion's default entrance transition is ~0.5-0.8s;
                  // 900ms leaves room even under headless Chromium's occasional slowness.
                  await page.waitForTimeout(900)
                }
                await page.evaluate(() => window.scrollTo(0, 0))
                await page.waitForTimeout(300)
              }
              await primeScrollReveals()

              const waitForLazyImages = () =>
                page.evaluate(async () => {
                  const imgs = Array.from(document.images).filter((img) => !img.complete)
                  await Promise.all(
                    imgs.map(
                      (img) =>
                        new Promise((resolve) => {
                          img.addEventListener('load', resolve, { once: true })
                          img.addEventListener('error', resolve, { once: true })
                        })
                    )
                  )
                })

              const getScrollY = () =>
                page.evaluate(() => window.scrollY || document.scrollingElement?.scrollTop || 0)

              // Screenshot at each real, settled scroll position — exactly
              // what a person manually scrolling and screenshotting would see
              // (this also sidesteps a subtler bug an earlier version had:
              // resetting scroll to the top *before* capturing, which risked
              // racing whileInView observers that hadn't attached yet) — then
              // stitch the slices together, cropping off whatever portion of
              // each new slice overlaps the previous one, using the real
              // measured scroll delta rather than assuming an exact
              // one-viewport step.
              const { PNG } = await import('pngjs')
              const slices: { png: InstanceType<typeof PNG>; y: number }[] = []
              const MAX_SLICES = 30
              let prevY: number | null = null

              for (let guard = 0; guard < MAX_SLICES; guard++) {
                await waitForLazyImages()
                const y = await getScrollY()
                if (prevY !== null && y === prevY) break // stopped advancing — at the bottom

                const buf = await page.screenshot()
                slices.push({ png: PNG.sync.read(buf), y })
                prevY = y

                await page.evaluate((step) => window.scrollBy(0, step), viewportHeight * 0.85)
                await page.waitForTimeout(400) // let any transition/reflow settle
              }

              const width = slices[0]?.png.width ?? viewportWidth
              const totalHeight = slices.length ? slices[slices.length - 1].y + viewportHeight : viewportHeight
              const stitched = new PNG({ width, height: totalHeight })

              for (let i = 0; i < slices.length; i++) {
                const { png, y } = slices[i]
                const prevBottom = i === 0 ? 0 : slices[i - 1].y + viewportHeight
                const skipRows = Math.max(0, prevBottom - y) // overlap with the previous slice
                const rowsToCopy = viewportHeight - skipRows
                if (rowsToCopy > 0) {
                  PNG.bitblt(png, stitched, 0, skipRows, width, rowsToCopy, 0, y + skipRows)
                }
              }

              const buffer = PNG.sync.write(stitched)
              res.statusCode = 200
              res.end(JSON.stringify({ dataUrl: `data:image/png;base64,${buffer.toString('base64')}` }))
            } finally {
              await context.close()
            }
          } catch (err) {
            res.statusCode = 502
            const message = err instanceof Error ? err.message : 'Screenshot failed'
            res.end(JSON.stringify({ error: `Couldn't capture that page — ${message}` }))
          }
        })
      })

      // Don't leave a headless Chromium process running after `npm run dev` exits.
      server.httpServer?.once('close', () => {
        browserPromise?.then((b) => b.close()).catch(() => {})
      })
    },
  }
}

export default defineConfig(({ mode, command }) => {
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
      // Dev-server-only middleware — configureServer() is never invoked
      // during `vite build`, so this is a no-op outside `vite dev`. Still
      // gated on command === 'serve' as a second, explicit guard.
      ...(command === 'serve' ? [screenshotEndpoint()] : []),
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
