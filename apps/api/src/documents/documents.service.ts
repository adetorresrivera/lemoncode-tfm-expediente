import type {
  Document,
  DocumentInput,
  DocumentListItem,
  DocumentQuery,
} from "@tfm/contracts";
import { ObjectId } from "mongodb";
import { ApiError } from "../errors.js";
import type { DocumentStorage } from "../storage/s3.js";
import {
  mapDocumentDocToApi,
  mapDocumentDocToListItem,
} from "./documents.mapper.js";
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

export interface OpenedDocument {
  document: Document;
  stream: ReadableStream<Uint8Array>;
}

export interface DocumentsService {
  upload(input: DocumentInput, file: UploadedFile): Promise<Document>;
  list(query: DocumentQuery): Promise<DocumentListItem[]>;
  get(id: ObjectId): Promise<Document>;
  open(id: ObjectId): Promise<OpenedDocument>;
  remove(id: ObjectId): Promise<void>;
}

const documentNotFound = (): ApiError =>
  new ApiError(404, "NOT_FOUND", "Documento no encontrado");

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

    async list(query) {
      const [docs, counts] = await Promise.all([
        repository.list(query.type),
        repository.usageCounts(),
      ]);
      return docs.map((doc) =>
        mapDocumentDocToListItem(doc, counts.get(doc._id.toHexString()) ?? 0),
      );
    },

    async get(id) {
      const doc = await repository.findById(id);
      if (doc === null) throw documentNotFound();
      return mapDocumentDocToApi(doc);
    },

    async open(id) {
      const doc = await repository.findById(id);
      if (doc === null) throw documentNotFound();
      // The record can outlive its object (deleted from outside, or a concurrent delete).
      const stored = await storage.get(doc.s3Key);
      if (stored === null) {
        throw new ApiError(404, "NOT_FOUND", "Archivo no encontrado");
      }
      return { document: mapDocumentDocToApi(doc), stream: stored.stream };
    },

    async remove(id) {
      const doc = await repository.findById(id);
      if (doc === null) throw documentNotFound();
      if (await repository.isInUse(id)) {
        throw new ApiError(
          409,
          "DOCUMENT_IN_USE",
          "Este documento está vinculado a alguna candidatura. Desvincúlalo antes de eliminarlo.",
        );
      }
      if (!(await repository.deleteById(id))) throw documentNotFound();
      // The record goes first: an orphan object is invisible and harmless, a record pointing to a
      // missing object is not (D-11). Deleting is idempotent and nothing is logged, so no key leaks.
      await storage.delete(doc.s3Key).catch(() => undefined);
    },
  };
}
