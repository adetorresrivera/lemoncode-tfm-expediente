import type {
  ApplicationQuery,
  ApplicationStatus,
  ContractType,
  Interview,
  InterviewMode,
  InterviewOutcome,
  InterviewType,
  Seniority,
  TagGroup,
  WorkMode,
} from "@tfm/contracts";
import type { Db, ObjectId } from "mongodb";
import {
  buildApplicationsFilter,
  buildApplicationsSort,
} from "./applications.query.js";

// Stored tag: the contract Tag plus its normalized identity (tagKey(label)), never sent to the API.
export interface TagDoc {
  label: string;
  group: TagGroup;
  key: string;
}

export interface TagCount {
  label: string;
  group: TagGroup;
  count: number;
  key: string;
}

// BSON shape of the applications collection: ObjectId ids and Date instants.
// The contract (Application) is derived from it by applications.mapper.ts.
export interface ApplicationDoc {
  _id: ObjectId;
  title: string;
  company: string;
  location: string | null;
  workMode: WorkMode | null;
  seniority: Seniority | null;
  contractType: ContractType | null;
  salaryMin: number | null;
  salaryMax: number | null;
  currency: string | null;
  sourceUrl: string | null;
  offerText: string | null;
  notes: string | null;
  cvDocumentId: string | null;
  coverLetterDocumentId: string | null;
  tags: TagDoc[];
  status: ApplicationStatus;
  statusHistory: { status: ApplicationStatus; at: Date }[];
  appliedAt: Date | null;
  interviews: Interview[]; // [] on create; rounds are written by addInterview from Phase 4
  createdAt: Date;
  updatedAt: Date;
  ownerId: null;
}

export type NewApplicationDoc = Omit<ApplicationDoc, "_id">;

// Rule 3 (D-04) as data: a round created while the status is `from` moves it to `to`. The service
// owns the rule; the repository only evaluates it inside the same atomic write.
export interface InterviewStatusRule {
  from: ApplicationStatus;
  to: ApplicationStatus;
}

// The round to append. `round` null means "assign the highest stored round + 1".
export interface NewInterview {
  id: string;
  round: number | null;
  type: InterviewType;
  scheduledAt: string | null;
  mode: InterviewMode;
  notes: string | null;
  outcome: InterviewOutcome;
}

// The fields an edit may write on one round (D-05). `round` null means "keep the stored number":
// the key is left out of the `$set`. The element id is never written.
export interface InterviewChanges {
  round: number | null;
  type: InterviewType;
  scheduledAt: string | null;
  mode: InterviewMode;
  notes: string | null;
  outcome: InterviewOutcome;
}

// The only fields PUT may write (D-07, D-08). Status, history, interviews, ownership, creation
// instant are deliberately absent. The document links are editable (D-13): the service validates
// them and the form always sends the loaded values back.
export interface EditableFields {
  title: string;
  company: string;
  location: string | null;
  workMode: WorkMode | null;
  seniority: Seniority | null;
  contractType: ContractType | null;
  salaryMin: number | null;
  salaryMax: number | null;
  currency: string | null;
  tags: TagDoc[];
  sourceUrl: string | null;
  appliedAt: Date | null;
  notes: string | null;
  offerText: string | null;
  cvDocumentId: string | null;
  coverLetterDocumentId: string | null;
}

export interface ApplicationsRepository {
  insert(doc: NewApplicationDoc): Promise<ApplicationDoc>;
  list(query: ApplicationQuery): Promise<ApplicationDoc[]>;
  findById(id: ObjectId): Promise<ApplicationDoc | null>;
  tagSummaries(): Promise<TagCount[]>;
  // Null when the id is unknown OR the status is already `status` (nothing written).
  changeStatus(
    id: ObjectId,
    status: ApplicationStatus,
    now: Date,
  ): Promise<ApplicationDoc | null>;
  // True when one application was deleted. Only the applications collection is touched: stored
  // documents are never deleted or unlinked here (APP-03).
  deleteById(id: ObjectId): Promise<boolean>;
  // Null when the id is unknown (nothing is created). Writes only EditableFields and updatedAt.
  updateEditable(
    id: ObjectId,
    fields: EditableFields,
    now: Date,
  ): Promise<ApplicationDoc | null>;
  // Null when the id is unknown (nothing is created). Appends the round, applies the status rule
  // and sets updatedAt in one atomic write.
  addInterview(
    id: ObjectId,
    interview: NewInterview,
    rule: InterviewStatusRule,
    now: Date,
  ): Promise<ApplicationDoc | null>;
  // Null when the application or the round is unknown (nothing is created). Rewrites the editable
  // keys of that element only; status and history are never touched.
  updateInterview(
    id: ObjectId,
    interviewId: string,
    changes: InterviewChanges,
    now: Date,
  ): Promise<ApplicationDoc | null>;
  // Null when the application or the round is unknown. Pulls that element; the other rounds keep
  // their numbers (D-08).
  removeInterview(
    id: ObjectId,
    interviewId: string,
    now: Date,
  ): Promise<ApplicationDoc | null>;
}

export function createApplicationsRepository(db: Db): ApplicationsRepository {
  const collection = db.collection<ApplicationDoc>("applications");
  // The same collection typed without _id: insertOne then lets the driver generate it.
  const insertions = db.collection<NewApplicationDoc>("applications");

  return {
    async insert(doc) {
      const { insertedId } = await insertions.insertOne({ ...doc });
      return { ...doc, _id: insertedId };
    },
    // No limit or skip: the list is complete by design (D-10).
    async list(query) {
      return collection
        .find(buildApplicationsFilter(query))
        .sort(buildApplicationsSort(query.sort))
        .toArray();
    },
    async findById(id) {
      return collection.findOne({ _id: id });
    },
    // One atomic pipeline update guarded by `status: { $ne }`: the status, its history entry,
    // appliedAt and updatedAt change together or not at all, and concurrent identical moves write
    // one entry. appliedAt is only filled on a move to enviada while it is null or missing. No
    // insert-on-miss option: a deleted application is never recreated.
    async changeStatus(id, status, now) {
      return collection.findOneAndUpdate(
        { _id: id, status: { $ne: status } },
        [
          {
            $set: {
              status: { $literal: status },
              statusHistory: {
                $concatArrays: [
                  "$statusHistory",
                  [{ status: { $literal: status }, at: now }],
                ],
              },
              appliedAt:
                status === "enviada"
                  ? {
                      $cond: [
                        { $eq: [{ $ifNull: ["$appliedAt", null] }, null] },
                        now,
                        "$appliedAt",
                      ],
                    }
                  : "$appliedAt",
              updatedAt: now,
            },
          },
        ],
        { returnDocument: "after" },
      );
    },
    // Explicit $set of each editable key: the update document is never built from the request.
    // No insert-on-miss option: an unknown id is never created.
    async updateEditable(id, fields, now) {
      return collection.findOneAndUpdate(
        { _id: id },
        {
          $set: {
            title: fields.title,
            company: fields.company,
            location: fields.location,
            workMode: fields.workMode,
            seniority: fields.seniority,
            contractType: fields.contractType,
            salaryMin: fields.salaryMin,
            salaryMax: fields.salaryMax,
            currency: fields.currency,
            tags: fields.tags,
            sourceUrl: fields.sourceUrl,
            appliedAt: fields.appliedAt,
            notes: fields.notes,
            offerText: fields.offerText,
            cvDocumentId: fields.cvDocumentId,
            coverLetterDocumentId: fields.coverLetterDocumentId,
            updatedAt: now,
          },
        },
        { returnDocument: "after" },
      );
    },
    // One atomic pipeline update. Every expression of the `$set` stage reads the input document, so
    // the number (highest stored round + 1, capped at MAX_SAFE_INTEGER so it never leaves the
    // contract), the status test and the history all see the state before the write: two concurrent
    // creates get distinct numbers and at most one gets the status move. Every client value is a
    // `$literal` (a leading `$` would otherwise be evaluated). A document without `interviews` is
    // handled by `$ifNull`. No insert-on-miss option: a deleted application is never recreated.
    async addInterview(id, interview, rule, now) {
      const round =
        interview.round !== null
          ? { $literal: interview.round }
          : {
              $min: [
                {
                  $add: [
                    {
                      $ifNull: [
                        { $max: { $ifNull: ["$interviews.round", []] } },
                        0,
                      ],
                    },
                    1,
                  ],
                },
                Number.MAX_SAFE_INTEGER,
              ],
            };
      const moves = { $eq: ["$status", { $literal: rule.from }] };
      return collection.findOneAndUpdate(
        { _id: id },
        [
          {
            $set: {
              interviews: {
                $concatArrays: [
                  { $ifNull: ["$interviews", []] },
                  [
                    {
                      id: { $literal: interview.id },
                      round,
                      type: { $literal: interview.type },
                      scheduledAt: { $literal: interview.scheduledAt },
                      mode: { $literal: interview.mode },
                      notes: { $literal: interview.notes },
                      outcome: { $literal: interview.outcome },
                    },
                  ],
                ],
              },
              statusHistory: {
                $cond: [
                  moves,
                  {
                    $concatArrays: [
                      "$statusHistory",
                      [{ status: { $literal: rule.to }, at: now }],
                    ],
                  },
                  "$statusHistory",
                ],
              },
              status: { $cond: [moves, { $literal: rule.to }, "$status"] },
              updatedAt: now,
            },
          },
        ],
        { returnDocument: "after" },
      );
    },
    // Per-key `$set` through `arrayFilters` on the element id: the update is never built from the
    // request and the element id is never written. The filter requires the element, and there is no
    // insert-on-miss option, so a deleted round is never brought back. `round` is only written when
    // one is sent, so a body without it keeps the stored number.
    async updateInterview(id, interviewId, changes, now) {
      return collection.findOneAndUpdate(
        { _id: id, "interviews.id": interviewId },
        {
          $set: {
            "interviews.$[i].type": changes.type,
            "interviews.$[i].scheduledAt": changes.scheduledAt,
            "interviews.$[i].mode": changes.mode,
            "interviews.$[i].notes": changes.notes,
            "interviews.$[i].outcome": changes.outcome,
            ...(changes.round !== null
              ? { "interviews.$[i].round": changes.round }
              : {}),
            updatedAt: now,
          },
        },
        { arrayFilters: [{ "i.id": interviewId }], returnDocument: "after" },
      );
    },
    async removeInterview(id, interviewId, now) {
      return collection.findOneAndUpdate(
        { _id: id, "interviews.id": interviewId },
        {
          $pull: { interviews: { id: interviewId } },
          $set: { updatedAt: now },
        },
        { returnDocument: "after" },
      );
    },
    async deleteById(id) {
      const { deletedCount } = await collection.deleteOne({ _id: id });
      return deletedCount === 1;
    },
    // One row per (stored key, group). The key already merges case variants, so no server-side
    // lower-casing is needed (it would be ASCII-only). The label is the oldest application's.
    async tagSummaries() {
      return collection
        .aggregate<TagCount>([
          { $sort: { createdAt: 1, _id: 1 } },
          { $unwind: "$tags" },
          {
            $group: {
              _id: { key: "$tags.key", group: "$tags.group" },
              label: { $first: "$tags.label" },
              count: { $sum: 1 },
            },
          },
          {
            $project: {
              _id: 0,
              label: 1,
              group: "$_id.group",
              key: "$_id.key",
              count: 1,
            },
          },
        ])
        .toArray();
    },
  };
}
