import type { Document, DocumentType } from "@tfm/contracts";
import { HttpError } from "@/core/http/http-client";
import type { UploadRequest } from "./api/api";
import type {
  UploadedDocumentVm,
  UploadFormField,
  UploadFormValues,
} from "./document-upload.vm";

export const NO_FILE_MESSAGE = "Elige un archivo PDF o DOCX.";
export const NETWORK_MESSAGE =
  "No se pudo conectar con el servidor. Comprueba tu conexión e inténtalo de nuevo.";
export const UPLOAD_ERROR_MESSAGE =
  "No se pudo subir el documento. Inténtalo de nuevo.";

export type FieldMessages = Partial<Record<UploadFormField, string>>;

export const newUploadFormValues = (type: DocumentType): UploadFormValues => ({
  type,
  file: null,
  name: "",
  version: "",
});

// The file name without its last extension, trimmed.
export const nameFromFileName = (fileName: string): string =>
  fileName
    .trim()
    .replace(/\.[^./\\]*$/, "")
    .trim();

// Client-side check, advisory only: the server decides by the content of the file.
export const hasAllowedExtension = (fileName: string): boolean => {
  const lower = fileName.toLowerCase();
  return lower.endsWith(".pdf") || lower.endsWith(".docx");
};

export const validateUploadForm = (
  values: UploadFormValues,
): { fields: FieldMessages } | undefined => {
  if (values.file === null) return { fields: { file: NO_FILE_MESSAGE } };
  return undefined;
};

export const mapUploadFormToRequest = (
  values: UploadFormValues,
): UploadRequest | null => {
  if (values.file === null) return null;
  return {
    type: values.type,
    name: values.name.trim(),
    version: values.version.trim(),
    file: values.file,
  };
};

// Fixed copy per failure: the server's message text never reaches the dialog.
export const mapUploadErrorToFeedback = (
  error: unknown,
): { fields: FieldMessages } | { message: string } => {
  if (error instanceof HttpError && error.code === "NETWORK_ERROR") {
    return { message: NETWORK_MESSAGE };
  }
  return { message: UPLOAD_ERROR_MESSAGE };
};

export const mapUploadedDocumentFromApiToVm = (
  document: Document,
): UploadedDocumentVm => ({ id: document.id, type: document.type });
