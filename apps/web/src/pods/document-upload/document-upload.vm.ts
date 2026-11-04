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

// One entry of the picker: the document id and the line the select shows.
export interface DocumentOptionVm {
  id: string;
  label: string;
}

export interface DocumentOptionsState {
  status: "loading" | "ok" | "error";
  options: DocumentOptionVm[];
  retry: () => void;
}
