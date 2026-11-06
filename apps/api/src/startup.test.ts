import { describe, expect, it, vi } from "vitest";
import { retryStartup } from "./startup.js";

function setup() {
  const lines: string[] = [];
  const sleep = vi.fn(async () => undefined);
  return { lines, sleep, log: (line: string) => lines.push(line) };
}

describe("retryStartup", () => {
  it("resolves with the step value after transient failures, logging each one", async () => {
    const { lines, sleep, log } = setup();
    let calls = 0;
    const step = vi.fn(async () => {
      calls += 1;
      if (calls < 3) throw new Error("boom");
      return "connected";
    });

    const value = await retryStartup(step, {
      attempts: 3,
      delayMs: 10,
      log,
      sleep,
    });

    expect(value).toBe("connected");
    expect(step).toHaveBeenCalledTimes(3);
    expect(sleep).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledWith(10);
    expect(lines).toEqual([
      "Startup attempt 1/3 failed: boom",
      "Startup attempt 2/3 failed: boom",
    ]);
  });

  it("rejects with the last error after exactly the allowed attempts", async () => {
    const { lines, sleep, log } = setup();
    const step = vi.fn(async () => {
      throw new Error("still down");
    });

    await expect(
      retryStartup(step, { attempts: 3, delayMs: 10, log, sleep }),
    ).rejects.toThrow("still down");

    expect(step).toHaveBeenCalledTimes(3);
    // No pointless wait after the final failure.
    expect(sleep).toHaveBeenCalledTimes(2);
    expect(lines).toHaveLength(3);
    expect(lines[2]).toBe("Startup attempt 3/3 failed: still down");
  });

  it("logs a non-Error rejection as «unknown error»", async () => {
    const { lines, sleep, log } = setup();
    const step = vi.fn(async () => {
      throw "mongodb://user:secret@mongo:27017";
    });

    await expect(
      retryStartup(step, { attempts: 1, delayMs: 10, log, sleep }),
    ).rejects.toBeDefined();

    expect(lines).toEqual(["Startup attempt 1/1 failed: unknown error"]);
  });

  it("logs err.message only, never the stack or the cause", async () => {
    const { lines, sleep, log } = setup();
    const err = new Error("connect ECONNREFUSED", {
      cause: new Error("cause-secret-mongodb://user:pw@mongo"),
    });
    err.stack = "stack-secret-line at /app/main.ts";
    const step = vi.fn(async () => {
      throw err;
    });

    await expect(
      retryStartup(step, { attempts: 2, delayMs: 10, log, sleep }),
    ).rejects.toBe(err);

    const logged = lines.join("\n");
    expect(logged).toContain("connect ECONNREFUSED");
    expect(logged).not.toContain("stack-secret-line");
    expect(logged).not.toContain("cause-secret");
  });
});
