import {
  applicationInputSchema,
  documentInputSchema,
  type ApplicationInput,
  type ApplicationStatus,
  type DocumentInput,
  type InterviewInput,
} from "@tfm/contracts";

// Pure description of the demo data: no I/O and no system clock. Every date derives from the `now`
// argument, so the same input always yields the same plan. The runner replays it through the
// services, which apply the domain rules.

export type SeedDocumentKey = "cv-frontend" | "cv-fullstack" | "cover-letter";

export interface SeedDocument {
  key: SeedDocumentKey;
  /** File name under `scripts/assets/`. */
  asset: string;
  /** Name given to the upload (same as the asset). */
  fileName: string;
  input: DocumentInput;
  at: Date;
}

export type SeedStep =
  | { op: "create"; at: Date }
  | { op: "status"; status: ApplicationStatus; at: Date }
  | { op: "interview"; interview: InterviewInput; at: Date };

export interface SeedApplication {
  key: string;
  /** Both document ids are null here: the runner resolves them from `cv` and `coverLetter`. */
  input: ApplicationInput;
  cv: SeedDocumentKey | null;
  coverLetter: SeedDocumentKey | null;
  /** The first step is always `create`. */
  timeline: SeedStep[];
}

export interface SeedPlan {
  documents: SeedDocument[];
  applications: SeedApplication[];
}

const DAY_MS = 86_400_000;

export function buildSeedPlan(now: Date): SeedPlan {
  const daysAgo = (days: number): Date =>
    new Date(now.getTime() - days * DAY_MS);

  const documents: SeedDocument[] = [
    {
      key: "cv-frontend",
      asset: "cv-frontend.pdf",
      fileName: "cv-frontend.pdf",
      input: documentInputSchema.parse({
        type: "cv",
        name: "CV Frontend",
        version: "v3",
      }),
      at: daysAgo(40),
    },
  ];

  const applications: SeedApplication[] = [
    {
      key: "frontend-react",
      input: applicationInputSchema.parse({
        title: "Desarrolladora Frontend React",
        company: "Estudio Ámbar",
        location: "Madrid",
        workMode: "hibrido",
        seniority: "mid",
        status: "guardada",
        tags: [
          { label: "React", group: "stack" },
          { label: "TypeScript", group: "stack" },
        ],
      }),
      cv: "cv-frontend",
      coverLetter: null,
      timeline: [
        { op: "create", at: daysAgo(38) },
        { op: "status", status: "enviada", at: daysAgo(37) },
      ],
    },
  ];

  return { documents, applications };
}
