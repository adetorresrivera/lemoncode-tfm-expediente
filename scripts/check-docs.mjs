/* global console, process */
/* global Buffer */
// Usage: node scripts/check-docs.mjs [--adr] [--ia] [--demo] [--deck] [--deck-total=m:ss] [--qa] [--readme] [--captures] [--all] [--self-test] [--root <dir>]
//
// Documentation checker for README.md and docs/**/*.md (phase 7). It always verifies that every
// relative link, image and #anchor resolves and that the phase docs follow the voice and provider
// rules; each flag adds the structural contract of one deliverable. Node built-ins only.
// Exit codes: 0 all good, 1 problems found, 2 unknown or malformed option.
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve, sep } from "node:path";

const MODES = ["adr", "ia", "demo", "deck", "qa", "readme", "captures"];

const AI_DOC = "docs/ia-en-el-proyecto.md";
const ADR_DOC = "docs/decisiones.md";
const DEMO_DOC = "docs/presentacion/demo-script.md";
const DECK_DOC = "docs/presentacion/deck.md";
const QA_DOC = "docs/presentacion/preguntas-tribunal.md";
const CAPTURES_DIR = "docs/presentacion/capturas";
const PHASE_DOCS = [DECK_DOC, DEMO_DOC, QA_DOC, AI_DOC, ADR_DOC];
const VOICE_FILES = [...PHASE_DOCS, "README.md"];
const COST_SECTION = "Coste: local frente a la nube";

// The two cloud providers that decision D-16 keeps out of the docs. Built from fragments so this
// file does not spell them either.
const EXCLUDED_PROVIDERS = new RegExp(
  [["gem", "ini"].join(""), ["gr", "oq"].join("")].join("|"),
  "i",
);

const ADR_KEYWORDS = [
  "monorepo",
  "pods",
  "hono",
  "monousuario",
  "silo",
  "ollama",
  "compose",
  "shadcn",
  "react query",
  "borrador",
  "prompt",
  "magic bytes",
];

const CAPTURE_NAMES = [
  "lista-claro-1280.png",
  "lista-oscuro-1280.png",
  "lista-movil-360.png",
  "detalle-claro-1280.png",
  "formulario-ia-claro-1280.png",
];

const PNG_SIGNATURE = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);
const FENCE = "`".repeat(3);

// ---------------------------------------------------------------------------
// Parsing helpers
// ---------------------------------------------------------------------------

const toPosix = (p) => p.split(sep).join("/");

const problem = (file, line, reason) =>
  line == null
    ? `CHECK FAIL: ${file} ${reason}`
    : `CHECK FAIL: ${file}:${line} ${reason}`;

const parseTime = (s) => {
  const m = /^(\d+):(\d\d)$/.exec(s.trim());
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
};

const formatTime = (sec) =>
  `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;

/** Splits a Markdown text into lines, fenced blocks and headings (1-based line numbers later). */
function scan(text) {
  const lines = text.split("\n");
  const inFence = new Array(lines.length).fill(false);
  const fences = [];
  let current = null;
  lines.forEach((line, i) => {
    if (!current) {
      const m = /^```(.*)$/.exec(line);
      if (m) {
        current = { info: m[1].trim(), open: i, close: i, body: [] };
        inFence[i] = true;
      }
      return;
    }
    inFence[i] = true;
    if (/^```\s*$/.test(line)) {
      current.close = i;
      fences.push(current);
      current = null;
    } else {
      current.body.push(line);
    }
  });
  if (current) {
    current.close = lines.length - 1;
    fences.push(current);
  }
  const headings = [];
  lines.forEach((line, i) => {
    if (inFence[i]) return;
    const m = /^(#{1,6})\s+(.*)$/.exec(line);
    if (m) headings.push({ level: m[1].length, text: m[2].trim(), line: i });
  });
  return { text, lines, inFence, fences, headings };
}

function loadDoc(root, rel) {
  const path = join(root, rel);
  return existsSync(path) ? scan(readFileSync(path, "utf8")) : null;
}

const findHeading = (doc, level, text) =>
  doc.headings.find((h) => h.level === level && h.text === text);

const sectionOf = (doc, heading) => {
  const next = doc.headings.find(
    (h) => h.line > heading.line && h.level <= heading.level,
  );
  return { from: heading.line + 1, to: next ? next.line : doc.lines.length };
};

const linesIn = (doc, sec) => doc.lines.slice(sec.from, sec.to);
const fencesIn = (doc, sec) =>
  doc.fences.filter((f) => f.open >= sec.from && f.open < sec.to);

/** Link targets of one line of Markdown (inline code removed). */
const linkTargets = (line) =>
  [
    ...line
      .replace(/`[^`]*`/g, "")
      .matchAll(/!?\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g),
  ].map((m) => m[1]);

/** Prose per line: no fences, HTML comments, inline code, images, link targets or bare URLs. */
function proseLines(doc) {
  let text = doc.lines.map((l, i) => (doc.inFence[i] ? "" : l)).join("\n");
  text = text.replace(/<!--[\s\S]*?-->/g, (m) => m.replace(/[^\n]/g, ""));
  return text.split("\n").map((l) =>
    l
      .replace(/`[^`]*`/g, "")
      .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
      .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
      .replace(/https?:\/\/\S+/g, ""),
  );
}

const slug = (heading) =>
  heading
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .trim()
    .toLowerCase()
    .replace(/[`*~]/g, "")
    .replace(/[^\p{L}\p{M}\p{N}\s_-]/gu, "")
    .replace(/\s/g, "-");

const anchorCache = new Map();
function anchorsOf(path) {
  const cached = anchorCache.get(path);
  if (cached) return cached;
  const seen = new Map();
  const set = new Set();
  for (const h of scan(readFileSync(path, "utf8")).headings) {
    const base = slug(h.text);
    const n = seen.get(base) ?? 0;
    seen.set(base, n + 1);
    set.add(n === 0 ? base : `${base}-${n}`);
  }
  anchorCache.set(path, set);
  return set;
}

const walkMarkdown = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return walkMarkdown(p);
    return p.endsWith(".md") ? [p] : [];
  });

const tableCells = (row) =>
  row
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split(/(?<!\\)\|/)
    .map((c) => c.trim());

// ---------------------------------------------------------------------------
// Generic checks: links, anchors, images, voice, providers, secrets
// ---------------------------------------------------------------------------

function checkLinks(root, files, problems) {
  let count = 0;
  for (const file of files) {
    const rel = toPosix(relative(root, file));
    let fence = false;
    readFileSync(file, "utf8")
      .split("\n")
      .forEach((line, i) => {
        if (/^```/.test(line)) fence = !fence;
        if (fence) return;
        for (const target of linkTargets(line)) {
          if (/^(https?:|mailto:)/.test(target)) continue;
          count++;
          const [path, rawAnchor] = target.split("#");
          let resolved;
          try {
            resolved = path ? resolve(dirname(file), decodeURI(path)) : file;
          } catch {
            problems.push(`BROKEN ${rel}:${i + 1} -> ${target}`);
            continue;
          }
          if (!existsSync(resolved)) {
            problems.push(`BROKEN ${rel}:${i + 1} -> ${target}`);
            continue;
          }
          if (rawAnchor && resolved.endsWith(".md")) {
            let anchor = rawAnchor;
            try {
              anchor = decodeURIComponent(rawAnchor);
            } catch {
              // keep the raw anchor
            }
            if (!anchorsOf(resolved).has(anchor.toLowerCase())) {
              problems.push(`BAD ANCHOR ${rel}:${i + 1} -> ${target}`);
            }
          }
        }
      });
  }
  return count;
}

function checkVoice(root, problems) {
  for (const rel of VOICE_FILES) {
    const doc = loadDoc(root, rel);
    if (!doc) continue;
    const isPhaseDoc = PHASE_DOCS.includes(rel);
    if (isPhaseDoc) {
      proseLines(doc).forEach((line, i) => {
        if (/\p{Extended_Pictographic}/u.test(line)) {
          problems.push(problem(rel, i + 1, "emoji in prose"));
        }
        if (/[¡!]/.test(line)) {
          problems.push(problem(rel, i + 1, "exclamation mark in prose"));
        }
      });
    }
    let costRange = null;
    if (rel === AI_DOC) {
      const cost = findHeading(doc, 2, COST_SECTION);
      if (cost) costRange = sectionOf(doc, cost);
    }
    doc.lines.forEach((line, i) => {
      if (EXCLUDED_PROVIDERS.test(line)) {
        problems.push(problem(rel, i + 1, "excluded provider named (D-16)"));
      }
      if (/gpt-/i.test(line)) {
        const allowed =
          costRange !== null &&
          i >= costRange.from &&
          i < costRange.to &&
          line.startsWith("|");
        if (!allowed) {
          problems.push(
            problem(
              rel,
              i + 1,
              "model identifier outside the cost table (D-16)",
            ),
          );
        }
      }
      if (
        /\bsk-[A-Za-z0-9_-]{16,}/.test(line) ||
        /AKIA[0-9A-Z]{16}/.test(line) ||
        /LLM_API_KEY=\S/.test(line)
      ) {
        problems.push(problem(rel, i + 1, "secret-shaped string"));
      }
    });
  }
}

// ---------------------------------------------------------------------------
// Structural contracts
// ---------------------------------------------------------------------------

/** Loads a document or records `missing`; returns null when absent. */
function need(root, rel, problems) {
  const doc = loadDoc(root, rel);
  if (!doc) problems.push(problem(rel, null, "missing"));
  return doc;
}

function checkAdr(root, problems) {
  const rel = ADR_DOC;
  const doc = need(root, rel, problems);
  if (!doc) return;
  const fail = (line, reason) => problems.push(problem(rel, line, reason));
  const adrs = doc.headings.filter(
    (h) => h.level === 2 && /^ADR-\d{3}: /.test(h.text),
  );
  if (adrs.length < 12)
    fail(null, `needs at least 12 ADRs, found ${adrs.length}`);
  adrs.forEach((h, i) => {
    const expected = `ADR-${String(i + 1).padStart(3, "0")}`;
    if (!h.text.startsWith(`${expected}: `)) {
      fail(h.line + 1, `expected heading ${expected}, found "${h.text}"`);
    }
    const sec = sectionOf(doc, h);
    const subs = doc.headings.filter(
      (x) => x.level === 3 && x.line >= sec.from && x.line < sec.to,
    );
    let last = -1;
    for (const name of [
      "Contexto",
      "Decisión",
      "Alternativas",
      "Consecuencias",
    ]) {
      const sub = subs.find((x) => x.text === name);
      if (!sub) {
        fail(h.line + 1, `${expected} is missing ### ${name}`);
        continue;
      }
      if (sub.line < last) fail(sub.line + 1, `### ${name} out of order`);
      last = Math.max(last, sub.line);
      const next = doc.headings.find((x) => x.line > sub.line);
      const end = next ? next.line : doc.lines.length;
      const body = doc.lines.slice(sub.line + 1, end);
      if (!body.some((l) => l.trim() !== "")) {
        fail(sub.line + 1, `${expected} has an empty ### ${name}`);
      }
    }
  });
  ADR_KEYWORDS.forEach((keyword, i) => {
    const h = adrs[i];
    if (h && !h.text.toLowerCase().includes(keyword)) {
      fail(
        h.line + 1,
        `title of ADR-${String(i + 1).padStart(3, "0")} must contain "${keyword}"`,
      );
    }
  });
}

function checkIa(root, problems) {
  const rel = AI_DOC;
  const doc = need(root, rel, problems);
  if (!doc) return;
  const fail = (line, reason) => problems.push(problem(rel, line, reason));
  const titles = [
    "Cómo se usó la IA en el desarrollo",
    "Cifras",
    "Cómo se calculó",
    "Qué funcionó y qué no",
    "La IA dentro del producto",
    "Coste: local frente a la nube",
  ];
  let last = -1;
  const secs = {};
  for (const title of titles) {
    const h = findHeading(doc, 2, title);
    if (!h) {
      fail(null, `missing section ## ${title}`);
      continue;
    }
    if (h.line < last) fail(h.line + 1, `section ## ${title} out of order`);
    last = Math.max(last, h.line);
    secs[title] = sectionOf(doc, h);
  }

  const figures = secs["Cifras"];
  if (figures) {
    const blocks = fencesIn(doc, figures).filter((f) => f.info === "text");
    if (blocks.length !== 1) {
      fail(
        figures.from,
        `Cifras needs exactly one text block, found ${blocks.length}`,
      );
    } else {
      const lines = blocks[0].body.filter((l) => l.trim() !== "");
      lines.forEach((l) => {
        if (!/^[a-z0-9_]+: \S.*$/.test(l)) {
          fail(blocks[0].open + 1, `Cifras line is not "key: value": ${l}`);
        }
      });
      if (lines.length < 20) {
        fail(
          blocks[0].open + 1,
          `Cifras has ${lines.length} lines, needs at least 20`,
        );
      }
    }
  }

  const how = secs["Cómo se calculó"];
  if (how) {
    if (!linesIn(doc, how).some((l) => l.includes("c11ab61"))) {
      fail(how.from, "Cómo se calculó must mention c11ab61");
    }
    if (!fencesIn(doc, how).some((f) => f.info === "bash")) {
      fail(how.from, "Cómo se calculó needs a bash block");
    }
  }

  const worked = secs["Qué funcionó y qué no"];
  if (worked) {
    const bullets = [];
    linesIn(doc, worked).forEach((l, i) => {
      const lineNo = worked.from + i;
      if (!doc.inFence[lineNo] && /^[-*] /.test(l)) bullets.push({ l, lineNo });
    });
    if (bullets.length < 8) {
      fail(
        worked.from,
        `Qué funcionó y qué no has ${bullets.length} bullets, needs at least 8`,
      );
    }
    for (const { l, lineNo } of bullets) {
      const hasLink = /\]\([^)]*\.planning\/[^)]*\)/.test(l);
      const hasHash = /`[0-9a-f]{7,40}`/.test(l);
      if (!hasLink && !hasHash) {
        fail(lineNo + 1, "bullet without a .planning/ link or a commit hash");
      }
    }
  }

  const cost = secs[COST_SECTION];
  if (cost) {
    const text = linesIn(doc, cost).join("\n");
    if (!text.includes("https://developers.openai.com/api/docs/pricing")) {
      fail(
        cost.from,
        "cost section must cite https://developers.openai.com/api/docs/pricing",
      );
    }
    if (!/2026-11-\d\d/.test(text))
      fail(cost.from, "cost section needs an access date 2026-11-DD");
    const blocks = fencesIn(doc, cost).filter((f) => f.info === "text");
    const keys = [
      "tokens_entrada_media",
      "tokens_entrada_media_sin_esquema",
      "tokens_salida_media",
    ];
    if (
      !blocks.some((b) =>
        keys.every((k) => b.body.some((l) => l.startsWith(`${k}:`))),
      )
    ) {
      fail(
        cost.from,
        `cost section needs a text block with ${keys.join(", ")}`,
      );
    }
    // The section holds two tables (measured tokens, then prices); the cost table is the one whose
    // header names the 100 and the 10 000 offers per month.
    const header = linesIn(doc, cost).find(
      (l) =>
        l.startsWith("|") && /100/.test(l) && /10[ \u00a0\u202f]000/.test(l),
    );
    if (!header) {
      fail(cost.from, "cost table header must contain 100 and 10 000");
    }
  }

  if (!doc.text.includes("compatible con OpenAI")) {
    fail(null, 'must say "compatible con OpenAI"');
  }
}

function checkDemo(root, problems) {
  const rel = DEMO_DOC;
  const doc = need(root, rel, problems);
  if (!doc) return;
  const fail = (line, reason) => problems.push(problem(rel, line, reason));

  const before = findHeading(doc, 2, "Antes de empezar");
  if (!before) {
    fail(null, "missing section ## Antes de empezar");
  } else {
    const sec = sectionOf(doc, before);
    const items = linesIn(doc, sec).filter((l) => l.startsWith("- [ ] "));
    if (items.length < 6) {
      fail(
        before.line + 1,
        `checklist has ${items.length} items, needs at least 6`,
      );
    }
    const joined = items.join("\n");
    for (const needle of [
      "docker compose up",
      "npm run seed",
      "ollama run gemma4:e2b",
      "LLM_PROVIDER=mock",
      "20 s",
      "Claro",
    ]) {
      if (!joined.includes(needle))
        fail(before.line + 1, `checklist must mention "${needle}"`);
    }
    if (!/zoom/i.test(joined))
      fail(before.line + 1, 'checklist must mention "zoom"');
  }

  const script = findHeading(doc, 2, "Guion");
  if (!script) {
    fail(null, "missing section ## Guion");
  } else {
    const sec = sectionOf(doc, script);
    const rows = [];
    let started = false;
    for (let i = sec.from; i < sec.to; i++) {
      const l = doc.lines[i];
      if (doc.inFence[i]) continue;
      if (l.startsWith("|")) {
        started = true;
        rows.push({ l, lineNo: i + 1 });
      } else if (started) break;
    }
    const expectedHeader = [
      "#",
      "Tiempo",
      "Paso",
      "Qué dices",
      "Plan B (mock)",
      "Plan C",
    ];
    if (rows.length === 0) {
      fail(script.line + 1, "Guion has no table");
    } else {
      const header = tableCells(rows[0].l);
      if (header.join("|") !== expectedHeader.join("|")) {
        fail(
          rows[0].lineNo,
          `Guion header must be | ${expectedHeader.join(" | ")} |`,
        );
      }
      const data = rows.slice(2);
      if (data.length === 0) fail(rows[0].lineNo, "Guion table has no rows");
      let total = 0;
      data.forEach(({ l, lineNo }, idx) => {
        const cells = tableCells(l);
        if (cells.length !== 6) {
          fail(lineNo, `row has ${cells.length} cells, needs 6`);
          return;
        }
        if (cells[0] !== String(idx + 1)) {
          fail(lineNo, `row number must be ${idx + 1}, found "${cells[0]}"`);
        }
        if (cells.some((c) => c === "")) fail(lineNo, "row has an empty cell");
        if (!/^\d:\d\d$/.test(cells[1])) {
          fail(lineNo, `Tiempo must match m:ss, found "${cells[1]}"`);
        } else {
          total += parseTime(cells[1]);
        }
      });
      if (total !== 300) {
        fail(
          rows[0].lineNo,
          `Tiempo cells add up to ${formatTime(total)}, expected 5:00`,
        );
      }
      const firstRow = (needle) => data.findIndex((r) => r.l.includes(needle));
      const a = firstRow("Estado inicial");
      const b = firstRow("Añadir ronda");
      const c = firstRow("Oferta recibida");
      if (a < 0 || b < 0 || c < 0) {
        fail(
          rows[0].lineNo,
          "rows must include Estado inicial, Añadir ronda and Oferta recibida",
        );
      } else if (!(a < b && b < c)) {
        fail(
          rows[0].lineNo,
          "row order must be Estado inicial, Añadir ronda, Oferta recibida",
        );
      }
    }
  }

  for (const needle of [
    "remote-senior.txt",
    "por eso nada se guarda solo; corrijo el campo y la marca IA desaparece",
    "la regla la aplica el servicio",
    "Lumen Analytics",
  ]) {
    if (!doc.text.includes(needle)) fail(null, `must contain "${needle}"`);
  }
  if (!doc.headings.some((h) => h.level === 2 && h.text.startsWith("Plan B"))) {
    fail(null, "missing section ## Plan B");
  }
  const planC = doc.headings.find(
    (h) => h.level === 2 && h.text.startsWith("Plan C"),
  );
  if (!planC) {
    fail(null, "missing section ## Plan C");
  } else if (
    !linesIn(doc, sectionOf(doc, planC)).join("\n").includes("vídeo")
  ) {
    fail(planC.line + 1, "Plan C must mention vídeo");
  }
  const targets = doc.lines.flatMap(linkTargets);
  if (!targets.some((t) => /capturas\/[^)]*\.png$/.test(t.split("#")[0]))) {
    fail(null, "must link at least one capturas/*.png");
  }
  for (const t of targets) {
    if (/\.(mp4|webm|mov|mkv)$/i.test(t.split("#")[0])) {
      fail(null, `must not link a video file: ${t}`);
    }
  }
}

function checkDeck(root, total, problems) {
  const rel = DECK_DOC;
  const doc = need(root, rel, problems);
  if (!doc) return;
  const fail = (line, reason) => problems.push(problem(rel, line, reason));
  const totalSec = parseTime(total);

  const slides = doc.headings
    .filter((h) => h.level === 2 && /^Diapositiva \d+: /.test(h.text))
    .map((h) => ({
      h,
      n: Number(/^Diapositiva (\d+): /.exec(h.text)[1]),
      title: h.text.replace(/^Diapositiva \d+: /, ""),
    }));
  if (slides.length < 9 || slides.length > 12) {
    fail(null, `needs 9 to 12 slides, found ${slides.length}`);
  }
  slides.forEach((s, i) => {
    if (s.n !== i + 1)
      fail(s.h.line + 1, `slide numbered ${s.n}, expected ${i + 1}`);
  });

  let sum = 0;
  for (const s of slides) {
    const sec = sectionOf(doc, s.h);
    s.seconds = null;
    const flat = [];
    for (let i = sec.from; i < sec.to; i++) {
      if (!doc.inFence[i]) flat.push({ l: doc.lines[i], lineNo: i + 1 });
    }
    const times = flat.filter((x) => x.l.startsWith("**Tiempo:**"));
    if (times.length !== 1) {
      fail(
        s.h.line + 1,
        `slide ${s.n} needs exactly one **Tiempo:** line, found ${times.length}`,
      );
    } else {
      const m = /^\*\*Tiempo:\*\* (\d+:\d\d)\s*$/.exec(times[0].l);
      const seconds = m ? parseTime(m[1]) : null;
      if (seconds === null) {
        fail(times[0].lineNo, "**Tiempo:** must be followed by m:ss");
      } else {
        s.seconds = seconds;
        sum += seconds;
      }
    }
    const notes = flat.filter((x) => x.l.startsWith("**Nota del orador:**"));
    if (
      notes.length === 0 ||
      notes[0].l.replace("**Nota del orador:**", "").trim() === ""
    ) {
      fail(
        s.h.line + 1,
        `slide ${s.n} needs a **Nota del orador:** line with text`,
      );
    }
    if (flat.filter((x) => x.l.startsWith("- ")).length < 2) {
      fail(s.h.line + 1, `slide ${s.n} needs at least 2 bullets`);
    }
  }
  if (totalSec !== null && sum !== totalSec) {
    fail(
      null,
      `times add up to ${formatTime(sum)}, expected ${formatTime(totalSec)}`,
    );
  }

  const demo = slides.filter((s) => s.title.includes("Demo"));
  if (demo.length !== 1) {
    fail(
      null,
      `exactly one slide title must contain Demo, found ${demo.length}`,
    );
  } else {
    const idx = slides.indexOf(demo[0]);
    if (demo[0].seconds !== 300)
      fail(demo[0].h.line + 1, "the Demo slide must last 5:00");
    if (idx === 0 || !slides[idx - 1].title.includes("MVP")) {
      fail(
        demo[0].h.line + 1,
        "the slide before Demo must have MVP in its title",
      );
    }
  }
  const last = slides[slides.length - 1];
  if (!last || !last.title.includes("Próximos pasos")) {
    fail(
      last ? last.h.line + 1 : null,
      "the last slide title must contain Próximos pasos",
    );
  }

  const mermaid = doc.fences.filter((f) => f.info === "mermaid");
  if (mermaid.length < 3)
    fail(null, `needs at least 3 mermaid blocks, found ${mermaid.length}`);
  const firstLine = (f) => (f.body.find((l) => l.trim() !== "") ?? "").trim();
  if (!mermaid.some((f) => firstLine(f).startsWith("sequenceDiagram"))) {
    fail(null, "needs a mermaid sequenceDiagram block");
  }
  if (mermaid.filter((f) => firstLine(f).startsWith("flowchart")).length < 2) {
    fail(null, "needs at least 2 mermaid flowchart blocks");
  }
  for (const f of mermaid) {
    f.body.forEach((l, i) => {
      if (l.trimStart().startsWith("click")) {
        fail(f.open + 2 + i, "mermaid blocks must not use click");
      }
    });
  }

  const code = doc.fences.filter((f) => f.info !== "mermaid");
  if (code.length < 1 || code.length > 2) {
    fail(null, `needs 1 or 2 source snippets, found ${code.length}`);
  }
  for (const f of code) {
    let prev = f.open - 1;
    while (prev >= 0 && doc.lines[prev].trim() === "") prev--;
    const m =
      prev >= 0
        ? /^<!-- source: (\S+)#L(\d+)-L(\d+) -->$/.exec(doc.lines[prev].trim())
        : null;
    if (!m) {
      fail(
        f.open + 1,
        "snippet needs a <!-- source: path#La-Lb --> line right before it",
      );
      continue;
    }
    const [, path, from, to] = m;
    const a = Number(from);
    const b = Number(to);
    if (b < a || b - a + 1 > 10) {
      fail(f.open + 1, `snippet range L${a}-L${b} must be 1 to 10 lines`);
      continue;
    }
    const sourcePath = join(root, path);
    if (!existsSync(sourcePath)) {
      fail(f.open + 1, `snippet source ${path} missing`);
      continue;
    }
    const sourceLines = readFileSync(sourcePath, "utf8").split("\n");
    if (
      b > sourceLines.length ||
      sourceLines.slice(a - 1, b).join("\n") !== f.body.join("\n")
    ) {
      fail(f.open + 1, `snippet differs from ${path}#L${a}-L${b}`);
    }
  }
  if (
    !doc.lines.some((l) =>
      linkTargets(l).some((t) => t.split("#")[0].endsWith("demo-script.md")),
    )
  ) {
    fail(null, "must link demo-script.md");
  }
}

const countSentences = (text) => {
  const t = text
    .replace(/`[^`]*`/g, "")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/p\. ej\./g, "")
    .replace(/etc\./g, "");
  return (t.match(/[.?…](?=\s|$)/g) ?? []).length;
};

function checkQa(root, problems) {
  const rel = QA_DOC;
  const doc = need(root, rel, problems);
  if (!doc) return;
  const fail = (line, reason) => problems.push(problem(rel, line, reason));
  const questions = doc.headings.filter(
    (h) => h.level === 3 && /^\d+\. \S/.test(h.text),
  );
  if (questions.length !== 15) {
    fail(null, `needs exactly 15 questions, found ${questions.length}`);
  }
  questions.forEach((h, i) => {
    if (Number(/^(\d+)\./.exec(h.text)[1]) !== i + 1) {
      fail(h.line + 1, `question numbered out of sequence, expected ${i + 1}`);
    }
    const next = doc.headings.find((x) => x.line > h.line);
    const end = next ? next.line : doc.lines.length;
    const answer = [];
    for (let k = h.line + 1; k < end; k++) {
      if (!doc.inFence[k] && doc.lines[k].trim() !== "")
        answer.push(doc.lines[k].trim());
    }
    const sentences = countSentences(answer.join(" "));
    if (sentences < 2 || sentences > 4) {
      fail(h.line + 1, `answer has ${sentences} sentences, needs 2 to 4`);
    }
  });
  const all = questions.map((h) => h.text.toLowerCase()).join("\n");
  for (const word of [
    "backend",
    "alucina",
    "react query",
    "multiusuario",
    "coste",
    "cambiarías",
  ]) {
    if (!all.includes(word))
      fail(null, `no question heading contains "${word}"`);
  }
}

function checkReadme(root, problems) {
  const rel = "README.md";
  const doc = need(root, rel, problems);
  if (!doc) return;
  const fail = (line, reason) => problems.push(problem(rel, line, reason));
  const next = findHeading(doc, 2, "Próximos pasos");
  const docs = findHeading(doc, 2, "Documentación");
  if (!next) {
    fail(null, "missing section ## Próximos pasos");
  } else {
    if (docs && docs.line < next.line) {
      fail(
        next.line + 1,
        "## Próximos pasos must come before ## Documentación",
      );
    }
    const lines = linesIn(doc, sectionOf(doc, next));
    if (lines.filter((l) => l.startsWith("- ")).length < 5) {
      fail(next.line + 1, "Próximos pasos needs at least 5 bullets");
    }
    const text = lines.join("\n").toLowerCase();
    for (const word of [
      "kanban",
      "biblioteca",
      "cv",
      "dashboard",
      "e2e",
      "login",
    ]) {
      if (!text.includes(word))
        fail(next.line + 1, `Próximos pasos must mention "${word}"`);
    }
  }
  if (!docs) {
    fail(null, "missing section ## Documentación");
  } else {
    const targets = linesIn(doc, sectionOf(doc, docs))
      .flatMap(linkTargets)
      .map((t) => t.split("#")[0]);
    for (const path of [AI_DOC, ADR_DOC, DECK_DOC, DEMO_DOC, QA_DOC]) {
      if (!targets.includes(path))
        fail(docs.line + 1, `Documentación must link ${path}`);
    }
  }
}

function checkCaptures(root, problems) {
  for (const name of CAPTURE_NAMES) {
    const rel = `${CAPTURES_DIR}/${name}`;
    const path = join(root, rel);
    if (!existsSync(path)) {
      problems.push(problem(rel, null, "missing"));
      continue;
    }
    const buf = readFileSync(path);
    if (buf.length < 24 || !buf.subarray(0, 8).equals(PNG_SIGNATURE)) {
      problems.push(problem(rel, null, "not a PNG (bad signature)"));
      continue;
    }
    const expected = Number(/-(\d+)\.png$/.exec(name)[1]);
    const width = buf.readUInt32BE(16);
    if (width !== expected) {
      problems.push(
        problem(rel, null, `width is ${width}, expected ${expected}`),
      );
    }
    if (buf.length <= 10 * 1024 || buf.length > 1.5 * 1024 * 1024) {
      problems.push(
        problem(rel, null, `size ${buf.length} bytes outside 10 KB to 1.5 MB`),
      );
    }
  }
}

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------

function runChecks(root, { modes, deckTotal }) {
  anchorCache.clear();
  const problems = [];
  const docsDir = join(root, "docs");
  const files = [
    join(root, "README.md"),
    ...(existsSync(docsDir) ? walkMarkdown(docsDir) : []),
  ].filter(existsSync);
  const links = checkLinks(root, files, problems);
  checkVoice(root, problems);
  if (modes.has("adr")) checkAdr(root, problems);
  if (modes.has("ia")) checkIa(root, problems);
  if (modes.has("demo")) checkDemo(root, problems);
  if (modes.has("deck")) checkDeck(root, deckTotal, problems);
  if (modes.has("qa")) checkQa(root, problems);
  if (modes.has("readme")) checkReadme(root, problems);
  if (modes.has("captures")) checkCaptures(root, problems);
  return { files: files.length, links, problems };
}

// ---------------------------------------------------------------------------
// Self-test: a valid fixture tree plus one breaking change per rule family
// ---------------------------------------------------------------------------

const ADR_TITLES = [
  "Monorepo con npm workspaces",
  "Arquitectura de pods del curso",
  "Hono con el driver oficial",
  "Aplicación monousuario y local",
  "Silo como S3 local",
  "Ollama local con proveedor intercambiable",
  "Una imagen y Docker Compose",
  "shadcn/ui con el design system",
  "Hooks de datos propios, sin React Query",
  "El borrador de la IA nunca se guarda solo",
  "Prompt de sistema literal",
  "Tipo de archivo por magic bytes",
];

const QA_HEADINGS = [
  "¿Por qué no usaste otro backend?",
  "¿Qué pasa si el modelo alucina?",
  "¿Por qué no React Query?",
  "¿Cómo escala a multiusuario?",
  "¿Cuánto es el coste de la IA?",
  "¿Qué cambiarías con más tiempo?",
  ...Array.from(
    { length: 9 },
    (_, i) => `¿Pregunta de relleno número ${i + 7}?`,
  ),
];

function pngBuffer(width, size) {
  const buf = Buffer.alloc(size);
  PNG_SIGNATURE.copy(buf, 0);
  buf.writeUInt32BE(13, 8);
  buf.write("IHDR", 12, "ascii");
  buf.writeUInt32BE(width, 16);
  buf.writeUInt32BE(100, 20);
  return buf;
}

function buildFixture() {
  const files = new Map();
  files.set(
    "README.md",
    [
      "# Fixture",
      "",
      "## Próximos pasos",
      "",
      "- Kanban de estados.",
      "- Biblioteca de documentos.",
      "- Versiones de cv por candidatura.",
      "- Dashboard de métricas.",
      "- Pruebas e2e.",
      "- Login para varios usuarios.",
      "",
      "## Documentación",
      "",
      `- [IA](${AI_DOC})`,
      `- [Decisiones](${ADR_DOC})`,
      `- [Deck](${DECK_DOC})`,
      `- [Guion](${DEMO_DOC})`,
      `- [Preguntas](${QA_DOC})`,
      "",
    ].join("\n"),
  );

  const adr = ["# Decisiones", "", "Registro de decisiones.", ""];
  ADR_TITLES.forEach((title, i) => {
    adr.push(
      `## ADR-${String(i + 1).padStart(3, "0")}: ${title}`,
      "",
      "### Contexto",
      "",
      "Texto.",
      "",
      "### Decisión",
      "",
      "Texto.",
      "",
      "### Alternativas",
      "",
      "- Otra: no.",
      "",
      "### Consecuencias",
      "",
      "- Una.",
      "",
      "Fuentes: [README](../README.md)",
      "",
    );
  });
  files.set(ADR_DOC, adr.join("\n"));

  const figures = Array.from(
    { length: 20 },
    (_, i) => `cifra_${i + 1}: ${i + 1}`,
  );
  const worked = [
    ...[1, 2, 3, 4].map((i) => `- Caso ${i} con hash \`c11ab6${i}\`.`),
    ...[5, 6, 7, 8].map(
      (i) => `- Caso ${i} en [el plan](../.planning/notes.md).`,
    ),
  ];
  files.set(
    AI_DOC,
    [
      "# IA en el proyecto",
      "",
      "## Cómo se usó la IA en el desarrollo",
      "",
      "Texto.",
      "",
      "## Cifras",
      "",
      `${FENCE}text`,
      ...figures,
      FENCE,
      "",
      "## Cómo se calculó",
      "",
      "Todo parte de `c11ab61`.",
      "",
      `${FENCE}bash`,
      "git rev-list --count c11ab61",
      FENCE,
      "",
      "## Qué funcionó y qué no",
      "",
      ...worked,
      "",
      "## La IA dentro del producto",
      "",
      "Sirve cualquier endpoint compatible con OpenAI.",
      "",
      `## ${COST_SECTION}`,
      "",
      "Precios de https://developers.openai.com/api/docs/pricing consultados el 2026-11-07.",
      "",
      `${FENCE}text`,
      "tokens_entrada_media: 1000",
      "tokens_entrada_media_sin_esquema: 700",
      "tokens_salida_media: 300",
      FENCE,
      "",
      "| Modelo | 100 | 10 000 |",
      "|---|---|---|",
      "| gpt-5.4-nano | 0,01 | 1 |",
      "",
    ].join("\n"),
  );
  files.set(".planning/notes.md", "# Notas\n");

  const rows = [
    ["Estado inicial", "Muestras la lista.", "Plan B 1", "Plan C 1"],
    [
      "Pegar remote-senior.txt",
      "Por eso nada se guarda solo; corrijo el campo y la marca IA desaparece.".replace(
        "Por",
        "por",
      ),
      "Plan B 2",
      "Plan C 2",
    ],
    ["Guardar", "Guardas el expediente.", "Lumen Analytics", "Plan C 3"],
    [
      "Añadir ronda",
      "Pasa a entrevistas: la regla la aplica el servicio.",
      "Plan B 4",
      "Plan C 4",
    ],
    ["Oferta recibida", "Cambias el estado.", "Plan B 5", "Plan C 5"],
  ];
  files.set(
    DEMO_DOC,
    [
      "# Guion de la demo",
      "",
      "## Antes de empezar",
      "",
      "- [ ] Arranca con `docker compose up`.",
      "- [ ] Siembra con `npm run seed`.",
      "- [ ] Calienta con `ollama run gemma4:e2b`.",
      "- [ ] Plan B: `LLM_PROVIDER=mock`.",
      "- [ ] Si la extracción tarda más de 20 s, pasa a mock.",
      "- [ ] Ajusta el zoom del navegador.",
      "- [ ] Tema Claro.",
      "",
      "## Guion",
      "",
      "| # | Tiempo | Paso | Qué dices | Plan B (mock) | Plan C |",
      "|---|---|---|---|---|---|",
      ...rows.map((r, i) => `| ${i + 1} | 1:00 | ${r.join(" | ")} |`),
      "",
      "## Plan B",
      "",
      "Cambia a mock.",
      "",
      "## Plan C",
      "",
      "Pon el vídeo.",
      "",
      "![Lista](capturas/lista-claro-1280.png)",
      "",
    ].join("\n"),
  );

  const slideTitles = [
    "Qué es Expediente",
    "El problema",
    "Arquitectura",
    "La IA en el producto",
    "Código clave",
    "Cómo se construyó",
    "MVP terminado",
    "Demo en vivo",
    "Qué aprendí",
    "Próximos pasos",
  ];
  const slideTimes = [
    "1:00",
    "1:00",
    "1:00",
    "1:00",
    "1:00",
    "1:00",
    "2:00",
    "5:00",
    "1:00",
    "1:00",
  ];
  const deck = ["# Deck", ""];
  slideTitles.forEach((title, i) => {
    deck.push(
      `## Diapositiva ${i + 1}: ${title}`,
      "",
      `**Tiempo:** ${slideTimes[i]}`,
      "",
      "**Nota del orador:** Texto de la nota.",
      "",
      "- Punto uno",
      "- Punto dos",
      "",
    );
    if (i === 1) {
      deck.push(
        `${FENCE}mermaid`,
        "sequenceDiagram",
        "  A->>B: hola",
        FENCE,
        "",
      );
    }
    if (i === 2 || i === 3) {
      deck.push(`${FENCE}mermaid`, "flowchart LR", "  A --> B", FENCE, "");
    }
    if (i === 4) {
      deck.push(
        "<!-- source: src/sample.ts#L2-L4 -->",
        `${FENCE}ts`,
        "export const b = 2;",
        "export const c = 3;",
        "export const d = 4;",
        FENCE,
        "",
      );
    }
    if (i === 7) deck.push("Guion en [demo-script.md](demo-script.md).", "");
  });
  files.set(DECK_DOC, deck.join("\n"));
  files.set(
    "src/sample.ts",
    [
      "export const a = 1;",
      "export const b = 2;",
      "export const c = 3;",
      "export const d = 4;",
      "export const e = 5;",
      "",
    ].join("\n"),
  );

  const qa = ["# Preguntas del tribunal", ""];
  QA_HEADINGS.forEach((q, i) => {
    qa.push(
      `### ${i + 1}. ${q}`,
      "",
      "Primera frase de la respuesta. Segunda frase de la respuesta.",
      "",
    );
  });
  files.set(QA_DOC, qa.join("\n"));

  for (const name of CAPTURE_NAMES) {
    const width = Number(/-(\d+)\.png$/.exec(name)[1]);
    files.set(`${CAPTURES_DIR}/${name}`, pngBuffer(width, 12000));
  }
  return files;
}

function writeTree(dir, files) {
  for (const [rel, content] of files) {
    const path = join(dir, rel);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, content);
  }
}

const replaceOnce = (files, rel, from, to) => {
  const text = files.get(rel);
  if (typeof text !== "string" || !text.includes(from)) {
    throw new Error(`fixture mutation did not apply: ${rel} lacks ${from}`);
  }
  files.set(rel, text.replace(from, to));
};

const appendTo = (files, rel, extra) =>
  files.set(rel, `${files.get(rel)}\n${extra}\n`);

function selfTestCases() {
  const provider = ["Gem", "ini"].join("");
  return [
    { name: "valid fixture", mutate: () => {}, expect: null },
    {
      name: "broken link",
      mutate: (f) => appendTo(f, "README.md", "[x](nope.md)"),
      expect: "BROKEN",
    },
    {
      name: "bad anchor",
      mutate: (f) => appendTo(f, "README.md", `[x](${ADR_DOC}#nope)`),
      expect: "BAD ANCHOR",
    },
    {
      name: "emoji in prose",
      mutate: (f) => appendTo(f, DEMO_DOC, "Listo \u{1F600}"),
      expect: "emoji",
    },
    {
      name: "exclamation mark",
      mutate: (f) => appendTo(f, QA_DOC, "Hola!"),
      expect: "exclamation",
    },
    {
      name: "excluded provider",
      mutate: (f) => appendTo(f, QA_DOC, `Usa ${provider}.`),
      expect: "excluded provider",
    },
    {
      name: "model identifier outside the cost table",
      mutate: (f) =>
        replaceOnce(f, AI_DOC, "Texto.", "Texto con gpt-5 suelto."),
      expect: "model identifier",
    },
    {
      name: "model identifier in a non-table line of the cost section",
      mutate: (f) => appendTo(f, AI_DOC, "Nota: gpt-5.4-mini cuesta más."),
      expect: "model identifier",
    },
    {
      name: "secret",
      mutate: (f) => appendTo(f, "README.md", "LLM_API_KEY=abc"),
      expect: "secret",
    },
    {
      name: "ADR without Alternativas",
      mutate: (f) => replaceOnce(f, ADR_DOC, "### Alternativas\n", ""),
      expect: "missing ### Alternativas",
    },
    {
      name: "ADR titles out of D-18 order",
      mutate: (f) => {
        replaceOnce(
          f,
          ADR_DOC,
          "ADR-001: Monorepo con npm workspaces",
          "ADR-001: TMP",
        );
        replaceOnce(
          f,
          ADR_DOC,
          "ADR-002: Arquitectura de pods del curso",
          "ADR-002: Monorepo con npm workspaces",
        );
        replaceOnce(
          f,
          ADR_DOC,
          "ADR-001: TMP",
          "ADR-001: Arquitectura de pods del curso",
        );
      },
      expect: 'must contain "monorepo"',
    },
    {
      name: "deck adds up to 14:45",
      mutate: (f) => {
        const text = f.get(DECK_DOC);
        const at = text.lastIndexOf("**Tiempo:** 1:00");
        f.set(
          DECK_DOC,
          `${text.slice(0, at)}**Tiempo:** 0:45${text.slice(at + "**Tiempo:** 1:00".length)}`,
        );
      },
      expect: "expected 15:00",
    },
    {
      name: "deck snippet differs from its source",
      mutate: (f) =>
        replaceOnce(f, DECK_DOC, "export const c = 3;", "export const c = 99;"),
      expect: "snippet differs",
    },
    {
      name: "deck with two flowchart blocks only",
      mutate: (f) =>
        replaceOnce(f, DECK_DOC, "sequenceDiagram", "flowchart TD"),
      expect: "sequenceDiagram",
    },
    {
      name: "deck mermaid click line",
      mutate: (f) =>
        replaceOnce(
          f,
          DECK_DOC,
          "  A->>B: hola",
          "  A->>B: hola\n  click A href",
        ),
      expect: "click",
    },
    {
      name: "deck slide without speaker note",
      mutate: (f) =>
        replaceOnce(
          f,
          DECK_DOC,
          "**Nota del orador:** Texto de la nota.\n",
          "",
        ),
      expect: "Nota del orador",
    },
    {
      name: "demo row with an empty Plan C cell",
      mutate: (f) => replaceOnce(f, DEMO_DOC, "| Plan C 1 |", "|  |"),
      expect: "empty cell",
    },
    {
      name: "demo adds up to 5:05",
      mutate: (f) => replaceOnce(f, DEMO_DOC, "| 1 | 1:00 |", "| 1 | 1:05 |"),
      expect: "expected 5:00",
    },
    {
      name: "demo Añadir ronda before Estado inicial",
      mutate: (f) => {
        replaceOnce(f, DEMO_DOC, "| Estado inicial |", "| Primer paso |");
        replaceOnce(
          f,
          DEMO_DOC,
          "| Oferta recibida |",
          "| Estado inicial y Oferta recibida |",
        );
      },
      expect: "row order",
    },
    {
      name: "demo links a video file",
      mutate: (f) => {
        f.set("docs/presentacion/clip.mp4", "x");
        appendTo(f, DEMO_DOC, "[clip](clip.mp4)");
      },
      expect: "video file",
    },
    {
      name: "Q&A with 14 questions",
      mutate: (f) => {
        const text = f.get(QA_DOC);
        f.set(QA_DOC, text.slice(0, text.indexOf("### 15.")));
      },
      expect: "found 14",
    },
    {
      name: "Q&A answer with 5 sentences",
      mutate: (f) =>
        replaceOnce(
          f,
          QA_DOC,
          "Primera frase de la respuesta. Segunda frase de la respuesta.",
          "Uno. Dos. Tres. Cuatro. Cinco.",
        ),
      expect: "5 sentences",
    },
    {
      name: "Q&A without the coste question",
      mutate: (f) => replaceOnce(f, QA_DOC, "el coste", "el precio"),
      expect: '"coste"',
    },
    {
      name: "README without Próximos pasos",
      mutate: (f) =>
        replaceOnce(f, "README.md", "## Próximos pasos", "## Siguientes"),
      expect: "Próximos pasos",
    },
    {
      name: "capture 1000 px wide",
      mutate: (f) =>
        f.set(`${CAPTURES_DIR}/lista-claro-1280.png`, pngBuffer(1000, 12000)),
      expect: "width is 1000",
    },
    {
      name: "capture under 10 KB",
      mutate: (f) =>
        f.set(`${CAPTURES_DIR}/lista-movil-360.png`, pngBuffer(360, 5000)),
      expect: "size",
    },
    {
      name: "AI doc without Cifras",
      mutate: (f) => replaceOnce(f, AI_DOC, "## Cifras", "## Números"),
      expect: "Cifras",
    },
    {
      name: "AI doc with a malformed Cifras line",
      mutate: (f) => replaceOnce(f, AI_DOC, "cifra_1: 1", "Línea mal formada"),
      expect: 'not "key: value"',
    },
  ];
}

function selfTest() {
  const base = mkdtempSync(join(tmpdir(), "check-docs-"));
  try {
    const cases = selfTestCases();
    for (const [i, c] of cases.entries()) {
      const files = buildFixture();
      try {
        c.mutate(files);
      } catch (error) {
        console.log(`SELF-TEST FAIL: ${c.name} (${error.message})`);
        return 1;
      }
      const dir = join(base, String(i));
      writeTree(dir, files);
      const { problems } = runChecks(dir, {
        modes: new Set(MODES),
        deckTotal: "15:00",
      });
      if (c.expect === null) {
        if (problems.length > 0) {
          console.log(
            `SELF-TEST FAIL: ${c.name} (valid fixture reported: ${problems[0]})`,
          );
          return 1;
        }
      } else if (!problems.some((p) => p.includes(c.expect))) {
        console.log(
          `SELF-TEST FAIL: ${c.name} (no problem containing "${c.expect}")`,
        );
        return 1;
      }
    }
    console.log(`SELF-TEST OK (${cases.length} casos)`);
    return 0;
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function main(argv) {
  const modes = new Set();
  let root = process.cwd();
  let deckTotal = "15:00";
  let doSelfTest = false;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--all") {
      MODES.forEach((m) => modes.add(m));
    } else if (arg === "--self-test") {
      doSelfTest = true;
    } else if (arg === "--root") {
      const value = argv[++i];
      if (!value) {
        console.log("CHECK FAIL: --root needs a directory");
        return 2;
      }
      root = value;
    } else if (arg.startsWith("--root=")) {
      root = arg.slice("--root=".length);
    } else if (arg.startsWith("--deck-total=")) {
      deckTotal = arg.slice("--deck-total=".length);
      if (parseTime(deckTotal) === null) {
        console.log(
          `CHECK FAIL: bad value for --deck-total: ${deckTotal} (use m:ss)`,
        );
        return 2;
      }
    } else if (arg.startsWith("--") && MODES.includes(arg.slice(2))) {
      modes.add(arg.slice(2));
    } else {
      console.log(`CHECK FAIL: unknown option ${arg}`);
      return 2;
    }
  }
  if (doSelfTest) return selfTest();

  const { files, links, problems } = runChecks(resolve(root), {
    modes,
    deckTotal,
  });
  for (const line of problems) console.log(line);
  console.log(
    `${files} files, ${links} internal links, ${problems.length} problems`,
  );
  if (problems.length > 0) return 1;
  console.log("DOCS OK");
  return 0;
}

process.exit(main(process.argv.slice(2)));
