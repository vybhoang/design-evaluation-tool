// scripts/ui-walkthrough.mjs
//
// Proof that the product works for end users — driven entirely through the
// real UI, with the real screen captured and fed straight into the real
// upload flow in a single pass. No screenshot-to-disk-then-re-upload
// hand-off: page.screenshot() returns a Buffer, and the real file input's
// setInputFiles() accepts that buffer directly, so the image being analyzed
// is the page's live DOM state at the moment of capture — not a file
// written by an earlier run.
//
// Per route, in one browser session:
//   1. navigate to the real route (e.g. "/", "/history", a seeded
//      "/analysis/:id") and screenshot it to an in-memory Buffer
//   2. navigate the same page to /new
//   3. setInputFiles(buffer) on the real upload input — same as a user
//      picking a file, just sourced from memory instead of disk
//   4. fill Design type / Target audience / Primary goal via the real
//      Combobox and Input components (real clicks, real typing)
//   5. click "Run analysis" — triggers the app's real handleAnalyze() ->
//      analyzeWithClaude() over the real /api/anthropic proxy
//   6. wait for the real navigate() to /analysis/:id once the run finishes
//   7. screenshot the real, rendered AnnotatedDesign + ResultsPanel
//
// The source screenshot and the result screenshot are both still written to
// disk under screenshots/ — that's the actual case-study deliverable. What's
// gone is the *requirement* that a screenshot exist on disk before it can be
// analyzed; capture and upload are now one atomic step per screen.
//
// Usage:
//   npm run dev          # terminal 1
//   npm run ui:walkthrough   # terminal 2
//
// First-time setup:
//   npm install
//   npx playwright install chromium
//
// Requires ANTHROPIC_API_KEY + VITE_ENABLE_LIVE_ANALYSIS=true in .env
// (already set up in this repo) since it's exercising the real live-analysis
// path.

import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(__dirname, "../screenshots");
const BASE_URL = process.env.CAPTURE_BASE_URL || "http://localhost:5173";

// Each real analysis run does a live vision call — give it room. Bump via
// env if your connection/model latency needs more.
const ANALYZE_TIMEOUT_MS = Number(process.env.ANALYZE_TIMEOUT_MS || 60000);

// --- Route manifest ------------------------------------------------------
// Mirrors src/app/routes.tsx. Ordered by priority: the core loop first,
// secondary flows after. Each entry carries the designType/audience/goal
// context Heurizztik's live analysis needs — filled into the real Combobox
// and Input fields during the walkthrough.
const ROUTES = [
  // --- Core loop (highest priority — most-traveled screens) ---
  {
    path: "/",
    slug: "landing",
    designType: "landing",
    audience: "general",
    goal: "Convey what Heurizztik does and get a first-time visitor to start a review",
  },
  {
    path: "/new",
    slug: "new-analysis",
    designType: "form",
    audience: "general",
    goal: "Let a user upload a design and configure an analysis with minimal friction",
  },
  {
    path: "/analysis/__ID__",
    slug: "analysis-results",
    designType: "dashboard",
    audience: "general",
    goal: "Help a user triage AI-generated UX findings and know what to act on first",
    needsSeed: true,
  },
  {
    path: "/history",
    slug: "runs",
    designType: "dashboard",
    audience: "general",
    goal: "Let a user find, filter, and compare past analysis runs",
  },

  // --- Secondary flows ---
  {
    path: "/analysis/__ID__/session",
    slug: "session",
    designType: "dashboard",
    audience: "general",
    goal: "Let a user moderate and capture a live usability session",
    needsSeed: true,
  },
  {
    path: "/analysis/__ID__/instruments",
    slug: "instruments",
    designType: "dashboard",
    audience: "general",
    goal: "Let a user pick and configure supplementary research instruments",
    needsSeed: true,
  },
  {
    path: "/patterns",
    slug: "patterns",
    designType: "dashboard",
    audience: "general",
    goal: "Surface recurring findings and trends across multiple runs",
  },
  {
    path: "/compare",
    slug: "compare",
    designType: "dashboard",
    audience: "general",
    goal: "Let a user diff two runs heuristic-by-heuristic",
  },
  {
    path: "/responses",
    slug: "responses",
    designType: "dashboard",
    audience: "general",
    goal: "Let a user review and code qualitative interview responses",
  },
];

// --- Seed data for dynamic /analysis/:id routes --------------------------
// Without this, those routes redirect to /history (see analysis.tsx:
// `if (!entry && history.length > 0) return <Navigate to="/history" />`).
// Shape matches HistoryEntry in components/history-store.ts exactly.
const SEED_ID = "walkthrough-seed-001";
const HISTORY_KEY = "cognition.history.v1";

function buildSeedHistoryEntry() {
  return {
    id: SEED_ID,
    createdAt: Date.now(),
    label: "Seed run for UI walkthrough",
    thumbnail: "",
    context: {
      imageUrl: null,
      designType: "landing",
      audience: "general",
      goal: "Walkthrough seed — not a real analysis",
    },
    result: {
      clarityScore: 78,
      accessibilityScore: 64,
      findings: [
        {
          id: "seed-f1",
          principle: "Low contrast on primary CTA",
          source: "WCAG 2.2 § 1.4.3",
          severity: "critical",
          confidence: "medium",
          observation: "Seed finding so the results panel has content to render.",
          recommendation: "N/A — seed data.",
          region: { x: 0.1, y: 0.1, w: 0.2, h: 0.05 },
          rule: null,
        },
        {
          id: "seed-f2",
          principle: "Dense navigation",
          source: "Miller's Law",
          severity: "warning",
          confidence: "low",
          observation: "Seed finding so the results panel has content to render.",
          recommendation: "N/A — seed data.",
          region: { x: 0.0, y: 0.0, w: 1.0, h: 0.1 },
          rule: null,
        },
      ],
      principles: [],
      lenses: [],
      heatmap: [],
      kudos: [],
    },
  };
}

async function seedLocalStorage(page) {
  await page.addInitScript(
    ([key, entry]) => {
      window.localStorage.setItem(key, JSON.stringify([entry]));
    },
    [HISTORY_KEY, buildSeedHistoryEntry()]
  );
}

async function setComboboxValue(page, index, value) {
  // Design type is combobox[0], Target audience is combobox[1] — matches
  // DOM order in design-canvas.tsx. Scoped to the context-fields card so
  // this doesn't collide with any other combobox that might exist elsewhere.
  const combobox = page.locator('[data-tour="context-fields"] [role="combobox"]').nth(index);
  await combobox.click();
  // cmdk's CommandInput — whatever's typed either matches an existing
  // option (selects it) or falls through to the "Use "<value>"" custom
  // option. Either way pressing Enter selects whatever cmdk highlighted.
  await page.keyboard.type(value, { delay: 20 });
  await page.keyboard.press("Enter");
}

async function runOne(browser, route, index, total) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  page.setDefaultTimeout(ANALYZE_TIMEOUT_MS);
  await seedLocalStorage(page);

  const url = route.path.replace("__ID__", SEED_ID);
  const label = `[${index + 1}/${total}] ${url}`;

  try {
    // --- 1. Capture the real screen straight into memory ---
    await page.goto(`${BASE_URL}${url}`, { waitUntil: "networkidle", timeout: 15000 });
    await page.waitForTimeout(400); // let fade/skeleton transitions settle
    const sourceBuffer = await page.screenshot({ fullPage: true });

    const sourceFile = `${route.slug}-00-source.png`;
    writeFileSync(path.join(OUT_DIR, sourceFile), sourceBuffer);

    // --- 2. Same session, same page: go upload it for real ---
    await page.goto(`${BASE_URL}/new`, { waitUntil: "networkidle" });

    const fileInput = page.locator('[data-tour="upload-area"] input[type="file"]');
    await fileInput.setInputFiles({
      name: `${route.slug}.png`,
      mimeType: "image/png",
      buffer: sourceBuffer, // <- straight from step 1, no disk read
    });

    await setComboboxValue(page, 0, route.designType);
    await setComboboxValue(page, 1, route.audience);
    if (route.goal) {
      await page.getByPlaceholder("What should users do or feel after using this design?").fill(route.goal);
    }

    console.log(`${label} — captured + uploaded, running real analysis…`);

    // --- 3. Real click, real network call, real navigation ---
    await page.getByRole("button", { name: "Run analysis" }).click();
    await page.waitForURL(/\/analysis\/[^/]+$/, { timeout: ANALYZE_TIMEOUT_MS });
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(500); // let the results panel finish animating in

    const resultFile = `${route.slug}-01-result.png`;
    await page.screenshot({ path: path.join(OUT_DIR, resultFile), fullPage: true });

    console.log(`${label} — done -> ${resultFile}`);
    return { route: url, sourceFile, resultFile, resultUrl: page.url(), ok: true };
  } catch (err) {
    console.error(`${label} — FAILED: ${err.message}`);
    return { route: url, error: err.message, ok: false };
  } finally {
    await context.close();
  }
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  const browser = await chromium.launch();

  const results = [];
  for (let i = 0; i < ROUTES.length; i++) {
    results.push(await runOne(browser, ROUTES[i], i, ROUTES.length));
  }
  await browser.close();

  writeFileSync(path.join(OUT_DIR, "run-log.json"), JSON.stringify(results, null, 2));
  const okCount = results.filter((r) => r.ok).length;
  console.log(`\nDone. ${okCount}/${results.length} screens captured and run through the real UI.`);
  console.log(`Source + result screenshots + run-log.json written to ${OUT_DIR}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
