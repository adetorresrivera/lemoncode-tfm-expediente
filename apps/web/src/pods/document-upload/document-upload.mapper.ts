import {
  DOCUMENT_MAX_BYTES,
  documentInputSchema,
  type Document,
  type DocumentType,
} from "@tfm/contracts";
import { z } from "zod";
import { HttpError } from "@/core/http/http-client";
import type { UploadRequest } from "./api/api";
import type {
  UploadedDocumentVm,
  UploadFormField,
  UploadFormValues,
} from "./document-upload.vm";

export const NO_FILE_MESSAGE = "Elige un archivo PDF o DOCX.";
const UNSUPPORTED_MESSAGE = "Solo se admiten archivos PDF o DOCX.";
const TOO_LARGE_MESSAGE = "El archivo supera 5 MB.";
const NAME_REQUIRED_MESSAGE = "Escribe un nombre.";
const NAME_TOO_LONG_MESSAGE = "El nombre admite hasta 120 caracteres.";
const VERSION_REQUIRED_MESSAGE = "Escribe la versión.";
const VERSION_TOO_LONG_MESSAGE = "La versión admite hasta 40 caracteres.";
const FIELD_MESSAGE = "Revisa este campo.";
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

const NAME_MAX_CHARS = 120;

// The file name without its last extension, trimmed and cut to the name limit by code points.
export const nameFromFileName = (fileName: string): string =>
  Array.from(
    fileName
      .trim()
      .replace(/\.[^./\\]*$/, "")
      .trim(),
  )
    .slice(0, NAME_MAX_CHARS)
    .join("")
    .trim();

// Client-side check, advisory only: the server decides by the content of the file.
export const hasAllowedExtension = (fileName: string): boolean => {
  const lower = fileName.toLowerCase();
  return lower.endsWith(".pdf") || lower.endsWith(".docx");
};

// Client checks are UX only: the server stays the authority on type, size and fields. The text
// fields run through the contracts schema; the file rules are the extension and the size limit.
export const validateUploadForm = (
  values: UploadFormValues,
): { fields: FieldMessages } | undefined => {
  const fields: FieldMessages = {};

  const text = documentInputSchema.safeParse({
    type: values.type,
    name: values.name,
    version: values.version,
  });
  if (!text.success) {
    for (const issue of text.error.issues) {
      const tooLong = issue.code === "too_big";
      if (issue.path[0] === "name" && fields.name === undefined) {
        fields.name = tooLong ? NAME_TOO_LONG_MESSAGE : NAME_REQUIRED_MESSAGE;
      }
      if (issue.path[0] === "version" && fields.version === undefined) {
        fields.version = tooLong
          ? VERSION_TOO_LONG_MESSAGE
          : VERSION_REQUIRED_MESSAGE;
      }
    }
  }

  if (values.file === null) {
    fields.file = NO_FILE_MESSAGE;
  } else if (!hasAllowedExtension(values.file.name)) {
    fields.file = UNSUPPORTED_MESSAGE;
  } else if (values.file.size > DOCUMENT_MAX_BYTES) {
    fields.file = TOO_LARGE_MESSAGE;
  }

  return Object.keys(fields).length > 0 ? { fields } : undefined;
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

const serverDetailsSchema = z.object({
  fieldErrors: z.record(z.string(), z.array(z.string())),
});

const SERVER_FIELDS = ["file", "name", "version"] as const;

// Fixed copy per failure: the server's message text never reaches the dialog. A 400 carries
// `z.flattenError` details and only the field names are used.
export const mapUploadErrorToFeedback = (
  error: unknown,
): { fields: FieldMessages } | { message: string } => {
  if (!(error instanceof HttpError)) return { message: UPLOAD_ERROR_MESSAGE };
  if (error.code === "FILE_TOO_LARGE") {
    return { fields: { file: TOO_LARGE_MESSAGE } };
  }
  if (error.code === "UNSUPPORTED_FILE_TYPE") {
    return { fields: { file: UNSUPPORTED_MESSAGE } };
  }
  if (error.code === "NETWORK_ERROR") return { message: NETWORK_MESSAGE };
  if (error.status === 400) {
    const details = serverDetailsSchema.safeParse(error.details);
    if (details.success) {
      const fields: FieldMessages = {};
      for (const field of SERVER_FIELDS) {
        if (field in details.data.fieldErrors) {
          fields[field] = FIELD_MESSAGE;
        }
      }
      if (Object.keys(fields).length > 0) return { fields };
    }
  }
  return { message: UPLOAD_ERROR_MESSAGE };
};

export const mapUploadedDocumentFromApiToVm = (
  document: Document,
): UploadedDocumentVm => ({ id: document.id, type: document.type });
