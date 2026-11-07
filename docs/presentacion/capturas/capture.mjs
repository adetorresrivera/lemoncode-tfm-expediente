// Screenshot recipe of the defense images (07-03, D-17). It runs ONLY inside the throwaway
// Playwright container started by `bash scripts/browser-tools.sh capture [shot,...]`; `playwright`
// is not installed in this repository and never enters a package.json.
//
// Environment: BASE (default http://app:8080, the compose app on network expediente_default),
// OUT (default /out), SHOTS (comma-separated shot names; empty means all), OFFER (default
// /work/remote-senior.txt, the offer of the live demo).
//
// The script only reads and navigates. It never clicks «Guardar candidatura», uploads nothing and
// prints no page text: its log carries shot names, sizes and nothing else.
import { readFileSync } from "node:fs";
import { chromium } from "playwright";

const BASE = process.env.BASE ?? "http://app:8080";
const OUT = process.env.OUT ?? "/out";
const OFFER = process.env.OFFER ?? "/work/remote-senior.txt";
const wanted = (process.env.SHOTS ?? "")
  .split(",")
  .map((name) => name.trim())
  .filter((name) => name.length > 0);

const COMPANY_FOR_DETAIL = "Harbor Pine Software";
const AI_WAIT_MS = 120_000;

// Same key and values as apps/web/src/core/theme/theme.ts.
const THEME_KEY = "expediente-theme";

const firstLine = (error) => String(error instanceof Error ? error.message : error).split("\n")[0];

const SHOTS = [
  {
    name: "lista-claro-1280",
    width: 1280,
    height: 800,
    theme: "light",
    path: () => "/applications",
  },
  {
    name: "lista-oscuro-1280",
    width: 1280,
    height: 800,
    theme: "dark",
    path: () => "/applications",
  },
  {
    name: "lista-movil-360",
    width: 360,
    height: 740,
    theme: "light",
    path: () => "/applications",
  },
  {
    name: "detalle-claro-1280",
    width: 1280,
    height: 800,
    theme: "light",
    fullPage: true,
    // Ids change on every reseed, so the detail is found by company name.
    path: async () => {
      const response = await fetch(`${BASE}/api/applications`);
      if (!response.ok) throw new Error(`GET /api/applications answered ${response.status}`);
      const applications = await response.json();
      const found = applications.find((application) => application.company === COMPANY_FOR_DETAIL);
      if (!found) {
        throw new Error(`detalle no encuentro ${COMPANY_FOR_DETAIL} (¿falta el seed?)`);
      }
      return `/applications/${found.id}`;
    },
  },
  {
    name: "formulario-ia-claro-1280",
    width: 1280,
    height: 800,
    theme: "light",
    fullPage: true,
    path: () => "/applications/new",
    // Pastes the demo offer, runs the extraction and waits for the per-field «IA» marks.
    interact: async (page) => {
      const offerField = page.getByLabel("Texto de la oferta");
      if (!(await offerField.isVisible())) {
        await page.getByRole("button", { name: "Pegar oferta" }).click();
      }
      await offerField.fill(readFileSync(OFFER, "utf8"));
      await page.getByRole("button", { name: "Autocompletar con IA" }).click();
      await page
        .getByText("Rellenado por la IA")
        .first()
        .waitFor({ state: "attached", timeout: AI_WAIT_MS });
      await page.getByText(/^Hemos rellenado/).waitFor({ state: "visible", timeout: 10_000 });
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(500);
    },
  },
];

const selected = wanted.length === 0 ? SHOTS : SHOTS.filter((shot) => wanted.includes(shot.name));
const unknown = wanted.filter((name) => !SHOTS.some((shot) => shot.name === name));
if (unknown.length > 0) {
  console.log(`CAPTURE FAIL: ${unknown.join(",")} unknown shot (known: ${SHOTS.map((s) => s.name).join(",")})`);
  process.exit(1);
}

const browser = await chromium.launch();
let failed = false;

for (const shot of selected) {
  const context = await browser.newContext({
    viewport: { width: shot.width, height: shot.height },
    deviceScaleFactor: 1,
    colorScheme: shot.theme,
  });
  try {
    await context.addInitScript(
      ([key, theme]) => window.localStorage.setItem(key, theme),
      [THEME_KEY, shot.theme],
    );
    const page = await context.newPage();
    await page.goto(BASE + (await shot.path()), { waitUntil: "networkidle" });
    await page.waitForSelector("main");
    await page.evaluate(() => document.fonts.ready);
    if (shot.interact) await shot.interact(page);
    await page.screenshot({ path: `${OUT}/${shot.name}.png`, fullPage: shot.fullPage ?? false });
    console.log(`SHOT ${shot.name} ${shot.width}x${shot.height}`);
  } catch (error) {
    console.log(`CAPTURE FAIL: ${shot.name} ${firstLine(error)}`);
    failed = true;
  } finally {
    await context.close();
  }
}

await browser.close();
process.exit(failed ? 1 : 0);
