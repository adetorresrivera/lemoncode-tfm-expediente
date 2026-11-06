import { applicationSchema, type Interview } from "@tfm/contracts";
import { ObjectId } from "mongodb";
import { describe, expect, it } from "vitest";
import { mapApplicationDocToApi } from "./applications.mapper.js";
import type { ApplicationDoc } from "./applications.repository.js";

const ID = new ObjectId("66f1c0ffee00000000000001");

const doc = (overrides: Partial<ApplicationDoc> = {}): ApplicationDoc => ({
  _id: ID,
  title: "Frontend Developer",
  company: "Acme",
  location: "Madrid",
  workMode: "remoto",
  seniority: "senior",
  contractType: "indefinido",
  salaryMin: 45000,
  salaryMax: 55000,
  currency: "EUR",
  sourceUrl: "https://acme.test/jobs/1",
  offerText: "Oferta completa",
  notes: "Contacto: Marta",
  cvDocumentId: "d1",
  coverLetterDocumentId: "d2",
  tags: [
    { key: "react", label: "React", group: "stack" },
    { key: "graphql", label: "GraphQL", group: "nice_to_have" },
  ],
  status: "en_entrevistas",
  statusHistory: [
    { status: "guardada", at: new Date("2026-11-01T09:00:00.000Z") },
    { status: "enviada", at: new Date("2026-11-02T10:30:00.000Z") },
  ],
  appliedAt: new Date("2026-11-02T10:30:00.000Z"),
  interviews: [
    {
      id: "i1",
      round: 1,
      type: "rrhh",
      scheduledAt: "2026-11-04T09:00:00.000Z",
      mode: "online",
      notes: null,
      outcome: "superada",
    },
  ],
  createdAt: new Date("2026-11-01T09:00:00.000Z"),
  updatedAt: new Date("2026-11-05T08:15:00.000Z"),
  ownerId: null,
  ...overrides,
});

// A stored document can carry fields the contract does not name (the seed mark, internals).
const withExtraFields = (base: ApplicationDoc): ApplicationDoc =>
  ({ ...base, seed: true, _internal: 1 }) as unknown as ApplicationDoc;

describe("mapApplicationDocToApi", () => {
  it("exposes the ObjectId as a 24-hex string id and never as _id", () => {
    const api = mapApplicationDocToApi(doc());
    expect(api.id).toBe("66f1c0ffee00000000000001");
    expect(api.id).toMatch(/^[0-9a-f]{24}$/);
    expect("_id" in api).toBe(false);
  });

  it("writes every date as an ISO 8601 UTC string", () => {
    const api = mapApplicationDocToApi(doc());
    expect(api.createdAt).toBe("2026-11-01T09:00:00.000Z");
    expect(api.updatedAt).toBe("2026-11-05T08:15:00.000Z");
    expect(api.appliedAt).toBe("2026-11-02T10:30:00.000Z");
    expect(api.statusHistory).toEqual([
      { status: "guardada", at: "2026-11-01T09:00:00.000Z" },
      { status: "enviada", at: "2026-11-02T10:30:00.000Z" },
    ]);
  });

  it("keeps null optional fields as null", () => {
    const api = mapApplicationDocToApi(
      doc({
        location: null,
        workMode: null,
        seniority: null,
        contractType: null,
        salaryMin: null,
        salaryMax: null,
        currency: null,
        sourceUrl: null,
        offerText: null,
        notes: null,
        cvDocumentId: null,
        coverLetterDocumentId: null,
        appliedAt: null,
      }),
    );
    expect(api).toMatchObject({
      location: null,
      workMode: null,
      seniority: null,
      contractType: null,
      salaryMin: null,
      salaryMax: null,
      currency: null,
      sourceUrl: null,
      offerText: null,
      notes: null,
      cvDocumentId: null,
      coverLetterDocumentId: null,
      appliedAt: null,
      ownerId: null,
    });
  });

  it("reads a document written without appliedAt as null", () => {
    const legacy = doc();
    Reflect.deleteProperty(legacy, "appliedAt");
    expect(mapApplicationDocToApi(legacy).appliedAt).toBeNull();
  });

  it("exposes only the label and group of a tag, not its stored key", () => {
    expect(mapApplicationDocToApi(doc()).tags).toEqual([
      { label: "React", group: "stack" },
      { label: "GraphQL", group: "nice_to_have" },
    ]);
  });

  it("drops stored fields outside the whitelist, including the seed mark", () => {
    const api = mapApplicationDocToApi(withExtraFields(doc()));
    expect("seed" in api).toBe(false);
    expect("_internal" in api).toBe(false);
    expect(Object.keys(api).sort()).toEqual(
      Object.keys(applicationSchema.shape).sort(),
    );
  });

  it("drops stored fields outside the whitelist inside an interview", () => {
    const stored = {
      ...doc().interviews[0],
      seed: true,
      _internal: 1,
    } as unknown as Interview;
    const api = mapApplicationDocToApi(doc({ interviews: [stored] }));
    expect(api.interviews).toEqual([doc().interviews[0]]);
  });

  it("produces output that passes the application contract", () => {
    expect(() =>
      applicationSchema.parse(mapApplicationDocToApi(withExtraFields(doc()))),
    ).not.toThrow();
  });
});
