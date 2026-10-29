import { readFileSync } from "node:fs";
import { join } from "node:path";
import { serveStatic } from "@hono/node-server/serve-static";
import type { ErrorResponse, Health, HealthStatus } from "@tfm/contracts";
import { Hono } from "hono";
import { secureHeaders } from "hono/secure-headers";
import { ApiError } from "./errors.js";

export type AppDeps = {
  pingMongo: () => Promise<boolean>;
  pingS3: () => Promise<boolean>;
  pingLlm: () => Promise<boolean>;
  webDistDir?: string;
};

// Bounds a dependency probe so /api/health can never hang: a rejection or a timeout is "error".
async function probe(fn: () => Promise<boolean>, ms = 2500): Promise<HealthStatus> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<boolean>((resolve) => {
    timer = setTimeout(() => resolve(false), ms);
  });
  try {
    const ok = await Promise.race([fn().then(Boolean, () => false), timeout]);
    return ok ? "ok" : "error";
  } finally {
    clearTimeout(timer);
  }
}

function readIndexHtml(webDistDir: string): string | undefined {
  try {
    return readFileSync(join(webDistDir, "index.html"), "utf8");
  } catch {
    return undefined;
  }
}

export function createApp(deps: AppDeps): Hono {
  const app = new Hono();
  const indexHtml = deps.webDistDir ? readIndexHtml(deps.webDistDir) : undefined;

  app.use("*", secureHeaders({ strictTransportSecurity: false }));

  app.get("/api/health", async (c) => {
    const [mongo, s3, llm] = await Promise.all([
      probe(deps.pingMongo),
      probe(deps.pingS3),
      probe(deps.pingLlm),
    ]);
    const body: Health = { status: "ok", mongo, s3, llm };
    return c.json(body, 200);
  });

  if (deps.webDistDir) {
    app.use("*", serveStatic({ root: deps.webDistDir }));
  }

  app.notFound((c) => {
    const isApiPath = c.req.path === "/api" || c.req.path.startsWith("/api/");
    if (!isApiPath && c.req.method === "GET" && indexHtml !== undefined) {
      return c.html(indexHtml, 200);
    }
    const body: ErrorResponse = {
      error: { code: "NOT_FOUND", message: "Recurso no encontrado" },
    };
    return c.json(body, 404);
  });

  app.onError((err, c) => {
    console.error(err.message);
    if (err instanceof ApiError) {
      const body: ErrorResponse = {
        error: { code: err.code, message: err.message, details: err.details },
      };
      return c.json(body, err.status);
    }
    const body: ErrorResponse = { error: { code: "INTERNAL_ERROR", message: "Error interno" } };
    return c.json(body, 500);
  });

  return app;
}
