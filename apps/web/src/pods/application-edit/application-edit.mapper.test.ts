import {
  applicationInputSchema,
  type Application,
  type ApplicationInput,
} from "@tfm/contracts";
import { describe, expect, it } from "vitest";
import {
  issueToMessage,
  keepStoredAppliedAt,
  mapApplicationFromApiToFormValues,
  mapFormValuesToApiInput,
  mapServerErrorToFields,
  toLocalDateInput,
  toLocalNoonIso,
  validateApplicationForm,
} from "./application-edit.mapper";
import {
  EMPTY_FORM_VALUES,
  type ApplicationFormValues,
} from "./application-edit.vm";

const GENERIC = "Revisa este campo.";

const form = (
  overrides: Partial<ApplicationFormValues> = {},
): ApplicationFormValues => ({
  ...EMPTY_FORM_VALUES,
  title: "Frontend Developer",
  company: "Acme",
  ...overrides,
});

const application = (overrides: Partial<Application> = {}): Application => ({
  id: "a1",
  title: "Frontend Developer",
  company: "Acme",
  location: null,
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
  status: "guardada",
  statusHistory: [],
  interviews: [],
  createdAt: "2026-11-01T12:00:00.000Z",
  updatedAt: "2026-11-05T12:00:00.000Z",
  ownerId: null,
  ...overrides,
});

// The message `issueToMessage` gives to the first contracts issue reported under `field`.
const messageFor = (
  values: ApplicationFormValues,
  field: string,
): string | undefined => {
  const result = applicationInputSchema.safeParse(
    mapFormValuesToApiInput(values),
    { reportInput: true },
  );
  if (result.success) return undefined;
  const issue = result.error.issues.find((entry) => entry.path[0] === field);
  return issue === undefined ? undefined : issueToMessage(issue);
};

describe("toLocalNoonIso", () => {
  it("turns a calendar date into local noon in UTC", () => {
    expect(toLocalNoonIso("2026-11-05")).toBe(
      new Date(2026, 10, 5, 12).toISOString(),
    );
  });

  it("has no instant for an empty, malformed or impossible date", () => {
    expect(toLocalNoonIso("")).toBeNull();
    expect(toLocalNoonIso("5/11/2026")).toBeNull();
    expect(toLocalNoonIso("2026-02-30")).toBeNull();
    expect(toLocalNoonIso("2027-02-29")).toBeNull();
  });

  it("accepts a leap day", () => {
    expect(toLocalNoonIso("2028-02-29")).toBe(
      new Date(2028, 1, 29, 12).toISOString(),
    );
  });
});

describe("toLocalDateInput", () => {
  it("is the local calendar date of an instant, padded", () => {
    expect(toLocalDateInput(new Date(2026, 0, 2, 12).toISOString())).toBe(
      "2026-01-02",
    );
  });

  it("round-trips with toLocalNoonIso", () => {
    const iso = toLocalNoonIso("2026-11-05");
    expect(toLocalDateInput(iso)).toBe("2026-11-05");
  });

  it("is empty without an instant or with one that is not a date", () => {
    expect(toLocalDateInput(null)).toBe("");
    expect(toLocalDateInput("garbage")).toBe("");
  });
});

describe("mapApplicationFromApiToFormValues", () => {
  it("turns nulls into empty strings and keeps the default currency", () => {
    expect(mapApplicationFromApiToFormValues(application())).toEqual({
      ...EMPTY_FORM_VALUES,
      title: "Frontend Developer",
      company: "Acme",
      status: "guardada",
    });
  });

  it("turns numbers into strings and the applied instant into a local date", () => {
    expect(
      mapApplicationFromApiToFormValues(
        application({
          location: "Madrid",
          workMode: "remoto",
          seniority: "senior",
          contractType: "indefinido",
          salaryMin: 45000,
          salaryMax: 55000,
          currency: "USD",
          tags: [{ label: "React", group: "stack" }],
          status: "enviada",
          appliedAt: new Date(2026, 10, 2, 12).toISOString(),
          sourceUrl: "https://acme.test/jobs/1",
          notes: "Contacto: Marta",
          offerText: "Oferta completa",
          cvDocumentId: "d1",
          coverLetterDocumentId: "d2",
        }),
      ),
    ).toEqual({
      title: "Frontend Developer",
      company: "Acme",
      location: "Madrid",
      workMode: "remoto",
      seniority: "senior",
      contractType: "indefinido",
      salaryMin: "45000",
      salaryMax: "55000",
      currency: "USD",
      tags: [{ label: "React", group: "stack" }],
      status: "enviada",
      appliedAt: "2026-11-02",
      sourceUrl: "https://acme.test/jobs/1",
      notes: "Contacto: Marta",
      offerText: "Oferta completa",
      cvDocumentId: "d1",
      coverLetterDocumentId: "d2",
    });
  });
});

describe("keepStoredAppliedAt", () => {
  const input = (appliedAt: string | null): ApplicationInput =>
    applicationInputSchema.parse({
      title: "Frontend Developer",
      company: "Acme",
      appliedAt,
    });

  it("returns the stored instant while the local date did not change", () => {
    const stored = new Date(2026, 10, 2, 9, 41, 7).toISOString();
    const edited = input(toLocalNoonIso("2026-11-02"));
    expect(keepStoredAppliedAt(edited, stored).appliedAt).toBe(stored);
  });

  it("keeps the new noon when the date was changed", () => {
    const stored = new Date(2026, 10, 2, 9, 41, 7).toISOString();
    const edited = input(toLocalNoonIso("2026-11-03"));
    expect(keepStoredAppliedAt(edited, stored)).toBe(edited);
  });

  it("keeps a cleared date and a first date as they are", () => {
    const cleared = input(null);
    expect(keepStoredAppliedAt(cleared, "2026-11-02T08:41:07.000Z")).toBe(
      cleared,
    );
    const first = input(toLocalNoonIso("2026-11-03"));
    expect(keepStoredAppliedAt(first, null)).toBe(first);
  });

  it("does not mutate the input", () => {
    const stored = new Date(2026, 10, 2, 9, 41, 7).toISOString();
    const edited = input(toLocalNoonIso("2026-11-02"));
    const before = edited.appliedAt;
    keepStoredAppliedAt(edited, stored);
    expect(edited.appliedAt).toBe(before);
  });
});

describe("mapFormValuesToApiInput", () => {
  it("maps every filled field to the API draft", () => {
    expect(
      mapFormValuesToApiInput(
        form({
          location: "Madrid",
          workMode: "hibrido",
          seniority: "mid",
          contractType: "temporal",
          salaryMin: "40000",
          salaryMax: "50000",
          currency: "EUR",
          tags: [{ label: "React", group: "stack" }],
          status: "enviada",
          appliedAt: "2026-11-05",
          sourceUrl: " https://acme.test ",
          notes: "Nota",
          offerText: "Oferta",
          cvDocumentId: "d1",
          coverLetterDocumentId: "d2",
        }),
      ),
    ).toEqual({
      title: "Frontend Developer",
      company: "Acme",
      location: "Madrid",
      workMode: "hibrido",
      seniority: "mid",
      contractType: "temporal",
      salaryMin: 40000,
      salaryMax: 50000,
      currency: "EUR",
      tags: [{ label: "React", group: "stack" }],
      status: "enviada",
      appliedAt: new Date(2026, 10, 5, 12).toISOString(),
      sourceUrl: "https://acme.test",
      notes: "Nota",
      offerText: "Oferta",
      cvDocumentId: "d1",
      coverLetterDocumentId: "d2",
    });
  });

  it("sends empty and blank fields as null", () => {
    expect(
      mapFormValuesToApiInput(form({ location: "  ", notes: " " })),
    ).toMatchObject({
      location: null,
      workMode: null,
      seniority: null,
      contractType: null,
      salaryMin: null,
      salaryMax: null,
      currency: null,
      appliedAt: null,
      sourceUrl: null,
      notes: null,
      offerText: null,
      cvDocumentId: null,
      coverLetterDocumentId: null,
    });
  });

  it("drops the currency when there is no salary and keeps it with one side", () => {
    expect(
      mapFormValuesToApiInput(form({ currency: "EUR" })).currency,
    ).toBeNull();
    expect(
      mapFormValuesToApiInput(form({ salaryMax: "50000", currency: "USD" }))
        .currency,
    ).toBe("USD");
  });

  it("lets an amount that is not a number through as NaN for the schema to report", () => {
    expect(
      mapFormValuesToApiInput(form({ salaryMin: "abc" })).salaryMin,
    ).toBeNaN();
  });

  it("sends a date the calendar cannot produce as typed", () => {
    expect(
      mapFormValuesToApiInput(form({ appliedAt: "2026-02-30" })).appliedAt,
    ).toBe("2026-02-30");
  });
});

describe("issueToMessage", () => {
  it("words the title issues", () => {
    expect(messageFor(form({ title: "" }), "title")).toBe("Escribe el puesto.");
    expect(messageFor(form({ title: "A" }), "title")).toBe(
      "El puesto necesita al menos 2 caracteres.",
    );
    expect(messageFor(form({ title: "T".repeat(121) }), "title")).toBe(
      "El puesto admite hasta 120 caracteres.",
    );
  });

  it("words the company and location issues", () => {
    expect(messageFor(form({ company: "" }), "company")).toBe(
      "Escribe la empresa.",
    );
    expect(messageFor(form({ company: "C".repeat(121) }), "company")).toBe(
      "La empresa admite hasta 120 caracteres.",
    );
    expect(messageFor(form({ location: "L".repeat(121) }), "location")).toBe(
      "La ubicación admite hasta 120 caracteres.",
    );
  });

  it("words the salary issues", () => {
    expect(messageFor(form({ salaryMin: "-1" }), "salaryMin")).toBe(
      "El salario no puede ser negativo.",
    );
    expect(messageFor(form({ salaryMin: "abc" }), "salaryMin")).toBe(
      "Introduce un importe en números.",
    );
    expect(
      messageFor(form({ salaryMin: "60000", salaryMax: "50000" }), "salaryMax"),
    ).toBe("El máximo no puede ser menor que el mínimo.");
  });

  it("words the currency, url, date and notes issues", () => {
    expect(
      messageFor(form({ salaryMin: "1000", currency: "EU" }), "currency"),
    ).toBe("Usa un código de tres letras, por ejemplo EUR.");
    expect(
      messageFor(form({ sourceUrl: "ftp://acme.test" }), "sourceUrl"),
    ).toBe(
      "Introduce una dirección válida que empiece por http:// o https://.",
    );
    expect(messageFor(form({ appliedAt: "2026-02-30" }), "appliedAt")).toBe(
      "Introduce una fecha válida.",
    );
    expect(messageFor(form({ notes: "n".repeat(5001) }), "notes")).toBe(
      "Las notas admiten hasta 5.000 caracteres.",
    );
  });

  it("words the tag issues", () => {
    const many = Array.from({ length: 21 }, (_, index) => ({
      label: `Tag ${index}`,
      group: "stack" as const,
    }));
    expect(messageFor(form({ tags: many }), "tags")).toBe(
      "Máximo 20 etiquetas.",
    );
    expect(
      messageFor(
        form({ tags: [{ label: "L".repeat(41), group: "stack" }] }),
        "tags",
      ),
    ).toBe("Cada etiqueta admite hasta 40 caracteres.");
  });

  it("falls back to the generic sentence for a field without its own copy", () => {
    expect(
      messageFor(form({ offerText: "o".repeat(20001) }), "offerText"),
    ).toBe(GENERIC);
  });
});

describe("validateApplicationForm", () => {
  it("returns undefined for a valid form", () => {
    expect(validateApplicationForm(form())).toBeUndefined();
  });

  it("reports the first message of each invalid field", () => {
    expect(
      validateApplicationForm(
        form({
          title: "",
          company: "",
          salaryMin: "60000",
          salaryMax: "50000",
        }),
      ),
    ).toEqual({
      fields: {
        title: "Escribe el puesto.",
        company: "Escribe la empresa.",
        salaryMax: "El máximo no puede ser menor que el mínimo.",
      },
    });
  });

  it("reports an amount that is not a number under its field", () => {
    expect(validateApplicationForm(form({ salaryMax: "abc" }))).toEqual({
      fields: { salaryMax: "Introduce un importe en números." },
    });
  });
});

describe("mapServerErrorToFields", () => {
  it("marks the known form fields with the generic sentence and ignores the rest", () => {
    expect(
      mapServerErrorToFields({
        fieldErrors: {
          title: ["server detail"],
          salaryMin: ["x"],
          unknownField: ["y"],
        },
      }),
    ).toEqual({ title: GENERIC, salaryMin: GENERIC });
  });

  it("is empty when the details are not flattened field errors", () => {
    expect(mapServerErrorToFields(undefined)).toEqual({});
    expect(mapServerErrorToFields({ fieldErrors: "nope" })).toEqual({});
    expect(mapServerErrorToFields("boom")).toEqual({});
  });
});
