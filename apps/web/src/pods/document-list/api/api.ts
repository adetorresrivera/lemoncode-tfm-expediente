import {
  documentListItemSchema,
  type DocumentListItem,
  type DocumentType,
} from "@tfm/contracts";
import { z } from "zod";
import { request } from "@/core/http/http-client";

// The query string is built from the known key only, never from the search object.
export const getDocumentList = (
  type: DocumentType | undefined,
  signal?: AbortSignal,
): Promise<DocumentListItem[]> => {
  const params = new URLSearchParams();
  if (type !== undefined) params.set("type", type);
  const query = params.toString();
  return request(
    query === "" ? "/api/documents" : `/api/documents?${query}`,
    documentListItemSchema.array(),
    { signal },
  );
};

// The server answers 204 with no body; the client hands the schema an undefined payload.
export const deleteDocument = async (id: string): Promise<void> => {
  await request(`/api/documents/${encodeURIComponent(id)}`, z.undefined(), {
    method: "DELETE",
  });
};
