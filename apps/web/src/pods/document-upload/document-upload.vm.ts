import type { DocumentType } from "@tfm/contracts";

// View models of the upload pod, declared field by field (never derived from a contracts type).

export interface UploadFormValues {
  type: DocumentType;
  file: File | null;
  name: string;
  version: string;
}

export type UploadFormField = keyof UploadFormValues;

export interface UploadedDocumentVm {
  id: string;
  type: DocumentType;
}

export interface UploadLiveMessage {
  kind: "loading" | "success" | "error" | "cancelled";
  message: string;
}
