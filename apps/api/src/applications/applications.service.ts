import {
  normalizeTags,
  tagGroupSchema,
  tagKey,
  type Application,
  type ApplicationQuery,
  type ApplicationInput,
  type TagSummary,
} from "@tfm/contracts";
import type { ObjectId } from "mongodb";
import { ApiError } from "../errors.js";
import { mapApplicationDocToApi } from "./applications.mapper.js";
import type {
  ApplicationsRepository,
  NewApplicationDoc,
} from "./applications.repository.js";

export interface ApplicationsService {
  list(query: ApplicationQuery): Promise<Application[]>;
  get(id: ObjectId): Promise<Application>;
  create(input: ApplicationInput): Promise<Application>;
  listTags(): Promise<TagSummary[]>;
}

export function createApplicationsService(
  repository: ApplicationsRepository,
  now: () => Date = () => new Date(),
): ApplicationsService {
  return {
    async list(query) {
      const docs = await repository.list(query);
      return docs.map(mapApplicationDocToApi);
    },

    async get(id) {
      const doc = await repository.findById(id);
      if (doc === null) {
        throw new ApiError(404, "NOT_FOUND", "Candidatura no encontrada");
      }
      return mapApplicationDocToApi(doc);
    },

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
