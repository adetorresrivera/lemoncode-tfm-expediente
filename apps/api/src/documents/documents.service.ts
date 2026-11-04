import type { Document, DocumentInput } from "@tfm/contracts";
import { ObjectId } from "mongodb";
import { ApiError } from "../errors.js";
import type { DocumentStorage } from "../storage/s3.js";
import { mapDocumentDocToApi } from "./documents.mapper.js";
import type {
  DocumentDoc,
  DocumentsRepository,
} from "./documents.repository.js";
import { buildS3Key, sanitizeFileName } from "./file-name.js";
import { detectDocument } from "./file-type.js";

export interface UploadedFile {
  fileName: string;
  bytes: Uint8Array;
}

export interface DocumentsService {
  upload(input: DocumentInput, file: UploadedFile): Promise<Document>;
}

// No logging in this module: file names, bytes and keys must never reach the logs.
export function createDocumentsService(
  repository: DocumentsRepository,
  storage: DocumentStorage,
  now: () => Date = () => new Date(),
): DocumentsService {
  return {
    async upload(input, file) {
      const fileName = sanitizeFileName(file.fileName);
      if (fileName === null) {
        throw new ApiError(400, "VALIDATION_ERROR", "Datos no válidos", {
          formErrors: [],
          fieldErrors: { file: ["Nombre de archivo no válido"] },
        });
      }

      const detected = detectDocument(file.bytes, fileName);
      if (detected === null) {
        throw new ApiError(
          415,
          "UNSUPPORTED_FILE_TYPE",
          "Solo se admiten archivos PDF o DOCX.",
        );
      }

      const id = new ObjectId();
      const s3Key = buildS3Key(id.toHexString(), fileName, detected.ext);
      await storage.put(s3Key, file.bytes, detected.mimeType);

      // Field by field: nothing the client sent beyond type, name and version reaches Mongo.
      const doc: DocumentDoc = {
        _id: id,
        type: input.type,
        name: input.name,
        version: input.version,
        fileName,
        s3Key,
        mimeType: detected.mimeType,
        size: file.bytes.byteLength,
        createdAt: now(),
      };

      try {
        return mapDocumentDocToApi(await repository.insert(doc));
      } catch (err) {
        // D-04: no orphan object. A failing delete never replaces the insert error.
        await storage.delete(s3Key).catch(() => undefined);
        throw err;
      }
    },
  };
}
