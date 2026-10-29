import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { errorResponseSchema, healthSchema } from "@tfm/contracts";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { createApp, type AppDeps } from "./app.js";
import { ApiError } from "./errors.js";

const allUp: AppDeps = {
  pingMongo: async () => true,
  pingS3: async () => true,
  pingLlm: async () => true,
};

async function bodyOf(res: Response): Promise<unknown> {
  return res.json();
}

beforeEach(() => {
  // The error handler logs err.message; keep the test output clean.
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("GET /api/health", () => {
  it("answers 200 with every dependency ok", async () => {
    const res = await createApp(allUp).request("/api/health");
    expect(res.status).toBe(200);
    expect(await bodyOf(res)).toEqual({ status: "ok", mongo: "ok", s3: "ok", llm: "ok" });
  });

  it("flips only mongo when the mongo probe fails", async () => {
    const res = await createApp({ ...allUp, pingMongo: async () => false }).request("/api/health");
    const body = healthSchema.parse(await bodyOf(res));
    expect(res.status).toBe(200);
    expect(body).toEqual({ status: "ok", mongo: "error", s3: "ok", llm: "ok" });
  });

  it("flips only s3 when the s3 probe rejects", async () => {
    const res = await createApp({
      ...allUp,
      pingS3: async () => {
        throw new Error("connection refused");
      },
    }).request("/api/health");
    const body = healthSchema.parse(await bodyOf(res));
    expect(res.status).toBe(200);
    expect(body).toEqual({ status: "ok", mongo: "ok", s3: "error", llm: "ok" });
  });

  it("reports a probe that never settles as error after the 2.5 s cap and still answers 200", async () => {
    vi.useFakeTimers();
    const app = createApp({ ...allUp, pingLlm: () => new Promise<boolean>(() => undefined) });
    const pending = app.request("/api/health");
    await vi.advanceTimersByTimeAsync(2600);
    const res = await pending;
    const body = healthSchema.parse(await bodyOf(res));
    expect(res.status).toBe(200);
    expect(body).toEqual({ status: "ok", mongo: "ok", s3: "ok", llm: "error" });
  });
});

describe("error contract", () => {
  function appWithRoutes(): Hono {
    const app = createApp(allUp);
    app.get("/boom/api-error", () => {
      throw new ApiError(502, "LLM_ERROR", "El modelo no responde", { retry: false });
    });
    app.post("/boom/zod", async (c) => {
      z.object({ name: z.string() }).parse(await c.req.json());
      return c.json({ ok: true });
    });
    app.post("/boom/json", async (c) => c.json(await c.req.json()));
    app.get("/boom/http-404", () => {
      throw new HTTPException(404, { message: "internal-not-found-detail" });
    });
    app.get("/boom/http-400", () => {
      throw new HTTPException(400, { message: "internal-bad-request-detail" });
    });
    app.get("/boom/http-503", () => {
      throw new HTTPException(503, { message: "internal-unavailable-detail" });
    });
    app.get("/boom/unknown", () => {
      throw new Error("secret-internal-detail");
    });
    return app;
  }

  it("answers an unknown /api path with 404 NOT_FOUND", async () => {
    const res = await createApp(allUp).request("/api/nope");
    expect(res.status).toBe(404);
    const body = errorResponseSchema.parse(await bodyOf(res));
    expect(body.error.code).toBe("NOT_FOUND");
  });

  it("maps ApiError to its status, code, message and details", async () => {
    const res = await appWithRoutes().request("/boom/api-error");
    expect(res.status).toBe(502);
    const body = errorResponseSchema.parse(await bodyOf(res));
    expect(body.error).toEqual({
      code: "LLM_ERROR",
      message: "El modelo no responde",
      details: { retry: false },
    });
  });

  it("maps a ZodError to 400 VALIDATION_ERROR with flattened details", async () => {
    const res = await appWithRoutes().request("/boom/zod", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
    const body = errorResponseSchema.parse(await bodyOf(res));
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(body.error.details).toHaveProperty("fieldErrors");
  });

  it("maps a malformed JSON body to 400 VALIDATION_ERROR", async () => {
    const res = await appWithRoutes().request("/boom/json", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{bad",
    });
    expect(res.status).toBe(400);
    const body = errorResponseSchema.parse(await bodyOf(res));
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("maps HTTPException 404 to NOT_FOUND and 400 to VALIDATION_ERROR without echoing its message", async () => {
    const app = appWithRoutes();
    const notFound = await app.request("/boom/http-404");
    expect(notFound.status).toBe(404);
    const notFoundText = await notFound.text();
    expect(errorResponseSchema.parse(JSON.parse(notFoundText)).error.code).toBe("NOT_FOUND");
    expect(notFoundText).not.toContain("internal-not-found-detail");

    const badRequest = await app.request("/boom/http-400");
    expect(badRequest.status).toBe(400);
    const badRequestText = await badRequest.text();
    expect(errorResponseSchema.parse(JSON.parse(badRequestText)).error.code).toBe(
      "VALIDATION_ERROR",
    );
    expect(badRequestText).not.toContain("internal-bad-request-detail");
  });

  it("keeps the status of other HTTPException values and reports INTERNAL_ERROR", async () => {
    const res = await appWithRoutes().request("/boom/http-503");
    expect(res.status).toBe(503);
    const text = await res.text();
    expect(errorResponseSchema.parse(JSON.parse(text)).error.code).toBe("INTERNAL_ERROR");
    expect(text).not.toContain("internal-unavailable-detail");
  });

  it("answers an unknown error with 500 INTERNAL_ERROR and never leaks the thrown message", async () => {
    const res = await appWithRoutes().request("/boom/unknown");
    expect(res.status).toBe(500);
    const text = await res.text();
    expect(errorResponseSchema.parse(JSON.parse(text)).error.code).toBe("INTERNAL_ERROR");
    expect(text).not.toContain("secret-internal-detail");
    // The handler logs the message only, never the stack.
    expect(console.error).toHaveBeenCalledWith("secret-internal-detail");
  });
});

describe("static hosting with SPA fallback", () => {
  let dist: string;

  beforeEach(async () => {
    dist = await mkdtemp(join(tmpdir(), "tfm-web-dist-"));
    await mkdir(join(dist, "assets"));
    await writeFile(join(dist, "index.html"), '<!doctype html><div id="root"></div>');
    await writeFile(join(dist, "assets", "app.js"), "console.log('app');");
  });

  afterEach(async () => {
    await rm(dist, { recursive: true, force: true });
  });

  it("serves existing assets", async () => {
    const res = await createApp({ ...allUp, webDistDir: dist }).request("/assets/app.js");
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("console.log");
  });

  it("falls back to index.html for client-side routes", async () => {
    const res = await createApp({ ...allUp, webDistDir: dist }).request("/applications/42");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/html");
    expect(await res.text()).toContain('id="root"');
  });

  it("keeps answering JSON 404 for unknown /api paths", async () => {
    const res = await createApp({ ...allUp, webDistDir: dist }).request("/api/nope");
    expect(res.status).toBe(404);
    expect(errorResponseSchema.parse(await bodyOf(res)).error.code).toBe("NOT_FOUND");
  });
});
