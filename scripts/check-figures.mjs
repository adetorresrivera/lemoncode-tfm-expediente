/* global console, process */
// Usage: node scripts/check-figures.mjs [--tests] [--doc <path>] [--prose <file>]...
//
// Recomputes every figure of docs/ia-en-el-proyecto.md (the fenced `text` block under «## Cifras»)
// from git and from .planning/ read at the cut-off c11ab61, the end of Phase 6 (D-13). Nothing is
// read from the working tree except the doc itself, so the numbers stay frozen while Phase 7 adds
// commits and planning files. Node built-ins only.
// Exit codes: 0 all figures match, 1 any FIGURE FAIL, 2 unknown or malformed option.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

const CUT = "c11ab61";
const DEFAULT_DOC = "docs/ia-en-el-proyecto.md";

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const opts = { tests: false, doc: DEFAULT_DOC, prose: [] };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--tests") opts.tests = true;
    else if (arg === "--doc" && argv[i + 1]) opts.doc = argv[++i];
    else if (arg === "--prose" && argv[i + 1]) opts.prose.push(argv[++i]);
    else {
      console.error(`Unknown or malformed option: ${arg}`);
      console.error(
        "Usage: node scripts/check-figures.mjs [--tests] [--doc <path>] [--prose <file>]...",
      );
      process.exit(2);
    }
  }
  return opts;
}

// ---------------------------------------------------------------------------
// Git helpers (every read is anchored on a commit; the working tree is never read)
// ---------------------------------------------------------------------------

const git = (...args) =>
  execFileSync("git", args, {
    encoding: "utf8",
    maxBuffer: 1 << 28,
    stdio: ["ignore", "pipe", "pipe"],
  });

const gitLines = (...args) =>
  git(...args)
    .split("\n")
    .filter((l) => l !== "");

const utcDate = (epochSeconds) =>
  new Date(Number(epochSeconds) * 1000).toISOString().slice(0, 10);

// ---------------------------------------------------------------------------
// Doc parsing
// ---------------------------------------------------------------------------

/** Lines, fenced blocks and `##` headings of a Markdown text. */
function scan(text) {
  const lines = text.split("\n");
  const inFence = new Array(lines.length).fill(false);
  const fences = [];
  let current = null;
  lines.forEach((line, i) => {
    if (!current) {
      const m = /^```(.*)$/.exec(line);
      if (m) {
        current = { info: m[1].trim(), open: i, body: [] };
        inFence[i] = true;
      }
      return;
    }
    inFence[i] = true;
    if (/^```\s*$/.test(line)) {
      fences.push({ ...current, close: i });
      current = null;
    } else {
      current.body.push(line);
    }
  });
  if (current) fences.push({ ...current, close: lines.length - 1 });
  const headings = [];
  lines.forEach((line, i) => {
    if (inFence[i]) return;
    const m = /^(#{1,6})\s+(.*)$/.exec(line);
    if (m) headings.push({ level: m[1].length, text: m[2].trim(), line: i });
  });
  return { lines, inFence, fences, headings };
}

/** Line range (0-based, end exclusive) of the `##` section with the given title. */
function sectionRange(doc, title) {
  const h = doc.headings.find((x) => x.level === 2 && x.text === title);
  if (!h) return null;
  const next = doc.headings.find((x) => x.line > h.line && x.level <= 2);
  return { from: h.line + 1, to: next ? next.line : doc.lines.length };
}

/** The `clave: valor` lines of the first fenced `text` block of a section, in order. */
function readKeyBlock(doc, title) {
  const range = sectionRange(doc, title);
  if (!range) return null;
  const block = doc.fences.find(
    (f) => f.info === "text" && f.open >= range.from && f.close < range.to,
  );
  if (!block) return null;
  const entries = [];
  block.body.forEach((line, i) => {
    const m = /^([a-z0-9_]+): (.+)$/.exec(line);
    if (m)
      entries.push({ key: m[1], value: m[2].trim(), line: block.open + 2 + i });
  });
  return entries;
}

// ---------------------------------------------------------------------------
// Recomputation of the «Cifras» block
// ---------------------------------------------------------------------------

const COMMIT_TYPES = ["docs", "feat", "chore", "test", "fix", "refactor"];
const DURATION = /^duration:\s*~?(\d+(?:\.\d+)?)\s*min/m;
const WORKTREE_MERGE = "chore: merge executor worktree";

function frontmatterAt(ref, file) {
  return git("show", `${ref}:${file}`).split("\n---")[0];
}

/** Every figure the script knows how to recompute, as strings (the doc holds text). */
function computeFigures(docCorte, docPr6) {
  const real = {};
  const revParse = (ref) => {
    try {
      return git("rev-parse", "--verify", `${ref}^{commit}`).trim();
    } catch {
      return null;
    }
  };
  const sha = revParse(CUT);
  real.corte = revParse(docCorte) === sha ? docCorte : CUT;

  // PR #6 merge: the doc names the merge commit; its second parent must be the cut-off.
  const pr6Sha = revParse(docPr6);
  const pr6Ok = pr6Sha !== null && revParse(`${pr6Sha}^2`) === sha;
  real.commit_merge_pr_6 = pr6Ok ? docPr6 : "su segundo padre no es el corte";

  // The tip of phase N is the second parent of each `Merge pull request #N` on the first-parent
  // history of the PR #6 merge; the base of phase 1 is the first parent of the PR #1 merge.
  const firstParent = pr6Ok
    ? gitLines(
        "log",
        "--first-parent",
        "--merges",
        "--reverse",
        "--format=%H %P %s",
        pr6Sha,
      )
    : [];
  const prMerges = firstParent
    .map((l) => l.split(" "))
    .filter((p) => /^Merge pull request #\d+ /.test(p.slice(3).join(" ")));
  real.prs = String(prMerges.length);
  const tips = prMerges.map((p) => p[2]);
  const base = prMerges.length > 0 ? prMerges[0][1] : sha;

  // Dates (UTC)
  const rootSha = gitLines("rev-list", "--max-parents=0", CUT)[0];
  real.primer_commit = utcDate(
    git("log", "-1", "--format=%at", rootSha).trim(),
  );
  const mergeDate = pr6Ok
    ? utcDate(git("log", "-1", "--format=%ct", pr6Sha).trim())
    : "";
  real.fecha_merge_pr_6 = mergeDate;
  const dayMs = 24 * 3600 * 1000;
  real.dias_naturales = String(
    mergeDate
      ? Math.round(
          (Date.parse(mergeDate) - Date.parse(real.primer_commit)) / dayMs,
        ) + 1
      : 0,
  );
  real.dias_con_commits = String(
    new Set(gitLines("log", "--format=%at", CUT).map(utcDate)).size,
  );

  // Commit counts
  real.commits_total = git("rev-list", "--count", CUT).trim();
  real.commits_merge = git("rev-list", "--merges", "--count", CUT).trim();
  real.commits_sin_merge = git(
    "rev-list",
    "--no-merges",
    "--count",
    CUT,
  ).trim();
  real.commits_merge_worktree = String(
    gitLines("log", "--merges", "--format=%s", CUT).filter((s) =>
      s.startsWith(WORKTREE_MERGE),
    ).length,
  );
  const byType = Object.fromEntries(COMMIT_TYPES.map((t) => [t, 0]));
  let otros = 0;
  for (const subject of gitLines("log", "--format=%s", CUT)) {
    const m = /^([a-z]+)(\([^)]*\))?!?:/.exec(subject);
    if (m && m[1] in byType) byType[m[1]]++;
    else otros++;
  }
  for (const t of COMMIT_TYPES) real[`commits_${t}`] = String(byType[t]);
  real.commits_otros = String(otros);

  const bodies = git("log", "--format=%B%x01", CUT).split("\x01");
  real.commits_coautoria = String(
    bodies.filter((b) => /^co-authored-by:/im.test(b)).length,
  );

  let prev = base;
  tips.forEach((tip, i) => {
    real[`commits_fase_${i + 1}`] = git(
      "rev-list",
      "--count",
      `${prev}..${tip}`,
    ).trim();
    prev = tip;
  });
  real.commits_raiz = git("rev-list", "--max-parents=0", "--count", CUT).trim();

  // .planning/ at the cut-off
  const phaseDirs = gitLines(
    "ls-tree",
    "-d",
    "--name-only",
    CUT,
    ".planning/phases/",
  );
  real.fases_cerradas = String(phaseDirs.length);
  const tree = gitLines(
    "ls-tree",
    "-r",
    "--name-only",
    CUT,
    ".planning/phases",
  );
  const plans = tree.filter((f) => /\/\d\d-\d\d-PLAN\.md$/.test(f));
  const summaries = tree.filter((f) => /\/\d\d-\d\d-SUMMARY\.md$/.test(f));
  const phaseOf = (file) => Number(/\/(\d\d)-\d\d-[A-Z]+\.md$/.exec(file)[1]);
  real.planes = String(plans.length);
  for (let n = 1; n <= 6; n++) {
    real[`planes_fase_${n}`] = String(
      plans.filter((f) => phaseOf(f) === n).length,
    );
  }
  real.planes_cierre_huecos = String(
    plans.filter((f) => /^gap_closure:\s*true\b/m.test(frontmatterAt(CUT, f)))
      .length,
  );
  real.tareas_rapidas = String(
    gitLines("ls-tree", "-d", "--name-only", CUT, ".planning/quick/").length,
  );
  real.summaries = String(summaries.length);
  let withDuration = 0;
  let total = 0;
  const perPhase = {};
  for (const f of summaries) {
    const m = DURATION.exec(frontmatterAt(CUT, f));
    if (!m) continue;
    withDuration++;
    total += Number(m[1]);
    perPhase[phaseOf(f)] = (perPhase[phaseOf(f)] ?? 0) + Number(m[1]);
  }
  real.summaries_con_duracion = String(withDuration);
  real.duracion_total_min = String(total);
  for (let n = 1; n <= 6; n++)
    real[`duracion_fase_${n}_min`] = String(perPhase[n] ?? 0);
  return real;
}

/** Sums the `Tests  N passed` lines of `npm run test` (one per workspace). */
function countTests() {
  let out;
  try {
    out = execFileSync("npm", ["run", "test"], {
      encoding: "utf8",
      maxBuffer: 1 << 28,
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (error) {
    out = `${error.stdout ?? ""}${error.stderr ?? ""}`;
  }
  // eslint-disable-next-line no-control-regex
  const clean = out.replace(/\u001b\[[0-9;]*m/g, "");
  let sum = 0;
  for (const m of clean.matchAll(
    /^\s*Tests\s+(?:\d+ failed \| )?(\d+) passed/gm,
  )) {
    sum += Number(m[1]);
  }
  return String(sum);
}

// ---------------------------------------------------------------------------
// Cost section: measured tokens times public prices (D-15)
// ---------------------------------------------------------------------------

const COST_SECTION = "Coste: local frente a la nube";
const COST_KEYS = [
  "tokens_entrada_media",
  "tokens_entrada_media_sin_esquema",
  "tokens_salida_media",
];
// Columns of the token table (index 0 is the offer name) and the key of the cost block each feeds.
const TOKEN_COLUMNS = [
  { name: "Caracteres", index: 1 },
  { name: "Entrada Ollama", index: 2 },
  { name: "Salida Ollama", index: 3 },
  { name: "Entrada o200k con esquema", index: 4, key: COST_KEYS[0] },
  { name: "Entrada o200k sin esquema", index: 5, key: COST_KEYS[1] },
  { name: "Salida o200k", index: 6, key: COST_KEYS[2] },
];
const COST_COLUMNS = [
  { name: "por oferta", index: 3, factor: 1 },
  { name: "100 ofertas", index: 4, factor: 100 },
  { name: "10 000 ofertas", index: 5, factor: 10000 },
];

/** Spanish number: decimal comma, spaces for thousands. */
const parseNumber = (text) => Number(squash(text).replace(",", "."));
const decimalsOf = (cell) => {
  const m = /,(\d+)$/.exec(cell.trim());
  return m ? m[1].length : 0;
};
const formatLike = (value, decimals) =>
  value.toFixed(decimals).replace(".", ",");

/** Table rows (cells and 1-based line) of a section, separators skipped. */
function tableRows(doc, range) {
  const rows = [];
  for (let i = range.from; i < range.to; i++) {
    if (doc.inFence[i] || !doc.lines[i].startsWith("|")) continue;
    const cells = doc.lines[i]
      .trim()
      .replace(/^\|/, "")
      .replace(/\|$/, "")
      .split("|")
      .map((c) => c.trim());
    if (cells.every((c) => /^:?-+:?$/.test(c))) continue;
    rows.push({ cells, line: i + 1 });
  }
  return rows;
}

/** Recomputes every average and every cost cell of the cost section. Returns how many it checked. */
function checkCost(doc, fail) {
  const range = sectionRange(doc, COST_SECTION);
  if (!range) return { checked: 0, keys: [] };
  const entries = readKeyBlock(doc, COST_SECTION) ?? [];
  const block = new Map(entries.map(({ key, value }) => [key, value]));
  let checked = 0;
  for (const { key } of entries) {
    if (!COST_KEYS.includes(key)) fail(`${key} no se puede comprobar`);
  }
  for (const key of COST_KEYS) {
    if (!block.has(key))
      fail(`${key} falta en el bloque de la sección de coste`);
  }

  let mode = null;
  const tokenRows = [];
  const costRows = [];
  for (const row of tableRows(doc, range)) {
    if (row.cells[0] === "Oferta") mode = "tokens";
    else if (row.cells[0] === "Modelo") mode = "coste";
    else if (mode === "tokens") tokenRows.push(row);
    else if (mode === "coste") costRows.push(row);
  }

  // Token table: each «Media» cell is the rounded mean of its column; the block repeats three of them.
  const mean = tokenRows.find((r) => r.cells[0] === "Media");
  const offers = tokenRows.filter((r) => r.cells[0] !== "Media");
  if (!mean || offers.length === 0) {
    fail("coste tabla de tokens sin filas de oferta y fila Media");
  } else {
    for (const col of TOKEN_COLUMNS) {
      const values = offers.map((r) => parseNumber(r.cells[col.index] ?? ""));
      const real = String(
        Math.round(values.reduce((a, b) => a + b, 0) / values.length),
      );
      const shown = squash(mean.cells[col.index] ?? "");
      checked++;
      if (shown !== real) fail(`media ${col.name} doc=${shown} real=${real}`);
      if (col.key && block.has(col.key)) {
        checked++;
        if (block.get(col.key) !== real) {
          fail(`${col.key} doc=${block.get(col.key)} real=${real}`);
        }
      }
    }
  }

  // Cost table: per offer = (tokens in × price in + tokens out × price out) / 1 000 000.
  const tokensIn = parseNumber(block.get(COST_KEYS[0]) ?? "");
  const tokensOut = parseNumber(block.get(COST_KEYS[2]) ?? "");
  if (costRows.length === 0) fail("coste tabla de precios sin filas de modelo");
  for (const row of costRows) {
    const [model] = row.cells;
    const priceIn = parseNumber(row.cells[1] ?? "");
    const priceOut = parseNumber(row.cells[2] ?? "");
    const perOffer = (tokensIn * priceIn + tokensOut * priceOut) / 1_000_000;
    for (const col of COST_COLUMNS) {
      const cell = row.cells[col.index] ?? "";
      const decimals = decimalsOf(cell);
      const real = perOffer * col.factor;
      checked++;
      const tolerance = 0.5 * 10 ** -decimals + 1e-9;
      if (!(Math.abs(parseNumber(cell) - real) <= tolerance)) {
        fail(
          `coste ${model} ${col.name} doc=${cell} real=${formatLike(real, decimals)}`,
        );
      }
    }
  }
  return { checked, keys: entries.map(({ key }) => key) };
}

// ---------------------------------------------------------------------------
// Prose rules (the prose may only repeat values of the «Cifras» block)
// ---------------------------------------------------------------------------

const L = String.raw`\p{L}\p{N}`;
// Spaces that may group thousands: space, no-break space, narrow no-break space.
const SP = String.fromCharCode(0x20, 0xa0, 0x202f);
const squash = (text) => text.replace(new RegExp(`[${SP}]`, "g"), "");
// A number glued to a letter, digit or hyphen (03-09, o200k) is part of an ID, not a count.
const COUNT_NUMBER = String.raw`(?<![${L}-])(\d{1,3}(?:[${SP}]\d{3})+|\d+)(?![.,]?\d)`;
const P1_COUNTED = new RegExp(
  String.raw`${COUNT_NUMBER}[${SP}]+(?:(?:archivos|ficheros)[${SP}]+)?(commits?|planes|plan|SUMMARY|PRs?|días|tests|tareas|fases|minutos|min)(?![${L}])`,
  "giu",
);
const P2_SCORE = new RegExp(
  String.raw`(?<![${L}-])\d+\s?/\s?24(?![${L}])`,
  "gu",
);
const P2_TIMING = new RegExp(
  String.raw`(?<![${L}-])\d+(?:[.,]\d+)?(?:\s?[–-]\s?\d+(?:[.,]\d+)?)?\s?(?:s|seg|segundos?|h|horas?)(?![${L}])`,
  "giu",
);
const P2_PERCENT = new RegExp(String.raw`(?<![${L}])\d+(?:[.,]\d+)?\s?%`, "gu");
const ANGLE = /<[^<>\n]+>/g;

/** Per-line views of a Markdown file: without fenced blocks, comments, inline code and link targets. */
function proseViews(text) {
  const doc = scan(text);
  const masked = doc.lines
    .map((line, i) => (doc.inFence[i] ? "" : line))
    .join("\n")
    .replace(/<!--[\s\S]*?-->/g, (m) => m.replace(/[^\n]/g, ""));
  const clean = (line) =>
    line.replace(/\]\([^)]*\)/g, "]").replace(/https?:\/\/[^\s)>\]]+/g, "");
  const lines = masked.split("\n").map(clean);
  return {
    withCode: lines,
    plain: lines.map((line) => line.replace(/`[^`]*`/g, "")),
  };
}

function checkProse(file, allowed, knownKeys, fail) {
  const { withCode, plain } = proseViews(readFileSync(file, "utf8"));
  const seen = new Set();
  const report = (line, reason, match) => {
    const id = `${line}|${reason}|${match}`;
    if (seen.has(id)) return;
    seen.add(id);
    fail(`${file}:${line} ${reason} «${match}»`);
  };
  plain.forEach((text, i) => {
    const line = i + 1;
    for (const m of text.matchAll(P1_COUNTED)) {
      const value = squash(m[1]);
      if (!allowed.has(value)) {
        report(line, "cifra sin clave", m[0]);
      }
    }
    for (const re of [P2_SCORE, P2_TIMING, P2_PERCENT]) {
      for (const m of text.matchAll(re)) {
        report(line, "cifra no comprobable", m[0]);
      }
    }
    for (const m of text.matchAll(ANGLE)) {
      if (/^<br\s*\/?>$/i.test(m[0]) || /^<https?:/i.test(m[0])) continue;
      report(line, "marcador sin rellenar", m[0]);
    }
  });
  withCode.forEach((text, i) => {
    for (const m of text.matchAll(/<([a-z0-9_]+)>/g)) {
      if (knownKeys.has(m[1])) report(i + 1, "marcador sin rellenar", m[0]);
    }
  });
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  const opts = parseArgs(process.argv.slice(2));
  const fails = [];
  const fail = (message) => fails.push(`FIGURE FAIL: ${message}`);

  if (!existsSync(opts.doc)) {
    console.log(`FIGURE FAIL: ${opts.doc} no existe`);
    process.exit(1);
  }
  const doc = scan(readFileSync(opts.doc, "utf8"));
  const block = readKeyBlock(doc, "Cifras");
  if (!block) {
    console.log("FIGURE FAIL: Cifras no tiene un bloque text con claves");
    process.exit(1);
  }

  const docValues = new Map();
  for (const { key, value } of block) docValues.set(key, value);
  const real = computeFigures(
    docValues.get("corte") ?? "",
    docValues.get("commit_merge_pr_6") ?? "",
  );

  let checked = 0;
  let testsSkipped = false;
  for (const { key, value } of block) {
    if (key === "tests") {
      if (!opts.tests) {
        testsSkipped = true;
        continue;
      }
      real.tests = countTests();
    }
    if (!(key in real)) {
      fail(`${key} no se puede comprobar`);
      continue;
    }
    checked++;
    if (value !== real[key]) fail(`${key} doc=${value} real=${real[key]}`);
  }
  for (const key of Object.keys(real)) {
    if (!docValues.has(key)) fail(`${key} falta en el bloque de cifras`);
  }

  // Invariant: the six phase ranges leave out the root commit, which is counted apart.
  const phaseSum =
    [1, 2, 3, 4, 5, 6].reduce(
      (a, n) => a + Number(docValues.get(`commits_fase_${n}`) ?? 0),
      0,
    ) + Number(docValues.get("commits_raiz") ?? 0);
  if (phaseSum !== Number(docValues.get("commits_total"))) {
    fail(`suma_fases doc=${phaseSum} real=${docValues.get("commits_total")}`);
  }

  // Cost section: averages and every cost cell (a no-op while the doc has no such section).
  const cost = checkCost(doc, fail);
  checked += cost.checked;

  // Prose rules on the doc and on every file given with --prose.
  const allowed = new Set(block.map(({ value }) => squash(value)));
  const knownKeys = new Set([...block.map(({ key }) => key), ...cost.keys]);
  for (const file of [opts.doc, ...opts.prose]) {
    if (!existsSync(file)) {
      fail(`${file} no existe`);
      continue;
    }
    checkProse(file, allowed, knownKeys, fail);
  }

  if (testsSkipped) console.log("SKIP tests (usa --tests)");
  for (const line of fails) console.log(line);
  if (fails.length > 0) process.exit(1);
  console.log(`FIGURES OK (${checked} cifras)`);
}

main();
