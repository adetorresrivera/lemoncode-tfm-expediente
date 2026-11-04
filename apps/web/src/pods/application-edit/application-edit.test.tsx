import { applicationInputSchema, applicationSchema } from "@tfm/contracts";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { jsonResponse, mockFetch } from "@/test/mock-fetch";
import { ApplicationEditContainer } from "./application-edit.container";
import { useApplicationForm } from "./application-edit.hooks";
import { TrackingSection } from "./components/tracking-section";
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
  type RenderDocumentPicker,
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

  it("sends the document ids as they are and an empty string as null", () => {
    const input = mapFormValuesToApiInput(
      values({ cvDocumentId: "d1", coverLetterDocumentId: "" }),
    );
    expect(input.cvDocumentId).toBe("d1");
    expect(input.coverLetterDocumentId).toBeNull();
  });

  it("sends offerText as text, and blank text as null", () => {
    expect(
      mapFormValuesToApiInput(values({ offerText: "Texto" })).offerText,
    ).toBe("Texto");
    expect(
      mapFormValuesToApiInput(values({ offerText: "" })).offerText,
    ).toBeNull();
    expect(
      mapFormValuesToApiInput(values({ offerText: "  \n " })).offerText,
    ).toBeNull();
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

  it("maps a document link error to its form field", () => {
    expect(
      mapServerErrorToFields({
        formErrors: [],
        fieldErrors: { cvDocumentId: ["x"], coverLetterDocumentId: ["y"] },
      }),
    ).toStrictEqual({
      cvDocumentId: "Revisa este campo.",
      coverLetterDocumentId: "Revisa este campo.",
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

const renderListLink = (link: { className?: string; children: ReactNode }) => (
  <a href="/applications-list-stub" className={link.className}>
    {link.children}
  </a>
);

// The scene fills the Documentos slot with the real picker; pod tests use a plain select that
// calls `onSelected` and prints the error it receives.
const renderDocumentPicker: RenderDocumentPicker = ({
  type,
  selectedId,
  onSelected,
  error,
}) => (
  <div>
    <label htmlFor={`double-${type}`}>{`Doble ${type}`}</label>
    <select
      id={`double-${type}`}
      value={selectedId}
      aria-invalid={error !== undefined ? true : undefined}
      onChange={(event) => onSelected(event.target.value)}
    >
      <option value="">Sin documento</option>
      <option value="d1">Documento d1</option>
      <option value="d2">Documento d2</option>
    </select>
    {error !== undefined ? <p>{`${type}: ${error}`}</p> : null}
  </div>
);

const renderForm = (onSaved: (id: string) => void = () => {}) =>
  render(
    <ApplicationEditContainer
      onSaved={onSaved}
      renderCancelLink={renderCancelLink}
      renderListLink={renderListLink}
      renderDocumentPicker={renderDocumentPicker}
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

const lastPostBody = (fetchMock: ReturnType<typeof mockFetch>) => {
  const sent = posts(fetchMock);
  const init = sent[sent.length - 1]?.[1];
  return JSON.parse(String(init?.body)) as Record<string, unknown>;
};

const mockCreate = () =>
  mockFetch({ "POST /api/applications": () => jsonResponse(created, 201) });

describe("ApplicationEditContainer conditions and tracking", () => {
  it("renders the sections in order with blank fields and the defaults", () => {
    renderForm();

    const headings = screen
      .getAllByRole("heading", { level: 2 })
      .map((heading) => heading.textContent);
    expect(headings).toStrictEqual([
      "Pegar oferta",
      "Puesto y empresa",
      "Condiciones",
      "Etiquetas",
      "Seguimiento",
      "Documentos",
    ]);
    expect(screen.getByLabelText("Puesto *")).toHaveValue("");
    expect(screen.getByLabelText("Empresa *")).toHaveValue("");
    expect(screen.getByLabelText("Estado inicial")).toHaveValue("guardada");
    expect(screen.getByLabelText("Moneda")).toHaveValue("EUR");
    expect(screen.getByLabelText("Modalidad")).toHaveValue("");
    expect(screen.getByLabelText("Ubicación")).toHaveValue("");
    expect(screen.getByLabelText("Notas")).toHaveValue("");
    expect(screen.getByLabelText("Enlace de la oferta")).toHaveValue("");
    expect(document.querySelector("[aria-invalid='true']")).toBeNull();
    expect(screen.queryByText(/Revisa los campos|Escribe el/)).toBeNull();
  });

  it("describes the controls of the conditions section", () => {
    renderForm();

    const none = within(screen.getByLabelText("Modalidad")).getByRole(
      "option",
      { name: "Sin indicar" },
    );
    expect(none).toHaveValue("");
    const min = screen.getByLabelText("Salario mínimo");
    const max = screen.getByLabelText("Salario máximo");
    for (const control of [min, max]) {
      expect(control).toHaveAttribute("type", "number");
      expect(control).toHaveAttribute("inputmode", "numeric");
      expect(control).toHaveAttribute("min", "0");
    }
    expect(screen.getByText("Importe anual bruto.")).toBeInTheDocument();
    expect(min).toHaveAccessibleDescription("Importe anual bruto.");
    const currencies = within(screen.getByLabelText("Moneda"))
      .getAllByRole("option")
      .map((option) => option.textContent);
    expect(currencies).toStrictEqual(["EUR", "USD", "GBP"]);
  });

  it("describes the controls of the tracking section", () => {
    renderForm();

    expect(screen.getByLabelText("Fecha de envío")).toHaveAttribute(
      "type",
      "date",
    );
    expect(
      screen.getByText(
        "Si la dejas vacía, se rellena sola al pasar a Enviada.",
      ),
    ).toBeInTheDocument();
    const url = screen.getByLabelText("Enlace de la oferta");
    expect(url).toHaveAttribute("type", "url");
    expect(url).toHaveAttribute("placeholder", "https://");
    expect(screen.getByLabelText("Notas")).toHaveAttribute("rows", "5");
    expect(
      within(screen.getByLabelText("Estado inicial")).getAllByRole("option"),
    ).toHaveLength(7);
  });

  it("posts the chosen conditions, salary range and status", async () => {
    const user = userEvent.setup();
    const fetchMock = mockCreate();
    renderForm();

    await fillRequired(user);
    await user.selectOptions(screen.getByLabelText("Modalidad"), "Remoto");
    await user.selectOptions(screen.getByLabelText("Seniority"), "Senior");
    await user.selectOptions(
      screen.getByLabelText("Tipo de contrato"),
      "Indefinido",
    );
    await user.type(screen.getByLabelText("Salario mínimo"), "52000");
    await user.type(screen.getByLabelText("Salario máximo"), "65000");
    await user.selectOptions(
      screen.getByLabelText("Estado inicial"),
      "Enviada",
    );
    await submit(user);

    await waitFor(() => expect(posts(fetchMock)).toHaveLength(1));
    expect(lastPostBody(fetchMock)).toMatchObject({
      workMode: "remoto",
      seniority: "senior",
      contractType: "indefinido",
      salaryMin: 52000,
      salaryMax: 65000,
      currency: "EUR",
      status: "enviada",
    });
  });

  it("posts the applied date as local noon", async () => {
    const user = userEvent.setup();
    const fetchMock = mockCreate();
    renderForm();

    await fillRequired(user);
    fireEvent.change(screen.getByLabelText("Fecha de envío"), {
      target: { value: "2026-10-12" },
    });
    await submit(user);

    await waitFor(() => expect(posts(fetchMock)).toHaveLength(1));
    expect(lastPostBody(fetchMock).appliedAt).toBe(
      new Date(2026, 9, 12, 12).toISOString(),
    );
  });

  it("posts an empty date, link, notes and conditions as null", async () => {
    const user = userEvent.setup();
    const fetchMock = mockCreate();
    renderForm();

    await fillRequired(user);
    await submit(user);

    await waitFor(() => expect(posts(fetchMock)).toHaveLength(1));
    expect(lastPostBody(fetchMock)).toMatchObject({
      appliedAt: null,
      sourceUrl: null,
      notes: null,
      location: null,
      workMode: null,
      currency: null,
      cvDocumentId: null,
      coverLetterDocumentId: null,
    });
  });

  it("flags a maximum below the minimum on Salario máximo and focuses it", async () => {
    const user = userEvent.setup();
    const fetchMock = mockCreate();
    renderForm();

    await fillRequired(user);
    await user.type(screen.getByLabelText("Salario mínimo"), "60000");
    await user.type(screen.getByLabelText("Salario máximo"), "50000");
    await submit(user);

    expect(
      await screen.findByText("El máximo no puede ser menor que el mínimo."),
    ).toBeInTheDocument();
    const max = screen.getByLabelText("Salario máximo");
    expect(max).toHaveAttribute("aria-invalid", "true");
    await waitFor(() => expect(max).toHaveFocus());
    expect(posts(fetchMock)).toHaveLength(0);
  });

  it("flags a non-http link and an over-long note", async () => {
    const user = userEvent.setup();
    renderForm();

    await fillRequired(user);
    await user.type(screen.getByLabelText("Enlace de la oferta"), "ftp://x");
    fireEvent.change(screen.getByLabelText("Notas"), {
      target: { value: "a".repeat(5001) },
    });
    await submit(user);

    expect(
      await screen.findByText(
        "Introduce una dirección válida que empiece por http:// o https://.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Las notas admiten hasta 5.000 caracteres."),
    ).toBeInTheDocument();
  });

  it("limits title, company and location with the Spanish too_big messages", async () => {
    const user = userEvent.setup();
    renderForm();

    fireEvent.change(screen.getByLabelText("Puesto *"), {
      target: { value: "a".repeat(121) },
    });
    fireEvent.change(screen.getByLabelText("Empresa *"), {
      target: { value: "b".repeat(121) },
    });
    fireEvent.change(screen.getByLabelText("Ubicación"), {
      target: { value: "c".repeat(121) },
    });
    await submit(user);

    expect(
      await screen.findByText("El puesto admite hasta 120 caracteres."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("La empresa admite hasta 120 caracteres."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("La ubicación admite hasta 120 caracteres."),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Puesto *")).toHaveValue("a".repeat(121));
  });

  it("renders no initial status selector in edit mode", () => {
    function Harness({ mode }: { mode: "create" | "edit" }) {
      const { form } = useApplicationForm({
        initialValues: EMPTY_FORM_VALUES,
        save: () => Promise.resolve(created),
        onSaved: () => {},
      });
      return <TrackingSection form={form} mode={mode} />;
    }
    const { unmount } = render(<Harness mode="edit" />);
    expect(screen.queryByLabelText("Estado inicial")).toBeNull();
    expect(screen.getByLabelText("Notas")).toBeInTheDocument();
    unmount();
    render(<Harness mode="create" />);
    expect(screen.getByLabelText("Estado inicial")).toBeInTheDocument();
  });

  it("explains a negative salary", async () => {
    const user = userEvent.setup();
    renderForm();

    await fillRequired(user);
    await user.type(screen.getByLabelText("Salario mínimo"), "-5");
    await submit(user);

    expect(
      await screen.findByText("El salario no puede ser negativo."),
    ).toBeInTheDocument();
  });
});

const GROUPS = {
  stack: "Stack tecnológico",
  nice: "Se valora",
  language: "Idiomas",
} as const;

const groupOf = (legend: string) => screen.getByRole("group", { name: legend });
const tagInput = (legend: string) =>
  screen.getByLabelText(`Añadir etiqueta a ${legend}`);
const addButton = (legend: string) =>
  within(groupOf(legend)).getByRole("button", { name: "Añadir" });
const chip = (label: string) =>
  screen.queryByRole("button", { name: `Quitar ${label}` });
const typeTag = async (
  user: ReturnType<typeof userEvent.setup>,
  legend: string,
  text: string,
) => {
  await user.type(tagInput(legend), `${text}{Enter}`);
};

describe("ApplicationEditContainer tags", () => {
  it("shows three labelled groups, the counter and always-mounted status lines", () => {
    renderForm();

    const placeholders: Record<string, string> = {
      [GROUPS.stack]: "Ej.: React",
      [GROUPS.nice]: "Ej.: Docker",
      [GROUPS.language]: "Ej.: Inglés B2",
    };
    for (const legend of Object.values(GROUPS)) {
      const group = groupOf(legend);
      const input = tagInput(legend);
      expect(input).toHaveAttribute("placeholder", placeholders[legend]);
      expect(input).toHaveAttribute("maxlength", "40");
      const status = group.querySelector("[role='status']");
      expect(status).toHaveAttribute("aria-live", "polite");
      expect(status).toBeEmptyDOMElement();
      expect(within(group).queryAllByRole("listitem")).toHaveLength(0);
    }
    expect(screen.getByText("0 de 20")).toHaveAttribute("aria-live", "polite");
  });

  it("adds a tag with Enter, clears the input, keeps focus, announces it and does not submit", async () => {
    const user = userEvent.setup();
    const fetchMock = mockCreate();
    renderForm();

    await fillRequired(user);
    await typeTag(user, GROUPS.stack, "React");

    expect(chip("React")).toBeInTheDocument();
    expect(tagInput(GROUPS.stack)).toHaveValue("");
    expect(tagInput(GROUPS.stack)).toHaveFocus();
    expect(
      within(groupOf(GROUPS.stack)).getByText("React añadida."),
    ).toBeVisible();
    expect(screen.getByText("1 de 20")).toBeInTheDocument();
    expect(posts(fetchMock)).toHaveLength(0);
  });

  it("adds with the Añadir button and normalizes the spelling", async () => {
    const user = userEvent.setup();
    renderForm();

    await user.type(tagInput(GROUPS.language), "  Inglés   técnico ");
    await user.click(addButton(GROUPS.language));

    expect(chip("Inglés técnico")).toBeInTheDocument();
    expect(
      within(groupOf(GROUPS.language)).getByText("Inglés técnico añadida."),
    ).toBeInTheDocument();
  });

  it("announces a duplicate in the same group and in another group", async () => {
    const user = userEvent.setup();
    renderForm();

    await typeTag(user, GROUPS.stack, "React");
    await user.type(tagInput(GROUPS.stack), " react ");
    await user.click(addButton(GROUPS.stack));
    expect(
      within(groupOf(GROUPS.stack)).getByText("Ya está en la lista"),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(1);

    await typeTag(user, GROUPS.nice, "React");
    expect(
      within(groupOf(GROUPS.nice)).getByText("Ya está en la lista"),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
    expect(screen.getByText("1 de 20")).toBeInTheDocument();
  });

  it("adds nothing and says nothing for an empty or whitespace-only input", async () => {
    const user = userEvent.setup();
    renderForm();

    await user.click(tagInput(GROUPS.stack));
    await user.keyboard("{Enter}");
    await user.type(tagInput(GROUPS.stack), "   ");
    await user.click(addButton(GROUPS.stack));

    expect(screen.queryAllByRole("listitem")).toHaveLength(0);
    expect(
      groupOf(GROUPS.stack).querySelector("[role='status']"),
    ).toBeEmptyDOMElement();
  });

  it("stops at 20 tags with the cap message", async () => {
    const user = userEvent.setup();
    renderForm();

    for (let index = 1; index <= 20; index += 1) {
      await typeTag(user, GROUPS.stack, `Tag ${index}`);
    }
    expect(screen.getByText("20 de 20")).toBeInTheDocument();

    await typeTag(user, GROUPS.stack, "Tag 21");

    expect(
      within(groupOf(GROUPS.stack)).getByText("Máximo 20 etiquetas"),
    ).toBeInTheDocument();
    expect(chip("Tag 21")).toBeNull();
    expect(screen.getAllByRole("listitem")).toHaveLength(20);
    expect(screen.getByText("20 de 20")).toBeInTheDocument();
  });

  it("accepts a 40-character label and does not accept a 41st character", async () => {
    const user = userEvent.setup();
    renderForm();

    await user.type(tagInput(GROUPS.stack), "a".repeat(41));

    expect(tagInput(GROUPS.stack)).toHaveValue("a".repeat(40));
    await user.keyboard("{Enter}");
    expect(chip("a".repeat(40))).toBeInTheDocument();
  });

  it("removes a chip, announces it and moves focus to the next remove button", async () => {
    const user = userEvent.setup();
    renderForm();

    await typeTag(user, GROUPS.stack, "A");
    await typeTag(user, GROUPS.stack, "B");
    await typeTag(user, GROUPS.stack, "C");

    await user.click(chip("B") as HTMLElement);
    expect(chip("B")).toBeNull();
    expect(
      within(groupOf(GROUPS.stack)).getByText("B quitada."),
    ).toBeInTheDocument();
    expect(chip("C")).toHaveFocus();

    await user.click(chip("C") as HTMLElement);
    expect(chip("A")).toHaveFocus();

    await user.click(chip("A") as HTMLElement);
    expect(tagInput(GROUPS.stack)).toHaveFocus();
    expect(screen.getByText("0 de 20")).toBeInTheDocument();
  });

  it("posts the tags of the three groups", async () => {
    const user = userEvent.setup();
    const fetchMock = mockCreate();
    renderForm();

    await fillRequired(user);
    await typeTag(user, GROUPS.stack, "React");
    await typeTag(user, GROUPS.nice, "Docker");
    await typeTag(user, GROUPS.language, "Inglés");
    await submit(user);

    await waitFor(() => expect(posts(fetchMock)).toHaveLength(1));
    expect(lastPostBody(fetchMock).tags).toStrictEqual([
      { label: "React", group: "stack" },
      { label: "Docker", group: "nice_to_have" },
      { label: "Inglés", group: "language" },
    ]);
  });

  it("uses a soft chip for Se valora only", async () => {
    const user = userEvent.setup();
    renderForm();

    await typeTag(user, GROUPS.nice, "Docker");
    await typeTag(user, GROUPS.stack, "React");

    const soft = chip("Docker")?.closest("span");
    const hard = chip("React")?.closest("span");
    expect(soft?.className).toContain("border-dashed");
    expect(hard?.className).not.toContain("border-dashed");
  });

  it("wraps the chips of a group", async () => {
    const user = userEvent.setup();
    renderForm();

    await typeTag(user, GROUPS.stack, "React");

    expect(within(groupOf(GROUPS.stack)).getByRole("list").className).toContain(
      "flex-wrap",
    );
  });
});

const AUTO_APPLIED_AT = "2026-10-30T08:15:00.000Z";

const stored = (overrides: Record<string, unknown> = {}) =>
  applicationSchema.parse({
    id: "a1",
    title: "Frontend Developer",
    company: "Acme",
    status: "enviada",
    appliedAt: AUTO_APPLIED_AT,
    statusHistory: [
      { status: "guardada", at: "2026-10-12T10:00:00.000Z" },
      { status: "enviada", at: AUTO_APPLIED_AT },
    ],
    interviews: [],
    createdAt: "2026-10-12T10:00:00.000Z",
    updatedAt: "2026-10-30T08:15:00.000Z",
    ownerId: null,
    ...overrides,
  });

describe("toLocalDateInput", () => {
  it("maps an instant to its local calendar date and null to empty", () => {
    const instant = new Date(2026, 9, 12, 12);
    expect(toLocalDateInput(instant.toISOString())).toBe("2026-10-12");
    expect(toLocalDateInput(null)).toBe("");
    expect(toLocalDateInput("not a date")).toBe("");
  });
});

describe("mapApplicationFromApiToFormValues", () => {
  it("turns null into empty strings, numbers into strings and keeps the currency default", () => {
    const mapped = mapApplicationFromApiToFormValues(
      stored({
        salaryMin: 52000,
        salaryMax: null,
        currency: null,
        tags: [{ label: "React", group: "stack" }],
      }),
    );
    expect(mapped).toStrictEqual({
      title: "Frontend Developer",
      company: "Acme",
      location: "",
      workMode: "",
      seniority: "",
      contractType: "",
      salaryMin: "52000",
      salaryMax: "",
      currency: "EUR",
      tags: [{ label: "React", group: "stack" }],
      status: "enviada",
      appliedAt: toLocalDateInput(AUTO_APPLIED_AT),
      sourceUrl: "",
      notes: "",
      offerText: "",
      cvDocumentId: "",
      coverLetterDocumentId: "",
    });
  });

  it("maps stored document links to ids and a null link to an empty string", () => {
    const mapped = mapApplicationFromApiToFormValues(
      stored({ cvDocumentId: "d1", coverLetterDocumentId: null }),
    );
    expect(mapped.cvDocumentId).toBe("d1");
    expect(mapped.coverLetterDocumentId).toBe("");
  });

  it("carries a stored offerText into the form values", () => {
    const mapped = mapApplicationFromApiToFormValues(
      stored({ offerText: "Oferta guardada" }),
    );
    expect(mapped.offerText).toBe("Oferta guardada");
  });

  it("keeps a stored currency and the optional enums", () => {
    const mapped = mapApplicationFromApiToFormValues(
      stored({
        currency: "USD",
        salaryMin: 1,
        workMode: "remoto",
        location: "Madrid",
      }),
    );
    expect(mapped.currency).toBe("USD");
    expect(mapped.workMode).toBe("remoto");
    expect(mapped.location).toBe("Madrid");
  });
});

describe("keepStoredAppliedAt", () => {
  const draft = (appliedAt: string | null) =>
    applicationInputSchema.parse({
      title: "Dev",
      company: "Acme",
      appliedAt,
    });

  it("returns the stored instant when the local date did not change", () => {
    const noon = toLocalNoonIso(toLocalDateInput(AUTO_APPLIED_AT));
    const input = draft(noon);
    expect(keepStoredAppliedAt(input, AUTO_APPLIED_AT).appliedAt).toBe(
      AUTO_APPLIED_AT,
    );
    expect(input.appliedAt).toBe(noon);
  });

  it("keeps the noon instant of another date", () => {
    const other = toLocalNoonIso("2026-11-02");
    expect(keepStoredAppliedAt(draft(other), AUTO_APPLIED_AT).appliedAt).toBe(
      other,
    );
  });

  it("keeps a cleared date as null", () => {
    expect(keepStoredAppliedAt(draft(null), AUTO_APPLIED_AT).appliedAt).toBe(
      null,
    );
  });

  it("returns the input unchanged when nothing is stored", () => {
    const input = draft(toLocalNoonIso("2026-11-02"));
    expect(keepStoredAppliedAt(input, null)).toBe(input);
  });
});

const renderEdit = (
  onSaved: (id: string) => void = () => {},
  applicationId = "a1",
) =>
  render(
    <ApplicationEditContainer
      applicationId={applicationId}
      onSaved={onSaved}
      renderCancelLink={renderCancelLink}
      renderListLink={renderListLink}
      renderDocumentPicker={renderDocumentPicker}
    />,
  );

const puts = (fetchMock: ReturnType<typeof mockFetch>) =>
  fetchMock.mock.calls.filter(([, init]) => init?.method === "PUT");

const putBody = (fetchMock: ReturnType<typeof mockFetch>) => {
  const init = puts(fetchMock)[0]?.[1];
  return JSON.parse(String(init?.body)) as Record<string, unknown>;
};

const saveEdit = (user: ReturnType<typeof userEvent.setup>) =>
  user.click(screen.getByRole("button", { name: "Guardar candidatura" }));

describe("ApplicationEditContainer edit mode", () => {
  it("shows the loading state until the application arrives, then the prefilled form with the status line", async () => {
    let release: (response: Response) => void = () => {};
    mockFetch({
      "GET /api/applications/a1": () =>
        new Promise<Response>((resolve) => {
          release = resolve;
        }),
    });
    renderEdit();

    expect(screen.getByText("Cargando candidatura…")).toBeInTheDocument();
    expect(screen.queryByLabelText("Puesto *")).toBeNull();

    release(jsonResponse(stored()));

    expect(await screen.findByLabelText("Puesto *")).toHaveValue(
      "Frontend Developer",
    );
    expect(screen.getByLabelText("Empresa *")).toHaveValue("Acme");
    expect(screen.getByText("Frontend Developer · Acme")).toBeInTheDocument();
    expect(screen.getByText("Estado actual:")).toBeInTheDocument();
    expect(screen.getByText("Cámbialo desde el detalle.")).toBeInTheDocument();
    expect(screen.queryByLabelText("Estado inicial")).toBeNull();
    expect(
      screen.getByRole("link", { name: "Descartar cambios" }),
    ).toBeInTheDocument();
  });

  it("keeps optional fields blank when the API has null", async () => {
    mockFetch({ "GET /api/applications/a1": stored({ appliedAt: null }) });
    renderEdit();

    expect(await screen.findByLabelText("Ubicación")).toHaveValue("");
    expect(screen.getByLabelText("Salario mínimo")).toHaveValue(null);
    expect(screen.getByLabelText("Fecha de envío")).toHaveValue("");
    expect(screen.getByLabelText("Enlace de la oferta")).toHaveValue("");
    expect(screen.getByLabelText("Notas")).toHaveValue("");
  });

  it("saves with PUT to the id and reports it, never POST", async () => {
    const user = userEvent.setup();
    const onSaved = vi.fn();
    const fetchMock = mockFetch({
      "GET /api/applications/a1": stored(),
      "PUT /api/applications/a1": () =>
        jsonResponse(stored({ title: "Frontend Lead" })),
    });
    renderEdit(onSaved);

    const title = await screen.findByLabelText("Puesto *");
    await user.clear(title);
    await user.type(title, "Frontend Lead");
    await saveEdit(user);

    await waitFor(() => expect(onSaved).toHaveBeenCalledWith("a1"));
    expect(puts(fetchMock)).toHaveLength(1);
    expect(posts(fetchMock)).toHaveLength(0);
    expect(putBody(fetchMock)).toMatchObject({ title: "Frontend Lead" });
  });

  it("sends the loaded document links back when only the title changed", async () => {
    const user = userEvent.setup();
    const fetchMock = mockFetch({
      "GET /api/applications/a1": stored({
        cvDocumentId: "d1",
        coverLetterDocumentId: "d2",
      }),
      "PUT /api/applications/a1": () => jsonResponse(stored()),
    });
    renderEdit();

    const title = await screen.findByLabelText("Puesto *");
    await user.type(title, " 2");
    await saveEdit(user);

    await waitFor(() => expect(puts(fetchMock)).toHaveLength(1));
    expect(putBody(fetchMock)).toMatchObject({
      cvDocumentId: "d1",
      coverLetterDocumentId: "d2",
    });
  });

  it("sends the stored appliedAt instant back when only the title changed", async () => {
    const user = userEvent.setup();
    const fetchMock = mockFetch({
      "GET /api/applications/a1": stored(),
      "PUT /api/applications/a1": () => jsonResponse(stored()),
    });
    renderEdit();

    const title = await screen.findByLabelText("Puesto *");
    await user.type(title, " 2");
    await saveEdit(user);

    await waitFor(() => expect(puts(fetchMock)).toHaveLength(1));
    expect(putBody(fetchMock).appliedAt).toBe(AUTO_APPLIED_AT);
  });

  it("sends local noon for a changed date and null for a cleared one", async () => {
    const user = userEvent.setup();
    const fetchMock = mockFetch({
      "GET /api/applications/a1": stored(),
      "PUT /api/applications/a1": () => jsonResponse(stored()),
    });
    renderEdit();

    const date = await screen.findByLabelText("Fecha de envío");
    fireEvent.change(date, { target: { value: "2026-11-02" } });
    await saveEdit(user);
    await waitFor(() => expect(puts(fetchMock)).toHaveLength(1));
    expect(putBody(fetchMock).appliedAt).toBe(toLocalNoonIso("2026-11-02"));

    fireEvent.change(date, { target: { value: "" } });
    await saveEdit(user);
    await waitFor(() => expect(puts(fetchMock)).toHaveLength(2));
    const second = puts(fetchMock)[1]?.[1];
    expect(
      (JSON.parse(String(second?.body)) as Record<string, unknown>).appliedAt,
    ).toBeNull();
  });

  it("sends blank optional fields back as null", async () => {
    const user = userEvent.setup();
    const fetchMock = mockFetch({
      "GET /api/applications/a1": stored({ appliedAt: null }),
      "PUT /api/applications/a1": () => jsonResponse(stored()),
    });
    renderEdit();

    await screen.findByLabelText("Puesto *");
    await saveEdit(user);

    await waitFor(() => expect(puts(fetchMock)).toHaveLength(1));
    expect(putBody(fetchMock)).toMatchObject({
      location: null,
      workMode: null,
      salaryMin: null,
      currency: null,
      sourceUrl: null,
      notes: null,
      appliedAt: null,
    });
  });

  it("shows the not-found card with the list link supplied by the scene", async () => {
    mockFetch({
      "GET /api/applications/zzz": () =>
        jsonResponse(
          {
            error: { code: "NOT_FOUND", message: "Candidatura no encontrada" },
          },
          404,
        ),
    });
    renderEdit(() => {}, "zzz");

    expect(
      await screen.findByText("No encontramos esta candidatura"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Volver a Mis candidaturas" }),
    ).toHaveAttribute("href", "/applications-list-stub");
    expect(screen.queryByLabelText("Puesto *")).toBeNull();
  });

  it("shows the error card with «Reintentar» for a server failure and never the form", async () => {
    const user = userEvent.setup();
    let calls = 0;
    mockFetch({
      "GET /api/applications/a1": () => {
        calls += 1;
        return calls === 1
          ? jsonResponse(
              { error: { code: "INTERNAL_ERROR", message: "x" } },
              500,
            )
          : jsonResponse(stored());
      },
    });
    renderEdit();

    expect(
      await screen.findByText("No se pudo cargar la candidatura"),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("Puesto *")).toBeNull();

    await user.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(await screen.findByLabelText("Puesto *")).toHaveValue(
      "Frontend Developer",
    );
  });
});

describe("ApplicationEditContainer Documentos section", () => {
  it("shows the section after Seguimiento and before the actions, with both pickers empty", () => {
    renderForm();

    const section = screen.getByRole("region", { name: "Documentos" });
    expect(
      within(section).getByText(
        "Opcionales. Elige uno que ya tengas o sube uno nuevo.",
      ),
    ).toBeInTheDocument();
    const tracking = screen.getByRole("region", { name: "Seguimiento" });
    const save = screen.getByRole("button", { name: "Guardar candidatura" });
    expect(
      tracking.compareDocumentPosition(section) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      section.compareDocumentPosition(save) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    const cv = within(section).getByLabelText("Doble cv");
    const carta = within(section).getByLabelText("Doble carta");
    expect(cv).toHaveValue("");
    expect(carta).toHaveValue("");
    expect(
      cv.compareDocumentPosition(carta) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("saves the chosen ids and sends null after choosing none again", async () => {
    const user = userEvent.setup();
    const fetchMock = mockCreate();
    renderForm();

    await fillRequired(user);
    await user.selectOptions(screen.getByLabelText("Doble cv"), "d1");
    await user.selectOptions(screen.getByLabelText("Doble carta"), "d2");
    await submit(user);

    await waitFor(() => expect(posts(fetchMock)).toHaveLength(1));
    expect(lastPostBody(fetchMock)).toMatchObject({
      cvDocumentId: "d1",
      coverLetterDocumentId: "d2",
    });

    await user.selectOptions(screen.getByLabelText("Doble cv"), "");
    await user.selectOptions(screen.getByLabelText("Doble carta"), "");
    await submit(user);

    await waitFor(() => expect(posts(fetchMock)).toHaveLength(2));
    expect(lastPostBody(fetchMock)).toMatchObject({
      cvDocumentId: null,
      coverLetterDocumentId: null,
    });
  });

  it("opens an edit with the loaded ids selected and keeps them on a save that did not touch them", async () => {
    const user = userEvent.setup();
    const fetchMock = mockFetch({
      "GET /api/applications/a1": stored({
        cvDocumentId: "d1",
        coverLetterDocumentId: "d2",
      }),
      "PUT /api/applications/a1": () => jsonResponse(stored()),
    });
    renderEdit();

    expect(await screen.findByLabelText("Doble cv")).toHaveValue("d1");
    expect(screen.getByLabelText("Doble carta")).toHaveValue("d2");
    await user.type(screen.getByLabelText("Puesto *"), " 2");
    await saveEdit(user);

    await waitFor(() => expect(puts(fetchMock)).toHaveLength(1));
    expect(putBody(fetchMock)).toMatchObject({
      cvDocumentId: "d1",
      coverLetterDocumentId: "d2",
    });
  });

  it("passes a server 400 on one link only to that picker", async () => {
    const user = userEvent.setup();
    mockFetch({
      "POST /api/applications": () =>
        jsonResponse(
          {
            error: {
              code: "VALIDATION_ERROR",
              message: "Datos no válidos",
              details: { formErrors: [], fieldErrors: { cvDocumentId: ["x"] } },
            },
          },
          400,
        ),
    });
    renderForm();

    await fillRequired(user);
    await submit(user);

    expect(
      await screen.findByText("cv: Revisa este campo."),
    ).toBeInTheDocument();
    expect(screen.queryByText(/carta: /)).toBeNull();
    const cv = screen.getByLabelText("Doble cv");
    expect(cv).toHaveAttribute("aria-invalid", "true");
    await waitFor(() => expect(cv).toHaveFocus());
  });
});
