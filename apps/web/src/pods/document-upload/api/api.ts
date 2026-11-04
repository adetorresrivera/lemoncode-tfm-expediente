import {
  documentListItemSchema,
  documentSchema,
  type Document,
  type DocumentListItem,
  type DocumentType,
} from "@tfm/contracts";
import { request } from "@/core/http/http-client";

export interface UploadRequest {
  type: DocumentType;
  name: string;
  version: string;
  file: File;
}

// Multipart upload: the shared client sends a FormData as is, so the browser writes the boundary.
// The file is appended without an explicit file name: a File already carries its own.
export const uploadDocument = (
  input: UploadRequest,
  signal?: AbortSignal,
): Promise<Document> => {
  const body = new FormData();
  body.append("type", input.type);
  body.append("name", input.name);
  body.append("version", input.version);
  body.append("file", input.file);
  return request("/api/documents", documentSchema, {
    method: "POST",
    body,
    signal,
  });
};

// The library of one type, newest first (the server owns the order). The query string is built
// from the type only.
export const getDocuments = (
  type: DocumentType,
  signal?: AbortSignal,
): Promise<DocumentListItem[]> =>
  request(
    `/api/documents?${new URLSearchParams({ type })}`,
    documentListItemSchema.array(),
    { signal },
  );
