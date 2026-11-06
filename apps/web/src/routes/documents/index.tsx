import { createFileRoute } from "@tanstack/react-router";
import { documentQuerySchema } from "@tfm/contracts";
import { z } from "zod";
import { DocumentListScene } from "@/scenes/document-list.scene";

// Lenient like the application list: a bad `?type=` degrades to «Todos» instead of an error page.
export const Route = createFileRoute("/documents/")({
  validateSearch: z.object({
    type: documentQuerySchema.shape.type.catch(undefined),
  }),
  component: DocumentListScene,
});
