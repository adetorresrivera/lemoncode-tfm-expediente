import { readFileSync } from "node:fs";
import { join } from "node:path";
import { serveStatic } from "@hono/node-server/serve-static";
import type { ErrorResponse, Health, HealthStatus } from "@tfm/contracts";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { secureHeaders } from "hono/secure-headers";
import type { Db } from "mongodb";
import { z } from "zod";
import { createApplicationsRepository } from "./applications/applications.repository.js";
import { applicationsRoutes } from "./applications/applications.routes.js";
import { createApplicationsService } from "./applications/applications.service.js";
import { createDocumentsRepository } from "./documents/documents.repository.js";
import { documentsRoutes } from "./documents/documents.routes.js";
import { createDocumentsService } from "./documents/documents.service.js";
import { ApiError } from "./errors.js";
import type { LlmClient } from "./llm/llm.client.js";
import { offersRoutes } from "./offers/extract.routes.js";
import { createExtractService } from "./offers/extract.service.js";
import type { DocumentStorage } from "./storage/s3.js";
import { tagsRoutes } from "./tags/tags.routes.js";

export type AppDeps = {
  pingMongo: () => Promise<boolean>;
  pingS3: () => Promise<boolean>;
  pingLlm: () => Promise<boolean>;
  webDistDir?: string;
  db?: Db;
  llm?: LlmClient;
  storage?: DocumentStorage;
  now?: () => Date;
};

// Bounds a dependency probe so /api/health can never hang: a rejection or a timeout is "error".
async function probe(
  fn: () => Promise<boolean>,
  ms = 2500,
): Promise<HealthStatus> {
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
  const indexHtml = deps.webDistDir
    ? readIndexHtml(deps.webDistDir)
    : undefined;
  if (deps.webDistDir && indexHtml === undefined) {
    console.warn(
      `index.html not found in ${deps.webDistDir}; SPA fallback disabled`,
    );
  }

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

  // Mounted before serveStatic so the production image never answers index.html for an API path.
  const documentsRepository = deps.db
    ? createDocumentsRepository(deps.db)
    : undefined;
  if (deps.db && documentsRepository) {
    const service = createApplicationsService(
      createApplicationsRepository(deps.db),
      (ids) => documentsRepository.findTypes(ids),
      deps.now,
    );
    app.route("/api/applications", applicationsRoutes(service));
    app.route("/api/tags", tagsRoutes(service));
  }

  // The documents endpoints need both Mongo (metadata) and the bucket (bytes).
  if (documentsRepository && deps.storage) {
    const documents = createDocumentsService(
      documentsRepository,
      deps.storage,
      deps.now,
    );
    app.route("/api/documents", documentsRoutes(documents));
  }

  // The extraction endpoint needs the LLM client only: it reads and writes no database.
  if (deps.llm) {
    app.route("/api/offers", offersRoutes(createExtractService(deps.llm)));
  }

  if (deps.webDistDir) {
    app.use("*", serveStatic({ root: deps.webDistDir }));
  }

  app.notFound((c) => {
    const isApiPath = c.req.path === "/api" || c.req.path.startsWith("/api/");
    // A path whose last segment has a file extension is a missing static file (a stale hash, a
    // favicon): answering the app shell for it would hide a broken build behind a 200.
    const looksLikeFile = /\.[A-Za-z0-9]+$/.test(c.req.path);
    if (
      !isApiPath &&
      !looksLikeFile &&
      c.req.method === "GET" &&
      indexHtml !== undefined
    ) {
      return c.html(indexHtml, 200);
    }
    const body: ErrorResponse = {
      error: { code: "NOT_FOUND", message: "Recurso no encontrado" },
    };
    return c.json(body, 404);
  });

  // Single error handler. Mapping order matters: ApiError, ZodError, SyntaxError (Hono's
  // c.req.json() throws a plain SyntaxError on a malformed body), HTTPException, anything else.
  // Only err.message is logged: never the stack, the request body or the offer text. A JSON
  // SyntaxError is the exception to the exception: V8 quotes a snippet of the body in its
  // message, so it is logged as a fixed string instead.
  app.onError((err, c) => {
    console.error(
      err instanceof SyntaxError
        ? "SyntaxError (malformed JSON body)"
        : err.message,
    );

    if (err instanceof ApiError) {
      const body: ErrorResponse = {
        error: { code: err.code, message: err.message, details: err.details },
      };
      return c.json(body, err.status);
    }

    if (err instanceof z.ZodError) {
      const body: ErrorResponse = {
        error: {
          code: "VALIDATION_ERROR",
          message: "Datos no válidos",
          details: z.flattenError(err),
        },
      };
      return c.json(body, 400);
    }

    if (err instanceof SyntaxError) {
      const body: ErrorResponse = {
        error: { code: "VALIDATION_ERROR", message: "JSON no válido" },
      };
      return c.json(body, 400);
    }

    if (err instanceof HTTPException) {
      // The exception's own message is never echoed: it is internal wording.
      const body: ErrorResponse =
        err.status === 404
          ? { error: { code: "NOT_FOUND", message: "Recurso no encontrado" } }
          : err.status === 400
            ? {
                error: {
                  code: "VALIDATION_ERROR",
                  message: "Solicitud no válida",
                },
              }
            : { error: { code: "INTERNAL_ERROR", message: "Error interno" } };
      return c.json(body, err.status);
    }

    const body: ErrorResponse = {
      error: { code: "INTERNAL_ERROR", message: "Error interno" },
    };
    return c.json(body, 500);
  });

  return app;
}
