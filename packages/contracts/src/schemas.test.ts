import { describe, expect, it } from "vitest";
import {
  DOCUMENT_MAX_BYTES,
  TERMINAL_STATUSES,
  applicationStatusSchema,
  contractTypeSchema,
  documentInputSchema,
  documentSchema,
  documentTypeSchema,
  interviewInputSchema,
  interviewModeSchema,
  interviewOutcomeSchema,
  interviewTypeSchema,
  offerExtractRequestSchema,
  offerExtractionSchema,
  senioritySchema,
  tagGroupSchema,
  tagSchema,
  tagSummarySchema,
  workModeSchema,
} from "./index.js";

describe("enums keep the docs/DOMAIN.md order", () => {
  it("applicationStatusSchema", () => {
    expect(applicationStatusSchema.options).toEqual([
      "guardada",
      "enviada",
      "en_entrevistas",
      "oferta_recibida",
      "aceptada",
      "rechazada",
      "descartada",
    ]);
  });

  it("the remaining enums", () => {
    expect(workModeSchema.options).toEqual(["remoto", "hibrido", "presencial"]);
    expect(senioritySchema.options).toEqual([
      "junior",
      "mid",
      "senior",
      "lead",
    ]);
    expect(contractTypeSchema.options).toEqual([
      "indefinido",
      "temporal",
      "freelance",
      "practicas",
      "otro",
    ]);
    expect(tagGroupSchema.options).toEqual([
      "stack",
      "nice_to_have",
      "language",
    ]);
    expect(interviewTypeSchema.options).toEqual([
      "rrhh",
      "tecnica",
      "prueba_tecnica",
      "manager",
      "cultural",
      "otra",
    ]);
    expect(interviewModeSchema.options).toEqual([
      "online",
      "presencial",
      "telefono",
    ]);
    expect(interviewOutcomeSchema.options).toEqual([
      "pendiente",
      "superada",
      "no_superada",
    ]);
    expect(documentTypeSchema.options).toEqual(["cv", "carta"]);
  });

  it("TERMINAL_STATUSES lists the three terminal states", () => {
    expect(TERMINAL_STATUSES).toEqual(["aceptada", "rechazada", "descartada"]);
  });
});

describe("tagSchema", () => {
  it("trims the label", () => {
    const parsed = tagSchema.parse({ label: "  React  ", group: "stack" });
    expect(parsed.label).toBe("React");
  });

  it("rejects an empty label and accepts 40 characters, rejects 41", () => {
    expect(tagSchema.safeParse({ label: "", group: "stack" }).success).toBe(
      false,
    );
    expect(
      tagSchema.safeParse({ label: "a".repeat(40), group: "stack" }).success,
    ).toBe(true);
    expect(
      tagSchema.safeParse({ label: "a".repeat(41), group: "stack" }).success,
    ).toBe(false);
  });

  it("rejects an unknown group", () => {
    expect(tagSchema.safeParse({ label: "x", group: "other" }).success).toBe(
      false,
    );
  });

  it("tagSummarySchema requires a non-negative integer count", () => {
    const base = { label: "React", group: "stack" };
    expect(tagSummarySchema.safeParse({ ...base, count: 0 }).success).toBe(
      true,
    );
    expect(tagSummarySchema.safeParse({ ...base, count: -1 }).success).toBe(
      false,
    );
    expect(tagSummarySchema.safeParse({ ...base, count: 1.5 }).success).toBe(
      false,
    );
  });
});

describe("interviewInputSchema", () => {
  const base = { type: "tecnica", mode: "online" };

  it("fills defaults and leaves round undefined", () => {
    const parsed = interviewInputSchema.parse(base);
    expect(parsed.outcome).toBe("pendiente");
    expect(parsed.notes).toBeNull();
    expect(parsed.scheduledAt).toBeNull();
    expect(parsed.round).toBeUndefined();
  });

  it("rejects round 0", () => {
    const result = interviewInputSchema.safeParse({ ...base, round: 0 });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["round"]);
  });

  it("accepts a UTC scheduledAt and rejects an offset one", () => {
    expect(
      interviewInputSchema.safeParse({
        ...base,
        scheduledAt: "2026-11-03T10:00:00Z",
      }).success,
    ).toBe(true);
    expect(
      interviewInputSchema.safeParse({
        ...base,
        scheduledAt: "2026-11-03T10:00:00+02:00",
      }).success,
    ).toBe(false);
  });
});

describe("document schemas", () => {
  const doc = {
    id: "d1",
    type: "cv",
    name: "CV Frontend",
    version: "v3",
    s3Key: "documents/d1/cv.pdf",
    mimeType: "application/pdf",
    size: 1024,
    createdAt: "2026-10-29T10:00:00Z",
  };

  it("DOCUMENT_MAX_BYTES is 5 MiB", () => {
    expect(DOCUMENT_MAX_BYTES).toBe(5242880);
  });

  it("documentInputSchema rejects an empty name", () => {
    expect(
      documentInputSchema.safeParse({ type: "cv", name: "", version: "v1" })
        .success,
    ).toBe(false);
  });

  it("documentSchema accepts a valid document", () => {
    expect(documentSchema.safeParse(doc).success).toBe(true);
  });

  it("documentSchema rejects text/plain", () => {
    expect(
      documentSchema.safeParse({ ...doc, mimeType: "text/plain" }).success,
    ).toBe(false);
  });

  it("documentSchema accepts 5242880 bytes and rejects 5242881", () => {
    expect(documentSchema.safeParse({ ...doc, size: 5242880 }).success).toBe(
      true,
    );
    expect(documentSchema.safeParse({ ...doc, size: 5242881 }).success).toBe(
      false,
    );
  });
});

describe("offer extraction", () => {
  const full = {
    title: "Frontend",
    company: "Acme",
    location: "Madrid",
    workMode: "remoto",
    seniority: "senior",
    contractType: "indefinido",
    salaryMin: 40000,
    salaryMax: 50000,
    currency: "EUR",
    tags: [{ label: "React", group: "stack" }],
  };
  const empty = {
    title: null,
    company: null,
    location: null,
    workMode: null,
    seniority: null,
    contractType: null,
    salaryMin: null,
    salaryMax: null,
    currency: null,
    tags: [],
  };

  it("accepts a full sample and an all-null sample", () => {
    expect(offerExtractionSchema.safeParse(full).success).toBe(true);
    expect(offerExtractionSchema.safeParse(empty).success).toBe(true);
  });

  it("rejects currency EURO and 21 tags", () => {
    expect(
      offerExtractionSchema.safeParse({ ...full, currency: "EURO" }).success,
    ).toBe(false);
    const tags = Array.from({ length: 21 }, (_, i) => ({
      label: `t${i}`,
      group: "stack",
    }));
    expect(offerExtractionSchema.safeParse({ ...full, tags }).success).toBe(
      false,
    );
  });

  it("offerExtractRequestSchema bounds text to 50..20000", () => {
    expect(
      offerExtractRequestSchema.safeParse({ text: "a".repeat(49) }).success,
    ).toBe(false);
    expect(
      offerExtractRequestSchema.safeParse({ text: "a".repeat(50) }).success,
    ).toBe(true);
    expect(
      offerExtractRequestSchema.safeParse({ text: "a".repeat(20000) }).success,
    ).toBe(true);
    expect(
      offerExtractRequestSchema.safeParse({ text: "a".repeat(20001) }).success,
    ).toBe(false);
  });
});
