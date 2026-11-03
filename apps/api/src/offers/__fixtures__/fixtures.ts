import { readFileSync } from "node:fs";
import {
  tagKey,
  type ContractType,
  type OfferExtraction,
  type Seniority,
  type Tag,
  type WorkMode,
} from "@tfm/contracts";

export type FixtureName =
  "remote-senior" | "onsite-junior" | "english-nice-to-have";

/** Key fields a good extraction of the fixture must contain. Absent keys are not scored. */
export interface FixtureExpectation {
  title?: string;
  company?: string;
  location?: string;
  workMode?: WorkMode | null;
  seniority?: Seniority | null;
  contractType?: ContractType | null;
  salaryMin?: number | null;
  salaryMax?: number | null;
  currency?: string | null;
  tags?: Tag[];
}

// Anonymized offers (fictional companies): reused by the tests, the manual run and the Phase 6 seed.
export const OFFER_FIXTURES: readonly {
  name: FixtureName;
  file: string;
  expected: FixtureExpectation;
}[] = [
  {
    name: "remote-senior",
    file: "remote-senior.txt",
    expected: {
      title: "Desarrollador/a Frontend Senior",
      company: "Nimbo Software",
      workMode: "remoto",
      seniority: "senior",
      contractType: "indefinido",
      salaryMin: 45000,
      salaryMax: 55000,
      currency: "EUR",
      tags: [
        { label: "React", group: "stack" },
        { label: "TypeScript", group: "stack" },
        { label: "GraphQL", group: "nice_to_have" },
        { label: "Inglés B2", group: "language" },
      ],
    },
  },
  {
    name: "onsite-junior",
    file: "onsite-junior.txt",
    expected: {
      title: "Programador/a Backend Junior",
      company: "Talleres Digitales del Sur",
      location: "Sevilla",
      workMode: "presencial",
      seniority: "junior",
      contractType: "temporal",
      salaryMin: null,
      salaryMax: null,
      tags: [
        { label: "Java", group: "stack" },
        { label: "Spring Boot", group: "stack" },
      ],
    },
  },
  {
    name: "english-nice-to-have",
    file: "english-nice-to-have.txt",
    expected: {
      title: "Full Stack Engineer",
      company: "Northwind Labs",
      location: "London",
      workMode: "hibrido",
      seniority: "mid",
      contractType: "indefinido",
      salaryMin: 50000,
      salaryMax: 60000,
      currency: "GBP",
      tags: [
        { label: "Node.js", group: "stack" },
        { label: "TypeScript", group: "stack" },
        { label: "GraphQL", group: "nice_to_have" },
        { label: "Kubernetes", group: "nice_to_have" },
      ],
    },
  },
];

export function readFixtureText(name: FixtureName): string {
  const fixture = OFFER_FIXTURES.find((entry) => entry.name === name);
  if (!fixture) throw new Error(`Unknown fixture: ${name}`);
  return readFileSync(new URL(fixture.file, import.meta.url), "utf8");
}

const compact = (value: string): string =>
  value.trim().toLowerCase().replace(/\s+/gu, " ");

const SCALAR_KEYS = [
  "title",
  "company",
  "location",
  "workMode",
  "seniority",
  "contractType",
  "salaryMin",
  "salaryMax",
  "currency",
] as const satisfies readonly (keyof FixtureExpectation &
  keyof OfferExtraction)[];

/** Counts each expected scalar key and each expected tag; names what the extraction missed. */
export function scoreExtraction(
  expected: FixtureExpectation,
  actual: OfferExtraction,
): { correct: number; total: number; misses: string[] } {
  let correct = 0;
  let total = 0;
  const misses: string[] = [];

  for (const key of SCALAR_KEYS) {
    const want = expected[key];
    if (want === undefined) continue;
    total += 1;
    const got = actual[key];
    const same =
      typeof want === "string" && typeof got === "string"
        ? compact(want) === compact(got)
        : want === got;
    if (same) correct += 1;
    else misses.push(key);
  }

  for (const tag of expected.tags ?? []) {
    total += 1;
    const found = actual.tags.some(
      (candidate) =>
        candidate.group === tag.group &&
        tagKey(candidate.label) === tagKey(tag.label),
    );
    if (found) correct += 1;
    else misses.push(`tag:${tag.label}`);
  }

  return { correct, total, misses };
}
