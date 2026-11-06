import type { Application, TagSummary } from "@tfm/contracts";
import { describe, expect, it } from "vitest";
import {
  mapApplicationFromApiToVm,
  mapApplicationListFromApiToVm,
  mapStackTagsFromApiToVm,
} from "./application-list.mapper";

const application = (overrides: Partial<Application> = {}): Application => ({
  id: "a1",
  title: "Frontend Developer",
  company: "Acme",
  location: "Madrid",
  workMode: "remoto",
  seniority: "senior",
  contractType: "indefinido",
  salaryMin: 45000,
  salaryMax: 55000,
  currency: "EUR",
  tags: [],
  sourceUrl: null,
  offerText: null,
  appliedAt: null,
  notes: null,
  cvDocumentId: null,
  coverLetterDocumentId: null,
  status: "enviada",
  statusHistory: [],
  interviews: [],
  createdAt: "2026-11-01T12:00:00.000Z",
  updatedAt: "2026-11-05T12:00:00.000Z",
  ownerId: null,
  ...overrides,
});

describe("mapApplicationFromApiToVm", () => {
  it("maps the card fields, the salary range and the update date", () => {
    expect(mapApplicationFromApiToVm(application())).toEqual({
      id: "a1",
      title: "Frontend Developer",
      company: "Acme",
      location: "Madrid",
      status: "enviada",
      visibleTags: [],
      hiddenTagCount: 0,
      salary: "45.000\u00a0€ – 55.000\u00a0€",
      updatedAtLabel: "5 nov. 2026",
    });
  });

  it("keeps a null salary and a null location as null", () => {
    const vm = mapApplicationFromApiToVm(
      application({ salaryMin: null, salaryMax: null, location: null }),
    );
    expect(vm.salary).toBeNull();
    expect(vm.location).toBeNull();
  });

  it("orders tags stack, nice_to_have, language and marks only nice_to_have as soft", () => {
    const vm = mapApplicationFromApiToVm(
      application({
        tags: [
          { label: "Inglés", group: "language" },
          { label: "GraphQL", group: "nice_to_have" },
          { label: "React", group: "stack" },
        ],
      }),
    );
    expect(vm.visibleTags).toEqual([
      { label: "React", soft: false },
      { label: "GraphQL", soft: true },
      { label: "Inglés", soft: false },
    ]);
    expect(vm.hiddenTagCount).toBe(0);
  });

  it("shows at most three tags and counts the rest as hidden", () => {
    const vm = mapApplicationFromApiToVm(
      application({
        tags: [
          { label: "React", group: "stack" },
          { label: "TypeScript", group: "stack" },
          { label: "Vite", group: "stack" },
          { label: "Node", group: "stack" },
          { label: "GraphQL", group: "nice_to_have" },
        ],
      }),
    );
    expect(vm.visibleTags.map((tag) => tag.label)).toEqual([
      "React",
      "TypeScript",
      "Vite",
    ]);
    expect(vm.hiddenTagCount).toBe(2);
  });
});

describe("mapApplicationListFromApiToVm", () => {
  it("maps every application and keeps the order", () => {
    const vms = mapApplicationListFromApiToVm([
      application({ id: "a1" }),
      application({ id: "a2" }),
    ]);
    expect(vms.map((vm) => vm.id)).toEqual(["a1", "a2"]);
  });

  it("returns an empty list for no applications", () => {
    expect(mapApplicationListFromApiToVm([])).toEqual([]);
  });
});

describe("mapStackTagsFromApiToVm", () => {
  it("keeps only stack tags and the served order", () => {
    const tags: TagSummary[] = [
      { label: "React", group: "stack", count: 5 },
      { label: "Inglés", group: "language", count: 4 },
      { label: "Vite", group: "stack", count: 2 },
      { label: "GraphQL", group: "nice_to_have", count: 1 },
    ];
    expect(mapStackTagsFromApiToVm(tags)).toEqual([
      { label: "React" },
      { label: "Vite" },
    ]);
  });
});
