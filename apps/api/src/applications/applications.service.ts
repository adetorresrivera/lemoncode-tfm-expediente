import {
  normalizeTags,
  tagGroupSchema,
  tagKey,
  type Application,
  type ApplicationQuery,
  type ApplicationInput,
  type ApplicationStatus,
  type DocumentType,
  type InterviewInput,
  type TagSummary,
} from "@tfm/contracts";
import { ObjectId } from "mongodb";
import { ApiError } from "../errors.js";
import { mapApplicationDocToApi } from "./applications.mapper.js";
import type {
  ApplicationsRepository,
  EditableFields,
  InterviewChanges,
  InterviewStatusRule,
  NewApplicationDoc,
  NewInterview,
} from "./applications.repository.js";

export interface ApplicationsService {
  list(query: ApplicationQuery): Promise<Application[]>;
  get(id: ObjectId): Promise<Application>;
  create(input: ApplicationInput): Promise<Application>;
  listTags(): Promise<TagSummary[]>;
  update(id: ObjectId, input: ApplicationInput): Promise<Application>;
  changeStatus(id: ObjectId, status: ApplicationStatus): Promise<Application>;
  remove(id: ObjectId): Promise<void>;
  addInterview(id: ObjectId, input: InterviewInput): Promise<Application>;
  updateInterview(
    id: ObjectId,
    interviewId: string,
    input: InterviewInput,
  ): Promise<Application>;
  removeInterview(id: ObjectId, interviewId: string): Promise<Application>;
}

// Rule 3 (D-04): a round created while the application is `enviada` moves it to `en_entrevistas`.
// The rule lives here; the repository applies it inside the same atomic write.
export const INTERVIEW_STATUS_RULE: InterviewStatusRule = {
  from: "enviada",
  to: "en_entrevistas",
};

// Read-only lookup of document types by id (ids that are not documents are absent from the map).
// The applications service receives this function instead of the documents service, so it can do
// nothing with documents but read their type.
export type DocumentTypeLookup = (
  ids: readonly string[],
) => Promise<Map<string, DocumentType>>;

// Copies the editable keys one by one (no rest, no spread): status, statusHistory, interviews,
// ownerId and createdAt in the input can never reach Mongo. offerText and the document links are
// written as sent (null clears them), so the edit form always sends the loaded values back. The
// links are validated by `validateDocumentLinks` before this runs.
function toEditableFields(input: ApplicationInput): EditableFields {
  return {
    title: input.title,
    company: input.company,
    location: input.location,
    workMode: input.workMode,
    seniority: input.seniority,
    contractType: input.contractType,
    salaryMin: input.salaryMin,
    salaryMax: input.salaryMax,
    currency: input.currency,
    tags: normalizeTags(input.tags).map((tag) => ({
      ...tag,
      key: tagKey(tag.label),
    })),
    sourceUrl: input.sourceUrl,
    appliedAt: input.appliedAt !== null ? new Date(input.appliedAt) : null,
    notes: input.notes,
    offerText: input.offerText,
    cvDocumentId: input.cvDocumentId,
    coverLetterDocumentId: input.coverLetterDocumentId,
  };
}

export function createApplicationsService(
  repository: ApplicationsRepository,
  findDocumentTypes: DocumentTypeLookup,
  now: () => Date = () => new Date(),
): ApplicationsService {
  // D-12: a link must point to an existing document of the right type. Errors are reported per
  // field in the same shape as the global ZodError mapping, so the form shows them on the field.
  async function validateDocumentLinks(input: ApplicationInput): Promise<void> {
    const ids = [input.cvDocumentId, input.coverLetterDocumentId].filter(
      (id): id is string => id !== null,
    );
    if (ids.length === 0) return;
    const types = await findDocumentTypes(ids);
    const fieldErrors: Record<string, string[]> = {};
    const check = (
      field: "cvDocumentId" | "coverLetterDocumentId",
      expected: DocumentType,
      wrongType: string,
    ): void => {
      const id = input[field];
      if (id === null) return;
      const type = types.get(id);
      if (type === undefined) fieldErrors[field] = ["El documento no existe"];
      else if (type !== expected) fieldErrors[field] = [wrongType];
    };
    check("cvDocumentId", "cv", "El documento no es un CV");
    check(
      "coverLetterDocumentId",
      "carta",
      "El documento no es una carta de presentación",
    );
    if (Object.keys(fieldErrors).length > 0) {
      throw new ApiError(400, "VALIDATION_ERROR", "Datos no válidos", {
        formErrors: [],
        fieldErrors,
      });
    }
  }

  async function get(id: ObjectId): Promise<Application> {
    const doc = await repository.findById(id);
    if (doc === null) {
      throw new ApiError(404, "NOT_FOUND", "Candidatura no encontrada");
    }
    return mapApplicationDocToApi(doc);
  }

  // Null from the repository means the application or the round is missing: `get` throws the
  // application message when the application is gone, otherwise the round is the missing one.
  async function interviewMissing(id: ObjectId): Promise<never> {
    await get(id);
    throw new ApiError(404, "NOT_FOUND", "Ronda no encontrada");
  }

  return {
    async list(query) {
      const docs = await repository.list(query);
      return docs.map(mapApplicationDocToApi);
    },

    get,

    async create(input) {
      await validateDocumentLinks(input);
      const at = now();
      // Built field by field (no spread): id, createdAt, statusHistory, interviews and ownerId
      // sent by the client can never reach Mongo.
      const doc: NewApplicationDoc = {
        title: input.title,
        company: input.company,
        location: input.location,
        workMode: input.workMode,
        seniority: input.seniority,
        contractType: input.contractType,
        salaryMin: input.salaryMin,
        salaryMax: input.salaryMax,
        currency: input.currency,
        sourceUrl: input.sourceUrl,
        offerText: input.offerText,
        notes: input.notes,
        cvDocumentId: input.cvDocumentId,
        coverLetterDocumentId: input.coverLetterDocumentId,
        // D-09: the service is the source of truth for normalization; the key is stored.
        tags: normalizeTags(input.tags).map((tag) => ({
          ...tag,
          key: tagKey(tag.label),
        })),
        status: input.status,
        statusHistory: [{ status: input.status, at }],
        appliedAt:
          input.appliedAt !== null
            ? new Date(input.appliedAt)
            : input.status === "enviada"
              ? at
              : null,
        interviews: [],
        createdAt: at,
        updatedAt: at,
        ownerId: null,
      };
      return mapApplicationDocToApi(await repository.insert(doc));
    },

    async update(id, input) {
      await validateDocumentLinks(input);
      const doc = await repository.updateEditable(
        id,
        toEditableFields(input),
        now(),
      );
      if (doc === null) {
        throw new ApiError(404, "NOT_FOUND", "Candidatura no encontrada");
      }
      return mapApplicationDocToApi(doc);
    },

    async changeStatus(id, status) {
      const doc = await repository.changeStatus(id, status, now());
      if (doc !== null) return mapApplicationDocToApi(doc);
      // Null means unknown id or already in that status: the second case is an idempotent 200.
      return get(id);
    },

    async remove(id) {
      if (!(await repository.deleteById(id))) {
        throw new ApiError(404, "NOT_FOUND", "Candidatura no encontrada");
      }
    },

    async addInterview(id, input) {
      const at = now();
      // Built field by field (no spread): an id, status, statusHistory or interviews key sent by
      // the client can never reach Mongo. The id is server-generated (D-02) and the date is stored
      // as the same instant with millisecond precision.
      const interview: NewInterview = {
        id: new ObjectId().toString(),
        round: input.round ?? null,
        type: input.type,
        scheduledAt:
          input.scheduledAt !== null
            ? new Date(input.scheduledAt).toISOString()
            : null,
        mode: input.mode,
        notes: input.notes,
        outcome: input.outcome,
      };
      const doc = await repository.addInterview(
        id,
        interview,
        INTERVIEW_STATUS_RULE,
        at,
      );
      if (doc === null) {
        throw new ApiError(404, "NOT_FOUND", "Candidatura no encontrada");
      }
      return mapApplicationDocToApi(doc);
    },

    async updateInterview(id, interviewId, input) {
      // Field by field (no spread): the element id and anything else in the body can never reach
      // Mongo. No status rule is involved (D-04).
      const changes: InterviewChanges = {
        round: input.round ?? null,
        type: input.type,
        scheduledAt:
          input.scheduledAt !== null
            ? new Date(input.scheduledAt).toISOString()
            : null,
        mode: input.mode,
        notes: input.notes,
        outcome: input.outcome,
      };
      const doc = await repository.updateInterview(
        id,
        interviewId,
        changes,
        now(),
      );
      if (doc === null) return interviewMissing(id);
      return mapApplicationDocToApi(doc);
    },

    async removeInterview(id, interviewId) {
      const doc = await repository.removeInterview(id, interviewId, now());
      if (doc === null) return interviewMissing(id);
      return mapApplicationDocToApi(doc);
    },

    async listTags() {
      const rows = await repository.tagSummaries();
      const groupOrder = (group: TagSummary["group"]): number =>
        tagGroupSchema.options.indexOf(group);
      return rows
        .map(({ label, group, count }) => ({ label, group, count }))
        .sort(
          (a, b) =>
            b.count - a.count ||
            a.label.localeCompare(b.label, "es") ||
            groupOrder(a.group) - groupOrder(b.group),
        );
    },
  };
}
