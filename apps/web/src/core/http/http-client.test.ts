import { healthSchema } from "@tfm/contracts";
import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { HttpError, request } from "./http-client";

const stubFetch = (impl: () => Promise<Response>) => {
  const fetchMock = vi.fn<typeof fetch>(impl);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

const catchError = async (promise: Promise<unknown>): Promise<unknown> => {
  try {
    await promise;
  } catch (error) {
    return error;
  }
  throw new Error("Expected the request to reject");
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("request", () => {
  it("returns the body parsed by the contracts schema", async () => {
    stubFetch(async () =>
      json({ status: "ok", mongo: "ok", s3: "ok", llm: "ok" }),
    );

    await expect(request("/api/health", healthSchema)).resolves.toStrictEqual({
      status: "ok",
      mongo: "ok",
      s3: "ok",
      llm: "ok",
    });
  });

  it("maps a contract error body to HttpError", async () => {
    stubFetch(async () =>
      json(
        { error: { code: "NOT_FOUND", message: "Recurso no encontrado" } },
        404,
      ),
    );

    const error = await catchError(request("/api/nope", healthSchema));

    expect(error).toBeInstanceOf(HttpError);
    expect(error).toMatchObject({
      status: 404,
      code: "NOT_FOUND",
      message: "Recurso no encontrado",
    });
  });

  it("keeps the error details of a contract error body", async () => {
    stubFetch(async () =>
      json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Datos no válidos",
            details: { fieldErrors: { title: ["Obligatorio"] } },
          },
        },
        400,
      ),
    );

    const error = await catchError(request("/api/x", healthSchema));

    expect(error).toMatchObject({
      status: 400,
      code: "VALIDATION_ERROR",
      details: { fieldErrors: { title: ["Obligatorio"] } },
    });
  });

  it("maps a non-contract error body to INVALID_RESPONSE", async () => {
    stubFetch(async () => new Response("<html>boom</html>", { status: 500 }));

    const error = await catchError(request("/api/health", healthSchema));

    expect(error).toBeInstanceOf(HttpError);
    expect(error).toMatchObject({ status: 500, code: "INVALID_RESPONSE" });
    expect((error as HttpError).message).not.toContain("boom");
  });

  it("maps a 200 body that fails the schema to INVALID_RESPONSE", async () => {
    stubFetch(async () => json({ status: "nope" }));

    const error = await catchError(request("/api/health", healthSchema));

    expect(error).toBeInstanceOf(HttpError);
    expect(error).toMatchObject({ code: "INVALID_RESPONSE" });
  });

  it("maps a network failure to NETWORK_ERROR with status 0", async () => {
    stubFetch(async () => {
      throw new TypeError("Failed to fetch");
    });

    const error = await catchError(request("/api/health", healthSchema));

    expect(error).toBeInstanceOf(HttpError);
    expect(error).toMatchObject({ status: 0, code: "NETWORK_ERROR" });
  });

  it("rethrows an AbortError untouched", async () => {
    const abort = new DOMException("Aborted", "AbortError");
    stubFetch(async () => {
      throw abort;
    });

    const error = await catchError(request("/api/health", healthSchema));

    expect(error).toBe(abort);
    expect(error).not.toBeInstanceOf(HttpError);
  });

  it("resolves a 204 with schema.parse(undefined)", async () => {
    stubFetch(async () => new Response(null, { status: 204 }));

    await expect(request("/api/applications/1", z.undefined())).resolves.toBe(
      undefined,
    );
  });

  it("sends a JSON body with method and content-type", async () => {
    const fetchMock = stubFetch(async () => json({ ok: true }));

    await request("/api/echo", z.object({ ok: z.boolean() }), {
      method: "POST",
      body: { a: 1 },
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [path, init] = fetchMock.mock.calls[0] ?? [];
    expect(path).toBe("/api/echo");
    expect(init?.method).toBe("POST");
    expect(new Headers(init?.headers).get("content-type")).toBe(
      "application/json",
    );
    expect(init?.body).toBe(JSON.stringify({ a: 1 }));
  });

  it("passes the abort signal to fetch", async () => {
    const fetchMock = stubFetch(async () => json({ ok: true }));
    const controller = new AbortController();

    await request("/api/echo", z.object({ ok: z.boolean() }), {
      signal: controller.signal,
    });

    expect(fetchMock.mock.calls[0]?.[1]?.signal).toBe(controller.signal);
  });
});
