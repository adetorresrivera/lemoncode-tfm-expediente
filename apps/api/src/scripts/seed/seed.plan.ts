import {
  applicationInputSchema,
  documentInputSchema,
  interviewInputSchema,
  type ApplicationInput,
  type ApplicationStatus,
  type DocumentInput,
  type InterviewInput,
  type Tag,
} from "@tfm/contracts";

// Pure description of the demo data: no I/O and no system clock. Every date derives from the `now`
// argument, so the same input always yields the same plan. The runner replays it through the
// services, which apply the domain rules.
//
// The 12 applications cover the display cases of UI-SPEC section 9: all 7 statuses (enviada and
// en_entrevistas the most frequent), applications with 0, 1 and 3 rounds, a tag overflow, a missing
// salary and a missing location, a long title and every work mode. Companies, people and contact
// data are invented. The three offers that are pasted live in the demo (docs/demo/ofertas/) and
// the mock draft are deliberately NOT here, so the live autofill is never staged by seeded data.

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

type TagGroups = {
  stack: string[];
  nice?: string[];
  language?: string[];
};

function tagsOf({ stack, nice = [], language = [] }: TagGroups): Tag[] {
  return [
    ...stack.map((label) => ({ label, group: "stack" as const })),
    ...nice.map((label) => ({ label, group: "nice_to_have" as const })),
    ...language.map((label) => ({ label, group: "language" as const })),
  ];
}

export function buildSeedPlan(now: Date): SeedPlan {
  const origin = now.getTime();
  const daysAgo = (days: number): Date => new Date(origin - days * DAY_MS);

  const daysAhead10h = (days: number): Date =>
    new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate() + days,
        10,
      ),
    );

  const create = (days: number): SeedStep => ({
    op: "create",
    at: daysAgo(days),
  });
  const move = (status: ApplicationStatus, days: number): SeedStep => ({
    op: "status",
    status,
    at: daysAgo(days),
  });
  const round = (
    addedDaysAgo: number,
    interview: Partial<InterviewInput> & Pick<InterviewInput, "round" | "type">,
    scheduledAt: Date | null,
  ): SeedStep => ({
    op: "interview",
    interview: interviewInputSchema.parse({
      mode: "online",
      ...interview,
      scheduledAt: scheduledAt === null ? null : scheduledAt.toISOString(),
    }),
    at: daysAgo(addedDaysAgo),
  });

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
      at: daysAgo(42),
    },
    {
      key: "cv-fullstack",
      asset: "cv-fullstack.pdf",
      fileName: "cv-fullstack.pdf",
      input: documentInputSchema.parse({
        type: "cv",
        name: "CV Full Stack",
        version: "v1",
      }),
      at: daysAgo(41),
    },
    {
      key: "cover-letter",
      asset: "cover-letter.pdf",
      fileName: "cover-letter.pdf",
      input: documentInputSchema.parse({
        type: "carta",
        name: "Carta de presentación",
        version: "v2",
      }),
      at: daysAgo(40),
    },
  ];

  const applications: SeedApplication[] = [
    // enviada (3), no rounds
    {
      key: "frontend-react",
      input: applicationInputSchema.parse({
        title: "Desarrolladora Frontend React",
        company: "Estudio Ámbar",
        location: "Madrid",
        workMode: "hibrido",
        seniority: "mid",
        contractType: "indefinido",
        salaryMin: 38000,
        salaryMax: 45000,
        currency: "EUR",
        tags: tagsOf({
          stack: ["React", "TypeScript"],
          nice: ["Testing Library"],
        }),
        sourceUrl: "https://ofertas.example/ambar/frontend-react",
        offerText:
          "Estudio Ámbar busca una desarrolladora frontend con React y TypeScript para producto propio. Trabajo híbrido en Madrid, equipo pequeño, contrato indefinido. Se valora experiencia con Testing Library.",
        notes: "Me la recomendó una antigua compañera de equipo.",
      }),
      cv: "cv-frontend",
      coverLetter: null,
      timeline: [create(30), move("enviada", 29)],
    },
    {
      key: "fullstack-node",
      input: applicationInputSchema.parse({
        title: "Ingeniero/a Full Stack Node",
        company: "Cobalto Sistemas",
        location: "Remoto",
        workMode: "remoto",
        seniority: "senior",
        contractType: "indefinido",
        salaryMin: 52000,
        salaryMax: 62000,
        currency: "EUR",
        tags: tagsOf({
          stack: ["Node.js", "React", "MongoDB"],
          nice: ["Docker"],
          language: ["Inglés B2"],
        }),
        sourceUrl: "https://ofertas.example/cobalto/fullstack-node",
      }),
      cv: "cv-fullstack",
      coverLetter: null,
      timeline: [create(22), move("enviada", 20)],
    },
    {
      key: "design-platform",
      input: applicationInputSchema.parse({
        title:
          "Senior Frontend Engineer para la plataforma de diseño y componentes web",
        company: "Fundición Digital",
        location: "Valencia",
        workMode: "presencial",
        seniority: "senior",
        contractType: "indefinido",
        tags: tagsOf({
          stack: ["React", "TypeScript", "Design systems"],
          nice: ["Storybook"],
        }),
      }),
      cv: "cv-frontend",
      coverLetter: null,
      timeline: [create(14), move("enviada", 12)],
    },

    // guardada (2), no rounds
    {
      key: "react-native",
      input: applicationInputSchema.parse({
        title: "Desarrollador/a React Native",
        company: "Brújula Labs",
        location: null,
        workMode: "remoto",
        seniority: "mid",
        contractType: "freelance",
        salaryMin: 40000,
        salaryMax: 48000,
        currency: "EUR",
        tags: tagsOf({ stack: ["React Native", "TypeScript"] }),
        sourceUrl: "https://ofertas.example/brujula/react-native",
      }),
      cv: null,
      coverLetter: null,
      timeline: [create(6)],
    },
    {
      key: "nextjs-frontend",
      input: applicationInputSchema.parse({
        title: "Frontend Developer (Next.js)",
        company: "Tinta y Byte",
        location: "Remoto",
        workMode: "remoto",
        seniority: "mid",
        contractType: "indefinido",
        salaryMin: 36000,
        tags: tagsOf({
          stack: ["React", "Next.js", "TypeScript", "GraphQL"],
          nice: ["Storybook", "Docker"],
          language: ["Inglés C1"],
        }),
        notes: "Revisar el stack con calma antes de enviar.",
      }),
      cv: "cv-frontend",
      coverLetter: null,
      timeline: [create(3)],
    },

    // en_entrevistas (3): three rounds with the last one ahead, one round, one round
    {
      key: "design-systems",
      input: applicationInputSchema.parse({
        title: "Frontend Engineer, Design Systems",
        company: "Harbor Pine Software",
        location: "Madrid",
        workMode: "hibrido",
        seniority: "senior",
        contractType: "indefinido",
        salaryMin: 55000,
        salaryMax: 65000,
        currency: "EUR",
        tags: tagsOf({
          stack: ["React", "TypeScript", "Design systems"],
          nice: ["Accesibilidad"],
          language: ["Inglés B2"],
        }),
        sourceUrl: "https://ofertas.example/harborpine/design-systems",
        offerText:
          "Harbor Pine Software busca un ingeniero frontend para su sistema de diseño. Trabajarás con React y TypeScript, con foco en accesibilidad. Equipo de ocho personas, producto propio, modelo híbrido en Madrid.",
        notes: "Equipo de ocho personas y producto propio.",
      }),
      cv: "cv-frontend",
      coverLetter: "cover-letter",
      timeline: [
        create(36),
        move("enviada", 35),
        round(
          33,
          { round: 1, type: "rrhh", mode: "telefono", outcome: "superada" },
          daysAgo(32),
        ),
        round(
          28,
          {
            round: 2,
            type: "tecnica",
            mode: "online",
            outcome: "superada",
            notes: "Ejercicio de accesibilidad en vivo.",
          },
          daysAgo(26),
        ),
        round(
          1,
          { round: 3, type: "manager", mode: "presencial" },
          daysAhead10h(3),
        ),
      ],
    },
    {
      key: "fullstack-react-node",
      input: applicationInputSchema.parse({
        title: "Full Stack Developer (Node y React)",
        company: "Quillon Works",
        location: "Barcelona",
        workMode: "hibrido",
        seniority: "mid",
        contractType: "indefinido",
        salaryMin: 42000,
        salaryMax: 50000,
        currency: "EUR",
        tags: tagsOf({
          stack: ["Node.js", "React", "PostgreSQL"],
          nice: ["Docker"],
        }),
        sourceUrl: "https://ofertas.example/quillon/fullstack",
      }),
      cv: "cv-fullstack",
      coverLetter: null,
      timeline: [
        create(24),
        move("enviada", 23),
        round(
          16,
          { round: 1, type: "tecnica", mode: "online", outcome: "superada" },
          daysAgo(14),
        ),
      ],
    },
    {
      key: "vue-react",
      input: applicationInputSchema.parse({
        title: "Frontend Developer Vue y React",
        company: "Olivar Cloud",
        location: "Remoto",
        workMode: "remoto",
        seniority: "mid",
        contractType: "temporal",
        salaryMin: 38000,
        salaryMax: 44000,
        currency: "EUR",
        tags: tagsOf({
          stack: ["Vue", "React", "TypeScript"],
          nice: ["Cypress"],
        }),
      }),
      cv: "cv-frontend",
      coverLetter: null,
      timeline: [
        create(15),
        move("enviada", 13),
        round(
          9,
          {
            round: 1,
            type: "prueba_tecnica",
            mode: "online",
            notes: "Entregada la prueba; esperan respuesta.",
          },
          daysAgo(7),
        ),
      ],
    },

    // oferta_recibida, aceptada, rechazada, descartada
    {
      key: "tech-lead",
      input: applicationInputSchema.parse({
        title: "Tech Lead Frontend",
        company: "Mercado Atlas",
        location: "Madrid",
        workMode: "hibrido",
        seniority: "lead",
        contractType: "indefinido",
        salaryMin: 70000,
        salaryMax: 80000,
        currency: "EUR",
        tags: tagsOf({
          stack: ["React", "TypeScript", "Liderazgo técnico"],
          nice: ["Arquitectura"],
          language: ["Inglés C1"],
        }),
        sourceUrl: "https://ofertas.example/atlas/tech-lead",
        offerText:
          "Mercado Atlas necesita un tech lead frontend para coordinar a seis personas. Se pide experiencia liderando equipos con React y TypeScript, y un inglés cómodo para trabajar con otras sedes.",
      }),
      cv: "cv-frontend",
      coverLetter: "cover-letter",
      timeline: [
        create(34),
        move("enviada", 33),
        round(
          31,
          { round: 1, type: "rrhh", mode: "online", outcome: "superada" },
          daysAgo(30),
        ),
        round(
          27,
          { round: 2, type: "tecnica", mode: "online", outcome: "superada" },
          daysAgo(25),
        ),
        round(
          20,
          {
            round: 3,
            type: "cultural",
            mode: "presencial",
            outcome: "superada",
          },
          daysAgo(18),
        ),
        move("oferta_recibida", 4),
      ],
    },
    {
      key: "fullstack-valencia",
      input: applicationInputSchema.parse({
        title: "Desarrolladora Full Stack",
        company: "Kestrel Forge",
        location: "Valencia",
        workMode: "presencial",
        seniority: "mid",
        contractType: "indefinido",
        salaryMin: 34000,
        salaryMax: 40000,
        currency: "EUR",
        tags: tagsOf({ stack: ["Node.js", "React", "MongoDB"] }),
        notes: "Acepté la oferta; empiezo a primeros de mes.",
      }),
      cv: "cv-fullstack",
      coverLetter: null,
      timeline: [
        create(39),
        move("enviada", 38),
        round(
          35,
          {
            round: 1,
            type: "tecnica",
            mode: "presencial",
            outcome: "superada",
          },
          daysAgo(34),
        ),
        move("oferta_recibida", 30),
        move("aceptada", 26),
      ],
    },
    {
      key: "frontend-redux",
      input: applicationInputSchema.parse({
        title: "Ingeniero/a de Software Frontend",
        company: "Sendero Datos",
        location: "Madrid",
        workMode: "hibrido",
        seniority: "senior",
        contractType: "indefinido",
        salaryMin: 48000,
        salaryMax: 56000,
        currency: "EUR",
        tags: tagsOf({
          stack: ["React", "Redux"],
          nice: ["Testing"],
          language: ["Inglés B2"],
        }),
        notes: "Piden más experiencia con Redux de la que tengo.",
      }),
      cv: "cv-frontend",
      coverLetter: null,
      timeline: [
        create(37),
        move("enviada", 36),
        round(
          32,
          {
            round: 1,
            type: "rrhh",
            mode: "telefono",
            outcome: "superada",
          },
          daysAgo(31),
        ),
        round(
          25,
          { round: 2, type: "tecnica", mode: "online", outcome: "superada" },
          daysAgo(24),
        ),
        round(
          19,
          {
            round: 3,
            type: "prueba_tecnica",
            mode: "online",
            outcome: "no_superada",
          },
          daysAgo(17),
        ),
        move("rechazada", 12),
      ],
    },
    {
      key: "junior-practicas",
      input: applicationInputSchema.parse({
        title: "Desarrollador Frontend Junior",
        company: "Pajarera Studio",
        location: "Sevilla",
        workMode: "presencial",
        seniority: "junior",
        contractType: "practicas",
        salaryMin: 14400,
        salaryMax: 14400,
        currency: "EUR",
        tags: tagsOf({ stack: ["HTML", "CSS", "JavaScript"] }),
        notes: "Descartada: el salario no compensa el desplazamiento.",
      }),
      cv: null,
      coverLetter: null,
      timeline: [create(25), move("descartada", 24)],
    },
  ];

  return { documents, applications };
}
