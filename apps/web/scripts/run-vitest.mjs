// Runs `vitest run` and reruns it ONCE when, and only when, Vitest could not
// start its worker pool (cold bind mount, jsdom loaded by many forks at once).
// Any run that produced results, or failed for another reason, keeps its exit code.
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);
const cli = path.join(
  path.dirname(require.resolve("vitest/package.json")),
  "vitest.mjs",
);
const args = process.argv.slice(2);
// eslint-disable-next-line no-control-regex
const ansi = /\u001b\[[0-9;]*m/g;

const run = () =>
  new Promise((resolve) => {
    let text = "";
    const env = process.stdout.isTTY
      ? { ...process.env, FORCE_COLOR: "1" }
      : process.env;
    const child = spawn(process.execPath, [cli, "run", ...args], {
      stdio: ["inherit", "pipe", "pipe"],
      env,
    });
    const forward = (signal) => () => child.kill(signal);
    process.on("SIGINT", forward("SIGINT"));
    process.on("SIGTERM", forward("SIGTERM"));
    for (const [stream, out] of [
      [child.stdout, process.stdout],
      [child.stderr, process.stderr],
    ]) {
      stream.on("data", (chunk) => {
        text += chunk.toString();
        out.write(chunk);
      });
    }
    child.on("error", (error) => {
      process.stderr.write(`run-vitest: ${error.message}\n`);
      resolve({ code: 1, text });
    });
    child.on("close", (code, signal) =>
      resolve({ code: code ?? (signal ? 1 : 0), text }),
    );
  });

const workerNeverStarted = ({ code, text }) => {
  const plain = text.replace(ansi, "");
  return (
    code !== 0 &&
    /Failed to start (forks|threads) worker/.test(plain) &&
    !/Test Files\s+\d/.test(plain)
  );
};

let result = await run();
if (workerNeverStarted(result)) {
  process.stderr.write(
    "run-vitest: the worker pool did not start (cold filesystem); retrying once.\n",
  );
  result = await run();
}
process.exit(result.code);
