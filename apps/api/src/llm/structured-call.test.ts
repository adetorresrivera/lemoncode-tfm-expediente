import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { ApiError } from "../errors.js";
import { callStructured } from "./structured-call.js";

const schema = z.object({ a: z.string() });
const VALID = JSON.stringify({ a: "ok" });

type Send = (signal: AbortSignal) => Promise<string | null>;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** A send that never answers on its own and rejects as soon as its signal aborts. */
function hangUntilAborted(signal: AbortSignal): Promise<string | null> {
  return new Promise((_resolve, reject) => {
    const fail = () => reject(new Error("aborted"));
    if (signal.aborted) {
      fail();
      return;
    }
    signal.addEventListener("abort", fail, { once: true });
  });
}

async function failureOf(promise: Promise<unknown>): Promise<ApiError> {
  const error = await promise.then(
    () => null,
    (e: unknown) => e,
  );
  expect(error).toBeInstanceOf(ApiError);
  return error as ApiError;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("callStructured", () => {
  it("returns the parsed object and calls send once on valid output", async () => {
    const send = vi.fn<Send>(async () => VALID);
    const result = await callStructured({ timeoutMs: 1000, schema, send });
    expect(result).toEqual({ a: "ok" });
    expect(send).toHaveBeenCalledTimes(1);
  });

  it("retries once when the first output is not JSON", async () => {
    const send = vi
      .fn<Send>()
      .mockResolvedValueOnce("not json")
      .mockResolvedValueOnce(VALID);
    const result = await callStructured({ timeoutMs: 1000, schema, send });
    expect(result).toEqual({ a: "ok" });
    expect(send).toHaveBeenCalledTimes(2);
  });

  it("answers 502 LLM_ERROR after two schema-invalid outputs, calling send exactly twice", async () => {
    const send = vi.fn<Send>(async () => JSON.stringify({ a: 1 }));
    const error = await failureOf(
      callStructured({ timeoutMs: 1000, schema, send }),
    );
    expect(error).toMatchObject({
      status: 502,
      code: "LLM_ERROR",
      message: "La respuesta del modelo no es válida",
    });
    expect(send).toHaveBeenCalledTimes(2);
  });

  it("answers 502 LLM_ERROR after two null contents", async () => {
    const send = vi.fn<Send>(async () => null);
    const error = await failureOf(
      callStructured({ timeoutMs: 1000, schema, send }),
    );
    expect(error).toMatchObject({ status: 502, code: "LLM_ERROR" });
    expect(send).toHaveBeenCalledTimes(2);
  });

  it("answers 502 LLM_ERROR without retrying when send rejects", async () => {
    const send = vi.fn<Send>(async () => {
      throw new Error("connection refused");
    });
    const error = await failureOf(
      callStructured({ timeoutMs: 1000, schema, send }),
    );
    expect(error).toMatchObject({
      status: 502,
      code: "LLM_ERROR",
      message: "El modelo no está disponible",
    });
    expect(send).toHaveBeenCalledTimes(1);
  });

  it("answers 504 LLM_TIMEOUT without retrying when the budget runs out", async () => {
    const send = vi.fn<Send>(hangUntilAborted);
    const error = await failureOf(
      callStructured({ timeoutMs: 50, schema, send }),
    );
    expect(error).toMatchObject({
      status: 504,
      code: "LLM_TIMEOUT",
      message: "La IA ha tardado demasiado",
    });
    expect(send).toHaveBeenCalledTimes(1);
  });

  it("succeeds when the answer arrives inside the budget", async () => {
    const send = vi.fn<Send>(async () => {
      await sleep(20);
      return VALID;
    });
    const result = await callStructured({ timeoutMs: 200, schema, send });
    expect(result).toEqual({ a: "ok" });
  });

  it("turns a budget spent in the first attempt into 504, not 502", async () => {
    const send = vi
      .fn<Send>()
      .mockImplementationOnce(async () => {
        await sleep(80);
        return "not json";
      })
      .mockImplementationOnce(hangUntilAborted);
    const error = await failureOf(
      callStructured({ timeoutMs: 50, schema, send }),
    );
    expect(error).toMatchObject({ status: 504, code: "LLM_TIMEOUT" });
  });

  it("aborts the signal given to send when the client aborts and answers 502, never 504", async () => {
    const client = new AbortController();
    let received: AbortSignal | undefined;
    const send = vi.fn<Send>((signal) => {
      received = signal;
      return hangUntilAborted(signal);
    });
    const pending = failureOf(
      callStructured({
        timeoutMs: 5000,
        signal: client.signal,
        schema,
        send,
      }),
    );
    await sleep(10);
    client.abort();
    const error = await pending;
    expect(received?.aborted).toBe(true);
    expect(error).toMatchObject({ status: 502, code: "LLM_ERROR" });
    expect(send).toHaveBeenCalledTimes(1);
  });

  it("creates one AbortSignal.timeout per call, retry included", async () => {
    const timeoutSpy = vi.spyOn(AbortSignal, "timeout");
    const send = vi
      .fn<Send>()
      .mockResolvedValueOnce("not json")
      .mockResolvedValueOnce(VALID);
    await callStructured({ timeoutMs: 1000, schema, send });
    expect(timeoutSpy).toHaveBeenCalledTimes(1);
    expect(timeoutSpy).toHaveBeenCalledWith(1000);
  });

  it("gives every concurrent call its own timeout", async () => {
    const timeoutSpy = vi.spyOn(AbortSignal, "timeout");
    const send = vi.fn<Send>(async () => VALID);
    await Promise.all([
      callStructured({ timeoutMs: 1000, schema, send }),
      callStructured({ timeoutMs: 1000, schema, send }),
    ]);
    expect(timeoutSpy).toHaveBeenCalledTimes(2);
  });

  it("never carries model output in the rejection message", async () => {
    const send = vi.fn<Send>(async () => "{ SENTINEL-OUTPUT");
    const error = await failureOf(
      callStructured({ timeoutMs: 1000, schema, send }),
    );
    expect(error.message).not.toContain("SENTINEL-OUTPUT");
    expect(send).toHaveBeenCalledTimes(2);
  });
});
