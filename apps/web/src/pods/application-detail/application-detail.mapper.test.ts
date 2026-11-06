import type { Application, Document, Interview } from "@tfm/contracts";
import { describe, expect, it } from "vitest";
import {
  mapApplicationFromApiToDetailVm,
  mapDocumentFromApiToDetailVm,
  mapInterviewFormToApiInput,
  mapInterviewFromApiToVm,
  newInterviewFormValues,
  nextInterviewRound,
  toSafeHttpUrl,
  validateInterviewForm,
  withOptimisticStatus,
} from "./application-detail.mapper";
import type { InterviewFormValues } from "./application-detail.vm";

// A local wall-clock time, so the expected labels do not depend on the zone of the machine.
const localIso = (
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
): string => new Date(year, month - 1, day, hour, minute).toISOString();

const interview = (overrides: Partial<Interview> = {}): Interview => ({
  id: "i1",
  round: 1,
  type: "tecnica",
  scheduledAt: null,
  mode: "online",
  notes: null,
  outcome: "pendiente",
  ...overrides,
});

const application = (overrides: Partial<Application> = {}): Application => ({
  id: "a1",
  title: "Frontend Developer",
  company: "Acme",
  location: "Madrid",
  workMode: null,
  seniority: null,
  contractType: null,
  salaryMin: null,
  salaryMax: null,
  currency: null,
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

const formValues = (
  overrides: Partial<InterviewFormValues> = {},
): InterviewFormValues => ({
  type: "tecnica",
  round: "1",
  scheduledAt: "",
  mode: "online",
  outcome: "pendiente",
  notes: "",
  ...overrides,
});

describe("toSafeHttpUrl", () => {
  it("keeps http and https links", () => {
    expect(toSafeHttpUrl("https://acme.test/jobs/1")).toBe(
      "https://acme.test/jobs/1",
    );
    expect(toSafeHttpUrl("http://acme.test")).toBe("http://acme.test");
  });

  it("drops javascript: links, data: links and values that do not parse", () => {
    expect(toSafeHttpUrl("javascript:alert(1)")).toBeNull();
    expect(toSafeHttpUrl("data:text/html,<b>x</b>")).toBeNull();
    expect(toSafeHttpUrl("not a url")).toBeNull();
  });

  it("keeps null as null", () => {
    expect(toSafeHttpUrl(null)).toBeNull();
  });
});

describe("mapInterviewFromApiToVm", () => {
  it("maps a dated round with labels, title and the edit values", () => {
    const scheduledAt = localIso(2026, 11, 5, 10, 30);
    expect(
      mapInterviewFromApiToVm(
        interview({
          id: "i2",
          round: 2,
          type: "prueba_tecnica",
          scheduledAt,
          mode: "telefono",
          outcome: "superada",
          notes: "Salió bien",
        }),
      ),
    ).toEqual({
      id: "i2",
      round: 2,
      title: "Ronda 2 · Prueba técnica",
      type: "prueba_tecnica",
      typeLabel: "Prueba técnica",
      scheduledAt,
      dateLabel: "5 nov. 2026, 10:30",
      mode: "telefono",
      modeLabel: "Teléfono",
      outcome: "superada",
      outcomeLabel: "Superada",
      notes: "Salió bien",
      editValues: {
        type: "prueba_tecnica",
        round: "2",
        scheduledAt: "2026-11-05T10:30",
        mode: "telefono",
        outcome: "superada",
        notes: "Salió bien",
      },
    });
  });

  it("keeps a missing date and missing notes empty", () => {
    const vm = mapInterviewFromApiToVm(interview());
    expect(vm.dateLabel).toBeNull();
    expect(vm.notes).toBeNull();
    expect(vm.editValues.scheduledAt).toBe("");
    expect(vm.editValues.notes).toBe("");
    expect(vm.outcomeLabel).toBe("Pendiente");
  });
});

describe("nextInterviewRound", () => {
  it("is 1 without rounds", () => {
    expect(nextInterviewRound([])).toBe(1);
  });

  it("is the highest stored round plus one, also when there are gaps", () => {
    expect(nextInterviewRound([{ round: 1 }, { round: 4 }, { round: 2 }])).toBe(
      5,
    );
  });

  it("never goes above the largest safe integer", () => {
    expect(nextInterviewRound([{ round: Number.MAX_SAFE_INTEGER }])).toBe(
      Number.MAX_SAFE_INTEGER,
    );
  });
});

describe("newInterviewFormValues", () => {
  it("opens with no type, the given round, online and pending", () => {
    expect(newInterviewFormValues(3)).toEqual({
      type: "",
      round: "3",
      scheduledAt: "",
      mode: "online",
      outcome: "pendiente",
      notes: "",
    });
  });
});

describe("mapInterviewFormToApiInput", () => {
  it("sends the round as a number and the date as UTC", () => {
    const input = mapInterviewFormToApiInput(
      formValues({ round: " 2 ", scheduledAt: "2026-11-05T10:30" }),
    );
    expect(input.round).toBe(2);
    expect(input.scheduledAt).toBe(localIso(2026, 11, 5, 10, 30));
  });

  it("leaves an emptied round out so the API numbers it", () => {
    expect(
      "round" in mapInterviewFormToApiInput(formValues({ round: "" })),
    ).toBe(false);
  });

  it("sends a blank date and blank notes as null", () => {
    const input = mapInterviewFormToApiInput(formValues({ notes: "   " }));
    expect(input.scheduledAt).toBeNull();
    expect(input.notes).toBeNull();
  });

  it("keeps notes as typed when they have text", () => {
    expect(
      mapInterviewFormToApiInput(
        formValues({ notes: "Preparar system design" }),
      ).notes,
    ).toBe("Preparar system design");
  });

  it("returns the stored instant while the date control still holds the loaded value", () => {
    const stored = "2026-11-05T09:30:45.123Z";
    expect(
      mapInterviewFormToApiInput(
        formValues({ scheduledAt: "2026-11-05T10:30" }),
        {
          local: "2026-11-05T10:30",
          iso: stored,
        },
      ).scheduledAt,
    ).toBe(stored);
  });

  it("converts the date again once the control no longer matches the loaded value", () => {
    expect(
      mapInterviewFormToApiInput(
        formValues({ scheduledAt: "2026-11-06T10:30" }),
        {
          local: "2026-11-05T10:30",
          iso: "2026-11-05T09:30:45.123Z",
        },
      ).scheduledAt,
    ).toBe(localIso(2026, 11, 6, 10, 30));
  });

  it("passes a date that does not parse through so the schema can report it", () => {
    expect(
      mapInterviewFormToApiInput(formValues({ scheduledAt: "nope" }))
        .scheduledAt,
    ).toBe("nope");
  });
});

describe("validateInterviewForm", () => {
  it("returns undefined for a valid round", () => {
    expect(validateInterviewForm(formValues())).toBeUndefined();
  });

  it("accepts an empty round when adding", () => {
    expect(validateInterviewForm(formValues({ round: "" }))).toBeUndefined();
  });

  it("asks for a type when none is chosen", () => {
    expect(validateInterviewForm(formValues({ type: "" }))).toEqual({
      fields: { type: "Elige un tipo de ronda." },
    });
  });

  it("rejects a round that is not a whole number of 1 or more", () => {
    const message = "La ronda debe ser un número entero de 1 o más.";
    expect(validateInterviewForm(formValues({ round: "0" }))).toEqual({
      fields: { round: message },
    });
    expect(validateInterviewForm(formValues({ round: "1.5" }))).toEqual({
      fields: { round: message },
    });
  });

  it("requires the round when editing", () => {
    expect(validateInterviewForm(formValues({ round: "" }), "edit")).toEqual({
      fields: { round: "La ronda debe ser un número entero de 1 o más." },
    });
    expect(validateInterviewForm(formValues(), "edit")).toBeUndefined();
  });

  it("rejects a date that does not parse and notes that are too long", () => {
    expect(
      validateInterviewForm(
        formValues({ scheduledAt: "nope", notes: "n".repeat(5001) }),
      ),
    ).toEqual({
      fields: {
        scheduledAt: "Introduce una fecha y hora válidas.",
        notes: "Las notas admiten hasta 5.000 caracteres.",
      },
    });
  });
});

describe("mapDocumentFromApiToDetailVm", () => {
  it("maps the label, size and download link of a linked document", () => {
    const document: Document = {
      id: "d1",
      type: "cv",
      name: "CV Frontend",
      version: "v3",
      fileName: "cv-frontend.pdf",
      s3Key: "documents/d1.pdf",
      mimeType: "application/pdf",
      size: 235520,
      createdAt: "2026-10-12T12:00:00.000Z",
    };
    expect(mapDocumentFromApiToDetailVm(document)).toEqual({
      id: "d1",
      label: "CV Frontend · v3 · 12 oct. 2026",
      sizeLabel: "230 KB",
      downloadHref: "/api/documents/d1/download",
      downloadLabel: "Descargar CV Frontend",
    });
  });
});

describe("mapApplicationFromApiToDetailVm", () => {
  it("maps a full application", () => {
    const vm = mapApplicationFromApiToDetailVm(
      application({
        workMode: "hibrido",
        seniority: "senior",
        contractType: "indefinido",
        salaryMin: 45000,
        salaryMax: 55000,
        currency: "EUR",
        tags: [
          { label: "Inglés", group: "language" },
          { label: "React", group: "stack" },
          { label: "GraphQL", group: "nice_to_have" },
        ],
        appliedAt: "2026-11-02T12:00:00.000Z",
        sourceUrl: "https://acme.test/jobs/1",
        notes: "Contacto: Marta",
        offerText: "Oferta completa",
        cvDocumentId: "d1",
        coverLetterDocumentId: "d2",
        statusHistory: [
          { status: "guardada", at: "2026-11-01T12:00:00.000Z" },
          { status: "enviada", at: "2026-11-02T12:00:00.000Z" },
        ],
        interviews: [interview({ id: "i1", round: 2 })],
      }),
    );
    expect(vm).toMatchObject({
      id: "a1",
      title: "Frontend Developer",
      company: "Acme",
      location: "Madrid",
      status: "enviada",
      salaryLine: "45.000 € – 55.000 € brutos al año",
      appliedAtLabel: "2 nov. 2026",
      sourceUrl: "https://acme.test/jobs/1",
      createdAtLabel: "1 nov. 2026",
      updatedAtLabel: "5 nov. 2026",
      notes: "Contacto: Marta",
      offerText: "Oferta completa",
      documentLinks: { cv: "d1", coverLetter: "d2" },
    });
    expect(vm.tagGroups).toEqual([
      { title: "Stack tecnológico", tags: [{ label: "React", soft: false }] },
      { title: "Se valora", tags: [{ label: "GraphQL", soft: true }] },
      { title: "Modelo de trabajo", tags: [{ label: "Híbrido", soft: false }] },
      { title: "Seniority", tags: [{ label: "Senior", soft: false }] },
      { title: "Contrato", tags: [{ label: "Indefinido", soft: false }] },
      { title: "Idiomas", tags: [{ label: "Inglés", soft: false }] },
    ]);
    expect(vm.history).toEqual([
      { status: "enviada", atLabel: "2 nov. 2026" },
      { status: "guardada", atLabel: "1 nov. 2026" },
    ]);
  });

  it("keeps empty optional data empty and omits empty tag groups", () => {
    const vm = mapApplicationFromApiToDetailVm(application());
    expect(vm.salaryLine).toBeNull();
    expect(vm.appliedAtLabel).toBeNull();
    expect(vm.sourceUrl).toBeNull();
    expect(vm.tagGroups).toEqual([]);
    expect(vm.history).toEqual([]);
    expect(vm.interviews).toEqual([]);
    expect(vm.newInterviewValues.round).toBe("1");
    expect(vm.documentLinks).toEqual({ cv: null, coverLetter: null });
  });

  it("never links a source url that is not http or https", () => {
    expect(
      mapApplicationFromApiToDetailVm(
        application({ sourceUrl: "javascript:alert(1)" }),
      ).sourceUrl,
    ).toBeNull();
  });

  it("orders the rounds by round, then by date with no date last, without touching the input", () => {
    const rounds = [
      interview({
        id: "late",
        round: 2,
        scheduledAt: "2026-11-09T09:00:00.000Z",
      }),
      interview({ id: "undated", round: 2 }),
      interview({
        id: "early",
        round: 2,
        scheduledAt: "2026-11-06T09:00:00.000Z",
      }),
      interview({ id: "first", round: 1 }),
    ];
    const vm = mapApplicationFromApiToDetailVm(
      application({ interviews: rounds }),
    );
    expect(vm.interviews.map((round) => round.id)).toEqual([
      "first",
      "early",
      "late",
      "undated",
    ]);
    expect(rounds.map((round) => round.id)).toEqual([
      "late",
      "undated",
      "early",
      "first",
    ]);
    expect(vm.newInterviewValues.round).toBe("3");
  });
});

describe("withOptimisticStatus", () => {
  it("sets the new status and puts its history entry first, leaving the input alone", () => {
    const vm = mapApplicationFromApiToDetailVm(
      application({
        statusHistory: [{ status: "guardada", at: "2026-11-01T12:00:00.000Z" }],
      }),
    );
    const next = withOptimisticStatus(vm, "en_entrevistas", "6 nov. 2026");
    expect(next.status).toBe("en_entrevistas");
    expect(next.history).toEqual([
      { status: "en_entrevistas", atLabel: "6 nov. 2026" },
      { status: "guardada", atLabel: "1 nov. 2026" },
    ]);
    expect(vm.status).toBe("enviada");
    expect(vm.history).toHaveLength(1);
  });
});
