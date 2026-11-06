import { documentListItemSchema, documentSchema } from "@tfm/contracts";
import { ObjectId } from "mongodb";
import { describe, expect, it } from "vitest";
import {
  mapDocumentDocToApi,
  mapDocumentDocToListItem,
} from "./documents.mapper.js";
import type { DocumentDoc } from "./documents.repository.js";

const ID = new ObjectId("66f1c0ffee00000000000002");

const doc = (overrides: Partial<DocumentDoc> = {}): DocumentDoc => ({
  _id: ID,
  type: "cv",
  name: "CV Frontend",
  version: "v3",
  fileName: "cv-frontend.pdf",
  s3Key: "documents/66f1c0ffee00000000000002.pdf",
  mimeType: "application/pdf",
  size: 235520,
  createdAt: new Date("2026-10-12T09:30:00.000Z"),
  ...overrides,
});

// A stored document can carry fields the contract does not name (the seed mark, internals).
const withExtraFields = (base: DocumentDoc): DocumentDoc =>
  ({ ...base, seed: true, _internal: 1 }) as unknown as DocumentDoc;

describe("mapDocumentDocToApi", () => {
  it("exposes the ObjectId as a 24-hex string id and never as _id", () => {
    const api = mapDocumentDocToApi(doc());
    expect(api.id).toBe("66f1c0ffee00000000000002");
    expect(api.id).toMatch(/^[0-9a-f]{24}$/);
    expect("_id" in api).toBe(false);
  });

  it("writes the upload date as an ISO 8601 UTC string", () => {
    expect(mapDocumentDocToApi(doc()).createdAt).toBe(
      "2026-10-12T09:30:00.000Z",
    );
  });

  it("maps the stored fields the contract names", () => {
    expect(mapDocumentDocToApi(doc())).toEqual({
      id: "66f1c0ffee00000000000002",
      type: "cv",
      name: "CV Frontend",
      version: "v3",
      fileName: "cv-frontend.pdf",
      s3Key: "documents/66f1c0ffee00000000000002.pdf",
      mimeType: "application/pdf",
      size: 235520,
      createdAt: "2026-10-12T09:30:00.000Z",
    });
  });

  it("drops stored fields outside the whitelist, including the seed mark", () => {
    const api = mapDocumentDocToApi(withExtraFields(doc()));
    expect("seed" in api).toBe(false);
    expect("_internal" in api).toBe(false);
    expect(Object.keys(api).sort()).toEqual(
      Object.keys(documentSchema.shape).sort(),
    );
  });

  it("produces output that passes the document contract", () => {
    expect(() =>
      documentSchema.parse(mapDocumentDocToApi(withExtraFields(doc()))),
    ).not.toThrow();
  });
});

describe("mapDocumentDocToListItem", () => {
  it("copies the usedBy count next to the document fields", () => {
    const item = mapDocumentDocToListItem(doc(), 3);
    expect(item.usedBy).toBe(3);
    expect(item).toEqual({ ...mapDocumentDocToApi(doc()), usedBy: 3 });
  });

  it("exposes a string id, an ISO date and no _id", () => {
    const item = mapDocumentDocToListItem(doc(), 0);
    expect(item.id).toMatch(/^[0-9a-f]{24}$/);
    expect(item.createdAt).toBe("2026-10-12T09:30:00.000Z");
    expect("_id" in item).toBe(false);
  });

  it("drops stored fields outside the whitelist, including the seed mark", () => {
    const item = mapDocumentDocToListItem(withExtraFields(doc()), 1);
    expect("seed" in item).toBe(false);
    expect("_internal" in item).toBe(false);
    expect(Object.keys(item).sort()).toEqual(
      Object.keys(documentListItemSchema.shape).sort(),
    );
  });

  it("produces output that passes the list item contract", () => {
    expect(() =>
      documentListItemSchema.parse(
        mapDocumentDocToListItem(withExtraFields(doc()), 2),
      ),
    ).not.toThrow();
  });
});
