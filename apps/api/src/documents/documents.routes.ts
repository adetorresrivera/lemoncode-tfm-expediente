import {
  DOCUMENT_MAX_BYTES,
  documentInputSchema,
  documentQuerySchema,
} from "@tfm/contracts";
import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { z } from "zod";
import { ApiError } from "../errors.js";
import { parseObjectId } from "../http/object-id.js";
import { queryInput } from "../http/query-input.js";
import type { DocumentsService } from "./documents.service.js";
import { contentDisposition } from "./file-name.js";

// Room for the multipart boundary and the part headers on top of the file itself (D-03).
export const UPLOAD_BODY_LIMIT_BYTES = DOCUMENT_MAX_BYTES + 64 * 1024;

const tooLarge = (): ApiError =>
  new ApiError(413, "FILE_TOO_LARGE", "El archivo supera 5 MB.");

// No logging here. This router receives multipart, so it does not use the JSON-only content-type
// middleware of the applications router.
export function documentsRoutes(service: DocumentsService): Hono {
  const routes = new Hono();

  routes.post(
    "/",
    // Stops the body before it is buffered: on Content-Length, or at the first chunk over the cap.
    bodyLimit({
      maxSize: UPLOAD_BODY_LIMIT_BYTES,
      onError: () => {
        throw tooLarge();
      },
    }),
    async (c) => {
      let form: Record<string, unknown>;
      try {
        form = await c.req.parseBody();
      } catch {
        // A malformed multipart body makes parseBody throw a bare TypeError.
        throw new ApiError(400, "VALIDATION_ERROR", "Formulario no válido");
      }

      const file = form["file"];
      const parsed = documentInputSchema.safeParse({
        type: form["type"],
        name: form["name"],
        version: form["version"],
      });
      if (!parsed.success || !(file instanceof File)) {
        const details = parsed.success
          ? { formErrors: [], fieldErrors: {} as Record<string, string[]> }
          : z.flattenError(parsed.error);
        const fieldErrors: Record<string, string[] | undefined> = {
          ...details.fieldErrors,
        };
        if (!(file instanceof File)) fieldErrors["file"] = ["Elige un archivo"];
        throw new ApiError(400, "VALIDATION_ERROR", "Datos no válidos", {
          formErrors: details.formErrors,
          fieldErrors,
        });
      }

      if (file.size > DOCUMENT_MAX_BYTES) throw tooLarge();

      return c.json(
        await service.upload(parsed.data, {
          fileName: file.name,
          bytes: new Uint8Array(await file.arrayBuffer()),
        }),
        201,
      );
    },
  );

  routes.get("/", async (c) =>
    c.json(
      await service.list(
        documentQuerySchema.parse(queryInput(c.req.queries())),
      ),
    ),
  );

  routes.get("/:id", async (c) =>
    c.json(
      await service.get(
        parseObjectId(c.req.param("id"), "Documento no encontrado"),
      ),
    ),
  );

  routes.get("/:id/download", async (c) => {
    const { document, stream } = await service.open(
      parseObjectId(c.req.param("id"), "Documento no encontrado"),
    );
    // The stored name only reaches the header through contentDisposition (ASCII fallback + RFC 5987).
    return c.body(stream, 200, {
      "Content-Type": document.mimeType,
      "Content-Length": String(document.size),
      "Content-Disposition": contentDisposition(document.fileName),
    });
  });

  routes.delete("/:id", async (c) => {
    await service.remove(
      parseObjectId(c.req.param("id"), "Documento no encontrado"),
    );
    return c.body(null, 204);
  });

  return routes;
}
