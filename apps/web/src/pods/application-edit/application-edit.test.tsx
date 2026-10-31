import { applicationSchema } from "@tfm/contracts";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { jsonResponse, mockFetch } from "@/test/mock-fetch";
import { ApplicationEditContainer } from "./application-edit.container";
import {
  issueToMessage,
  mapFormValuesToApiInput,
  mapServerErrorToFields,
  toLocalNoonIso,
  validateApplicationForm,
} from "./application-edit.mapper";
import {
  EMPTY_FORM_VALUES,
  type ApplicationFormValues,
} from "./application-edit.vm";

const values = (
  overrides: Partial<ApplicationFormValues> = {},
): ApplicationFormValues => ({
  ...EMPTY_FORM_VALUES,
  title: "Frontend Developer",
  company: "Acme",
  ...overrides,
});

const fieldsOf = (overrides: Partial<ApplicationFormValues>) =>
  validateApplicationForm(values(overrides))?.fields;

describe("toLocalNoonIso", () => {
  it("maps a calendar date to local noon", () => {
    expect(toLocalNoonIso("2026-10-12")).toBe(
      new Date(2026, 9, 12, 12).toISOString(),
    );
  });

  it("returns null for an empty or impossible date", () => {
    expect(toLocalNoonIso("")).toBeNull();
    expect(toLocalNoonIso("2026-02-31")).toBeNull();
    expect(toLocalNoonIso("12/10/2026")).toBeNull();
  });
});

describe("mapFormValuesToApiInput", () => {
  it("sends every untouched optional field as null, never as an empty string", () => {
    const input = mapFormValuesToApiInput({
      ...EMPTY_FORM_VALUES,
      title: " Dev ",
      company: "Acme",
    });
    expect(input).toStrictEqual({
      title: " Dev ",
      company: "Acme",
      location: null,
      workMode: null,
      seniority: null,
      contractType: null,
      salaryMin: null,
      salaryMax: null,
      currency: null,
      tags: [],
      status: "guardada",
      appliedAt: null,
      sourceUrl: null,
      notes: null,
      offerText: null,
      cvDocumentId: null,
      coverLetterDocumentId: null,
    });
  });

  it("keeps the chosen currency when at least one salary is filled", () => {
    const input = mapFormValuesToApiInput(values({ salaryMin: "52000" }));
    expect(input.salaryMin).toBe(52000);
    expect(input.salaryMax).toBeNull();
    expect(input.currency).toBe("EUR");
  });

  it("turns a non-numeric salary into NaN so the schema reports a number error", () => {
    const input = mapFormValuesToApiInput(values({ salaryMin: "abc" }));
    expect(input.salaryMin).toBeNaN();
  });

  it("maps whitespace-only text to null and trims the URL", () => {
    const input = mapFormValuesToApiInput(
      values({ location: "  ", notes: "\n", sourceUrl: " https://a.test/x " }),
    );
    expect(input.location).toBeNull();
    expect(input.notes).toBeNull();
    expect(input.sourceUrl).toBe("https://a.test/x");
  });

  it("passes enums, tags, status and the local-noon date through", () => {
    const input = mapFormValuesToApiInput(
      values({
        workMode: "remoto",
        seniority: "senior",
        contractType: "indefinido",
        status: "enviada",
        appliedAt: "2026-10-12",
        tags: [{ label: "React", group: "stack" }],
      }),
    );
    expect(input).toMatchObject({
      workMode: "remoto",
      seniority: "senior",
      contractType: "indefinido",
      status: "enviada",
      appliedAt: new Date(2026, 9, 12, 12).toISOString(),
      tags: [{ label: "React", group: "stack" }],
    });
  });
});

describe("validateApplicationForm", () => {
  it("returns undefined for valid values", () => {
    expect(validateApplicationForm(values())).toBeUndefined();
  });

  it("explains an empty title, a one-character title and a long title", () => {
    expect(fieldsOf({ title: "" })?.title).toBe("Escribe el puesto.");
    expect(fieldsOf({ title: "   " })?.title).toBe("Escribe el puesto.");
    expect(fieldsOf({ title: "A" })?.title).toBe(
      "El puesto necesita al menos 2 caracteres.",
    );
    expect(fieldsOf({ title: "a".repeat(121) })?.title).toBe(
      "El puesto admite hasta 120 caracteres.",
    );
  });

  it("explains company and location limits", () => {
    expect(fieldsOf({ company: "" })?.company).toBe("Escribe la empresa.");
    expect(fieldsOf({ company: "a".repeat(121) })?.company).toBe(
      "La empresa admite hasta 120 caracteres.",
    );
    expect(fieldsOf({ location: "a".repeat(121) })?.location).toBe(
      "La ubicación admite hasta 120 caracteres.",
    );
  });

  it("explains salary errors, including the order check on salaryMax", () => {
    expect(fieldsOf({ salaryMin: "60000", salaryMax: "50000" })).toStrictEqual({
      salaryMax: "El máximo no puede ser menor que el mínimo.",
    });
    expect(fieldsOf({ salaryMin: "-1" })?.salaryMin).toBe(
      "El salario no puede ser negativo.",
    );
    expect(fieldsOf({ salaryMax: "abc" })?.salaryMax).toBe(
      "Introduce un importe en números.",
    );
  });

  it("explains currency, URL, date and notes errors", () => {
    expect(fieldsOf({ salaryMin: "1", currency: "EU" })?.currency).toBe(
      "Usa un código de tres letras, por ejemplo EUR.",
    );
    expect(fieldsOf({ sourceUrl: "javascript:alert(1)" })?.sourceUrl).toBe(
      "Introduce una dirección válida que empiece por http:// o https://.",
    );
    expect(fieldsOf({ appliedAt: "2026-13-45" })?.appliedAt).toBe(
      "Introduce una fecha válida.",
    );
    expect(fieldsOf({ notes: "a".repeat(5001) })?.notes).toBe(
      "Las notas admiten hasta 5.000 caracteres.",
    );
  });

  it("explains tag limits", () => {
    const many = Array.from({ length: 21 }, (_, index) => ({
      label: `Tag ${index}`,
      group: "stack" as const,
    }));
    expect(fieldsOf({ tags: many })?.tags).toBe("Máximo 20 etiquetas.");
    expect(
      fieldsOf({ tags: [{ label: "a".repeat(41), group: "stack" }] })?.tags,
    ).toBe("Cada etiqueta admite hasta 40 caracteres.");
  });

  it("keeps the first message per field", () => {
    const result = validateApplicationForm(values({ title: "", company: "" }));
    expect(result?.fields).toStrictEqual({
      title: "Escribe el puesto.",
      company: "Escribe la empresa.",
    });
  });
});

describe("issueToMessage", () => {
  it("falls back to a generic message for an unknown path or code", () => {
    expect(
      issueToMessage({
        code: "custom",
        path: ["whatever"],
        message: "x",
      }),
    ).toBe("Revisa este campo.");
  });
});

describe("mapServerErrorToFields", () => {
  it("maps every known field in fieldErrors to the generic field message", () => {
    expect(
      mapServerErrorToFields({
        formErrors: [],
        fieldErrors: { company: ["x"], title: ["y"] },
      }),
    ).toStrictEqual({
      company: "Revisa este campo.",
      title: "Revisa este campo.",
    });
  });

  it("ignores unknown fields and garbage", () => {
    expect(
      mapServerErrorToFields({ fieldErrors: { nope: ["x"] } }),
    ).toStrictEqual({});
    expect(mapServerErrorToFields("garbage")).toStrictEqual({});
    expect(mapServerErrorToFields(undefined)).toStrictEqual({});
    expect(mapServerErrorToFields({ fieldErrors: "x" })).toStrictEqual({});
  });
});

// The scene supplies the real router link; pod tests use a plain anchor.
const renderCancelLink = (link: {
  className?: string;
  children: ReactNode;
}) => (
  <a href="/applications" className={link.className}>
    {link.children}
  </a>
);

const created = applicationSchema.parse({
  id: "new1",
  title: "Frontend Developer",
  company: "Acme",
  status: "guardada",
  statusHistory: [{ status: "guardada", at: "2026-10-12T10:00:00.000Z" }],
  interviews: [],
  createdAt: "2026-10-12T10:00:00.000Z",
  updatedAt: "2026-10-12T10:00:00.000Z",
  ownerId: null,
});

const renderForm = (onSaved: (id: string) => void = () => {}) =>
  render(
    <ApplicationEditContainer
      onSaved={onSaved}
      renderCancelLink={renderCancelLink}
    />,
  );

const posts = (fetchMock: ReturnType<typeof mockFetch>) =>
  fetchMock.mock.calls.filter(([, init]) => init?.method === "POST");

const fillRequired = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.type(screen.getByLabelText("Puesto *"), "Frontend Developer");
  await user.type(screen.getByLabelText("Empresa *"), "Acme");
};

const submit = (user: ReturnType<typeof userEvent.setup>) =>
  user.click(screen.getByRole("button", { name: "Guardar candidatura" }));

describe("ApplicationEditContainer", () => {
  it("shows the intro, the first section and the cancel link", () => {
    renderForm();

    expect(
      screen.getByText("Los campos con * son obligatorios."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: "Puesto y empresa" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Puesto *")).toBeInTheDocument();
    expect(screen.getByLabelText("Empresa *")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Descartar cambios" }),
    ).toHaveAttribute("href", "/applications");
  });

  it("wires labels, required state and noValidate", () => {
    const { container } = renderForm();

    expect(container.querySelector("form")).toHaveAttribute("novalidate");
    const title = screen.getByLabelText("Puesto *");
    expect(title).toHaveAttribute("aria-required", "true");
    expect(title).not.toHaveAttribute("aria-invalid");
    expect(title).toHaveAttribute("autocomplete", "off");
  });

  it("shows the Spanish errors on the first submit, focuses the first invalid control and updates while typing", async () => {
    const user = userEvent.setup();
    const fetchMock = mockFetch({});
    renderForm();

    await submit(user);

    expect(await screen.findByText("Escribe el puesto.")).toBeInTheDocument();
    expect(screen.getByText("Escribe la empresa.")).toBeInTheDocument();
    expect(screen.getByText("Revisa los campos marcados.")).toBeInTheDocument();
    const title = screen.getByLabelText("Puesto *");
    expect(title).toHaveAttribute("aria-invalid", "true");
    const describedBy = title.getAttribute("aria-describedby") ?? "";
    expect(describedBy).toMatch(/-error$/);
    expect(document.getElementById(describedBy)).toHaveTextContent(
      "Escribe el puesto.",
    );
    await waitFor(() => expect(title).toHaveFocus());
    expect(posts(fetchMock)).toHaveLength(0);

    await user.type(title, "A");
    expect(
      await screen.findByText("El puesto necesita al menos 2 caracteres."),
    ).toBeInTheDocument();
    await user.type(title, "B");
    await waitFor(() => expect(title).not.toHaveAttribute("aria-invalid"));
    expect(
      screen.queryByText(/Escribe el puesto|necesita al menos/),
    ).toBeNull();
    expect(screen.getByText("Escribe la empresa.")).toBeInTheDocument();
  });

  it("does not show errors before the first submit", async () => {
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByLabelText("Puesto *"));
    await user.tab();

    expect(screen.queryByText("Escribe el puesto.")).toBeNull();
  });

  it("sends one POST with the validated draft and reports the new id", async () => {
    const user = userEvent.setup();
    const onSaved = vi.fn();
    const fetchMock = mockFetch({
      "POST /api/applications": () => jsonResponse(created, 201),
    });
    renderForm(onSaved);

    await fillRequired(user);
    await submit(user);

    await waitFor(() => expect(onSaved).toHaveBeenCalledWith("new1"));
    const sent = posts(fetchMock);
    expect(sent).toHaveLength(1);
    const init = sent[0]?.[1];
    expect(init?.headers).toStrictEqual({ "content-type": "application/json" });
    const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
    expect(body).toMatchObject({
      title: "Frontend Developer",
      company: "Acme",
      status: "guardada",
      location: null,
      sourceUrl: null,
      notes: null,
      salaryMin: null,
      currency: null,
      tags: [],
    });
  });

  it("ignores a second submit while the first is pending", async () => {
    const user = userEvent.setup();
    const onSaved = vi.fn();
    let release: (response: Response) => void = () => {};
    const pending = new Promise<Response>((resolve) => {
      release = resolve;
    });
    const fetchMock = mockFetch({ "POST /api/applications": () => pending });
    renderForm(onSaved);

    await fillRequired(user);
    const button = screen.getByRole("button", { name: "Guardar candidatura" });
    await user.click(button);

    const saving = await screen.findByRole("button", { name: "Guardando…" });
    expect(saving).toHaveAttribute("aria-disabled", "true");
    await user.click(saving);
    await user.click(saving);
    expect(posts(fetchMock)).toHaveLength(1);

    release(jsonResponse(created, 201));
    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
    expect(posts(fetchMock)).toHaveLength(1);
  });

  it("shows the generic save error on a 500 and keeps the values", async () => {
    const user = userEvent.setup();
    const onSaved = vi.fn();
    mockFetch({
      "POST /api/applications": () =>
        jsonResponse(
          { error: { code: "INTERNAL_ERROR", message: "boom" } },
          500,
        ),
    });
    renderForm(onSaved);

    await fillRequired(user);
    await submit(user);

    expect(
      await screen.findByText(
        "No se pudo guardar la candidatura. Inténtalo de nuevo.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Puesto *")).toHaveValue("Frontend Developer");
    expect(screen.getByLabelText("Empresa *")).toHaveValue("Acme");
    expect(
      screen.getByRole("button", { name: "Guardar candidatura" }),
    ).toBeEnabled();
    expect(onSaved).not.toHaveBeenCalled();
  });

  it("shows the network copy when the request cannot reach the server", async () => {
    const user = userEvent.setup();
    mockFetch({
      "POST /api/applications": () => {
        throw new TypeError("Failed to fetch");
      },
    });
    renderForm();

    await fillRequired(user);
    await submit(user);

    expect(
      await screen.findByText(
        "No se pudo conectar con el servidor. Comprueba tu conexión e inténtalo de nuevo.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Puesto *")).toHaveValue("Frontend Developer");
  });

  it("maps a 400 with field details onto the fields and focuses the first", async () => {
    const user = userEvent.setup();
    const onSaved = vi.fn();
    mockFetch({
      "POST /api/applications": () =>
        jsonResponse(
          {
            error: {
              code: "VALIDATION_ERROR",
              message: "Datos no válidos",
              details: { formErrors: [], fieldErrors: { company: ["bad"] } },
            },
          },
          400,
        ),
    });
    renderForm(onSaved);

    await fillRequired(user);
    await submit(user);

    expect(await screen.findByText("Revisa este campo.")).toBeInTheDocument();
    const company = screen.getByLabelText("Empresa *");
    expect(company).toHaveAttribute("aria-invalid", "true");
    await waitFor(() => expect(company).toHaveFocus());
    expect(screen.queryByText("bad")).toBeNull();
    expect(onSaved).not.toHaveBeenCalled();
  });

  it("keeps a polite status slot mounted for form-level messages", () => {
    const { container } = renderForm();
    const status = container.querySelector("[role='status']");
    expect(status).toHaveAttribute("aria-live", "polite");
    expect(status).toBeEmptyDOMElement();
  });
});
