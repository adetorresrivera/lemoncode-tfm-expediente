import {
  documentSchema,
  type Document,
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
