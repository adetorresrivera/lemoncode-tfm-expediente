// Dev-only manual run (D-24): posts the three fixture offers (docs/demo/ofertas/) to POST /api/offers/extract with the
// configured provider and prints timing and correctness. Not part of `npm run test` or CI.
// In-process by default (no server or database needed); set API_URL to target a running API.
import { offerExtractionSchema, type OfferExtraction } from "@tfm/contracts";
import { createApp } from "../app.js";
import { loadConfig } from "../config.js";
import { createLlmClient } from "../llm/llm.client.js";
import {
  OFFER_FIXTURES,
  readFixtureText,
  scoreExtraction,
} from "../offers/__fixtures__/fixtures.js";

const config = loadConfig();
const llm = createLlmClient(config);
const apiUrl = process.env["API_URL"]?.replace(/\/$/, "");

const app = createApp({
  pingMongo: async () => false,
  pingS3: async () => false,
  pingLlm: () => llm.ping(),
  llm,
});

function post(text: string): Promise<Response> {
  const init = {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ text }),
  };
  return apiUrl
    ? fetch(`${apiUrl}/api/offers/extract`, init)
    : Promise.resolve(app.request("/api/offers/extract", init));
}

interface Row {
  name: string;
  seconds: number;
  score: string;
  notes: string;
  extraction?: OfferExtraction;
  ok: boolean;
}

async function errorCode(res: Response): Promise<string> {
  try {
    const body: unknown = await res.json();
    if (typeof body === "object" && body !== null && "error" in body) {
      const error = (body as { error?: { code?: unknown } }).error;
      if (typeof error?.code === "string") return error.code;
    }
  } catch {
    // Not JSON: the status alone is reported.
  }
  return "UNKNOWN";
}

const rows: Row[] = [];
for (const fixture of OFFER_FIXTURES) {
  const started = performance.now();
  let row: Row;
  try {
    const res = await post(readFixtureText(fixture.name));
    const seconds = (performance.now() - started) / 1000;
    if (res.status === 200) {
      const extraction = offerExtractionSchema.parse(await res.json());
      const { correct, total, misses } = scoreExtraction(
        fixture.expected,
        extraction,
      );
      row = {
        name: fixture.name,
        seconds,
        score: `${correct} / ${total}`,
        notes: misses.join(", "),
        extraction,
        ok: true,
      };
    } else {
      row = {
        name: fixture.name,
        seconds,
        score: "-",
        notes: `HTTP ${res.status} ${await errorCode(res)}`,
        ok: false,
      };
    }
  } catch (err) {
    row = {
      name: fixture.name,
      seconds: (performance.now() - started) / 1000,
      score: "-",
      notes: err instanceof Error ? err.name : "request failed",
      ok: false,
    };
  }
  rows.push(row);
}

console.log(
  `provider: ${config.LLM_PROVIDER}, model: ${config.LLM_MODEL ?? "(none)"}, target: ${apiUrl ?? "in-process"}`,
);
console.log("");
console.log("| fixture | time (s) | correct / total | notes |");
console.log("| --- | --- | --- | --- |");
for (const row of rows) {
  console.log(
    `| ${row.name} | ${row.seconds.toFixed(1)} | ${row.score} | ${row.notes} |`,
  );
}
for (const row of rows) {
  if (!row.extraction) continue;
  console.log("");
  console.log(`${row.name}:`);
  console.log(JSON.stringify(row.extraction, null, 2));
}

process.exit(rows.every((row) => row.ok) ? 0 : 1);
