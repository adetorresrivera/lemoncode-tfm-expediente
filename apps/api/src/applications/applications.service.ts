import {
  normalizeTags,
  tagGroupSchema,
  tagKey,
  type Application,
  type ApplicationQuery,
  type ApplicationInput,
  type ApplicationStatus,
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

// Copies the editable keys one by one (no rest, no spread): status, statusHistory, interviews,
// ownerId, createdAt and the document links in the input can never reach Mongo. offerText is
// written as sent (null clears it), so the edit form always sends the loaded value back.
// Phase 5 (cvDocumentId, coverLetterDocumentId) must add its fields here and make the form
// always send them, otherwise a save would wipe them.
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
  };
}

export function createApplicationsService(
  repository: ApplicationsRepository,
  now: () => Date = () => new Date(),
): ApplicationsService {
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
