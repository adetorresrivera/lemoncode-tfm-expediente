// Offline Mermaid syntax check for the defense documents (07-03). It runs ONLY inside the throwaway
// Playwright container started by `bash scripts/browser-tools.sh mermaid <file.md>...`; `playwright`
// and `mermaid` are installed there and never enter a package.json.
//
// Arguments: `<label>=<path in the container>` pairs (the label is the path the user knows).
// Every fenced block whose info string is `mermaid` is parsed with `mermaid.parse` in Chromium.
// Parse-OK is necessary, not sufficient, for the GitHub preview: it proves the syntax, not the
// rendering. Zero blocks is a failure.
import { readFileSync } from "node:fs";
import { chromium } from "playwright";

const MERMAID_JS = "/tmp/node_modules/mermaid/dist/mermaid.min.js";

const pairs = process.argv.slice(2).map((arg) => {
  const at = arg.indexOf("=");
  return at === -1 ? { label: arg, file: arg } : { label: arg.slice(0, at), file: arg.slice(at + 1) };
});

// Extracts the fenced `mermaid` blocks of a Markdown text with the line of their opening fence.
const extractBlocks = (text) => {
  const blocks = [];
  const lines = text.split("\n");
  let open = null;
  lines.forEach((line, index) => {
    if (open === null) {
      const match = /^\s*(`{3,}|~{3,})\s*mermaid\s*$/.exec(line);
      if (match) open = { fence: match[1], line: index + 1, body: [] };
      return;
    }
    if (new RegExp(`^\\s*${open.fence[0]}{${open.fence.length},}\\s*$`).test(line)) {
      blocks.push({ line: open.line, source: open.body.join("\n") });
      open = null;
      return;
    }
    open.body.push(line);
  });
  if (open !== null) blocks.push({ line: open.line, source: open.body.join("\n"), unclosed: true });
  return blocks;
};

const firstLine = (error) => String(error instanceof Error ? error.message : error).split("\n")[0];

const browser = await chromium.launch();
let total = 0;
let failed = false;

try {
  const page = await browser.newPage();
  await page.setContent("<!doctype html><html><body></body></html>");
  await page.addScriptTag({ path: MERMAID_JS });
  await page.evaluate(() => window.mermaid.initialize({ startOnLoad: false }));

  for (const { label, file } of pairs) {
    for (const block of extractBlocks(readFileSync(file, "utf8"))) {
      total += 1;
      if (block.unclosed) {
        console.log(`ERR ${label}:${block.line} the mermaid fence is never closed`);
        failed = true;
        continue;
      }
      const message = await page.evaluate(async (source) => {
        try {
          await window.mermaid.parse(source);
          return null;
        } catch (error) {
          return String(error instanceof Error ? error.message : error);
        }
      }, block.source);
      if (message === null) {
        console.log(`ok ${label}:${block.line}`);
      } else {
        console.log(`ERR ${label}:${block.line} ${firstLine(message)}`);
        failed = true;
      }
    }
  }
} catch (error) {
  console.log(`ERR mermaid check could not run: ${firstLine(error)}`);
  failed = true;
} finally {
  await browser.close();
}

if (total === 0) {
  console.log("ERR no mermaid blocks found");
  failed = true;
}

if (failed) {
  console.log("MERMAID FAIL");
  process.exit(1);
}
console.log(`MERMAID OK (${total} diagramas)`);
