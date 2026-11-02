import { applicationSchema } from "@tfm/contracts";
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { jsonResponse, mockFetch } from "@/test/mock-fetch";
import { ApplicationDetailContainer } from "./application-detail.container";
import {
  mapInterviewFormToApiInput,
  validateInterviewForm,
} from "./application-detail.mapper";
import type { InterviewFormValues } from "./application-detail.vm";

// The scene supplies the real router link; pod tests use a plain anchor.
const renderLink = (link: { className?: string; children: ReactNode }) => (
  <a href="/stub" className={link.className}>
    {link.children}
  </a>
);

const makeApplication = (overrides: Record<string, unknown> = {}) =>
  applicationSchema.parse({
    id: "a1",
    title: "Frontend Developer",
    company: "Lemoncode",
    status: "enviada",
    appliedAt: "2026-10-30T09:00:00.000Z",
    statusHistory: [
      { status: "guardada", at: "2026-10-12T10:00:00.000Z" },
      { status: "enviada", at: "2026-10-30T09:00:00.000Z" },
    ],
    interviews: [],
    createdAt: "2026-10-12T10:00:00.000Z",
    updatedAt: "2026-10-30T09:00:00.000Z",
    ownerId: null,
    ...overrides,
  });

const renderDetail = () =>
  render(
    <ApplicationDetailContainer
      applicationId="a1"
      onDeleted={() => {}}
      renderListLink={renderLink}
      renderEditLink={renderLink}
      notice=""
      focusHeadingRef={() => {}}
    />,
  );

const postCalls = (fetchMock: ReturnType<typeof mockFetch>) =>
  fetchMock.mock.calls.filter(([, init]) => init?.method === "POST");

const openAddDialog = async () => {
  const opener = await screen.findByRole("button", { name: "Añadir ronda" });
  await userEvent.click(opener);
  return { opener, dialog: await screen.findByRole("dialog") };
};

const baseValues = (
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

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("rounds form mapper", () => {
  beforeEach(() => {
    vi.stubEnv("TZ", "Europe/Madrid");
  });

  it("converts the local date and time to ISO 8601 UTC", () => {
    expect(
      mapInterviewFormToApiInput(
        baseValues({ scheduledAt: "2026-11-05T10:30" }),
      ).scheduledAt,
    ).toBe("2026-11-05T09:30:00.000Z");
  });

  it("sends an empty date as null", () => {
    expect(mapInterviewFormToApiInput(baseValues()).scheduledAt).toBeNull();
  });

  it("sends blank notes as null and keeps real notes", () => {
    expect(
      mapInterviewFormToApiInput(baseValues({ notes: "   " })).notes,
    ).toBeNull();
    expect(
      mapInterviewFormToApiInput(baseValues({ notes: "Llevar portátil" }))
        .notes,
    ).toBe("Llevar portátil");
  });

  it("reports an unparsable date under the field instead of dropping it", () => {
    expect(
      validateInterviewForm(baseValues({ scheduledAt: "nope" })),
    ).toStrictEqual({
      fields: { scheduledAt: "Introduce una fecha y hora válidas." },
    });
  });

  it("reports notes longer than 5,000 characters after trim", () => {
    expect(
      validateInterviewForm(baseValues({ notes: "a".repeat(5001) })),
    ).toStrictEqual({
      fields: { notes: "Las notas admiten hasta 5.000 caracteres." },
    });
    expect(
      validateInterviewForm(baseValues({ notes: "a".repeat(5000) })),
    ).toBeUndefined();
  });

  it("accepts a past date with no error", () => {
    expect(
      validateInterviewForm(baseValues({ scheduledAt: "2025-01-10T09:00" })),
    ).toBeUndefined();
  });
});

describe("round dialog fields", () => {
  beforeEach(() => {
    vi.stubEnv("TZ", "Europe/Madrid");
  });

  it("opens with the defaults of the add dialog in the specified order", async () => {
    mockFetch({ "GET /api/applications/a1": makeApplication() });
    renderDetail();
    const { dialog } = await openAddDialog();

    const date = within(dialog).getByLabelText("Fecha y hora");
    expect(date).toHaveAttribute("type", "datetime-local");
    expect(date).toHaveValue("");
    expect(
      within(dialog).getByText("Opcional. Hora en tu zona horaria."),
    ).toBeInTheDocument();
    const mode = within(dialog).getByRole("radiogroup", { name: "Modalidad" });
    const outcome = within(dialog).getByRole("radiogroup", {
      name: "Resultado",
    });
    expect(within(mode).getByRole("radio", { name: "Online" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    expect(
      within(outcome).getByRole("radio", { name: "Pendiente" }),
    ).toHaveAttribute("aria-checked", "true");
    expect(within(mode).getAllByRole("radio")).toHaveLength(3);
    expect(within(outcome).getAllByRole("radio")).toHaveLength(3);
    const notes = within(dialog).getByRole("textbox", { name: "Notas" });
    expect(notes).toHaveAttribute("maxlength", "5000");
    expect(notes).toHaveAttribute(
      "placeholder",
      "Preguntas, impresiones, próximos pasos…",
    );
    expect(within(dialog).getByText("0 / 5.000")).toBeInTheDocument();
    expect(
      within(dialog).getByText("0 / 5.000").closest("[aria-live]"),
    ).toBeNull();

    const order = ["Tipo", "Ronda", "Fecha y hora", "Notas"].map((name) =>
      within(dialog).getByLabelText(new RegExp(`^${name}`)),
    );
    const positions = order.map((element) =>
      Array.from(dialog.querySelectorAll("*")).indexOf(element),
    );
    expect(positions).toStrictEqual([...positions].sort((a, b) => a - b));
  });

  it("keeps the selected toggle when it is pressed again and moves with the arrow keys", async () => {
    mockFetch({ "GET /api/applications/a1": makeApplication() });
    renderDetail();
    const { dialog } = await openAddDialog();
    const online = within(dialog).getByRole("radio", { name: "Online" });

    await userEvent.click(online);
    expect(online).toHaveAttribute("aria-checked", "true");

    online.focus();
    await userEvent.keyboard("{ArrowRight}");
    expect(
      within(dialog).getByRole("radio", { name: "Presencial" }),
    ).toHaveFocus();
    await userEvent.keyboard(" ");
    expect(
      within(dialog).getByRole("radio", { name: "Presencial" }),
    ).toHaveAttribute("aria-checked", "true");
    expect(online).toHaveAttribute("aria-checked", "false");
  });

  it("marks the selected item with the primary tokens", async () => {
    mockFetch({ "GET /api/applications/a1": makeApplication() });
    renderDetail();
    const { dialog } = await openAddDialog();
    const item = within(dialog).getByRole("radio", { name: "No superada" });
    expect(item.className).toContain("data-[state=on]:bg-primary");
    expect(item.className).toContain("data-[state=on]:text-primary-foreground");
    expect(item.className).toContain("whitespace-normal");
    expect(item.className).toContain("min-h-11");
  });

  it("sends every field and converts the local time to UTC", async () => {
    const fetchMock = mockFetch({
      "GET /api/applications/a1": makeApplication(),
      "POST /api/applications/a1/interviews": () =>
        jsonResponse(makeApplication(), 201),
    });
    renderDetail();
    const { dialog } = await openAddDialog();

    await userEvent.selectOptions(
      within(dialog).getByRole("combobox", { name: /Tipo/ }),
      "manager",
    );
    await userEvent.type(
      within(dialog).getByLabelText("Fecha y hora"),
      "2026-11-05T10:30",
    );
    await userEvent.click(
      within(dialog).getByRole("radio", { name: "Presencial" }),
    );
    await userEvent.click(
      within(dialog).getByRole("radio", { name: "Superada" }),
    );
    await userEvent.type(
      within(dialog).getByRole("textbox", { name: "Notas" }),
      "Llevar portátil",
    );
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Guardar ronda" }),
    );

    await vi.waitFor(() => expect(postCalls(fetchMock)).toHaveLength(1));
    expect(
      JSON.parse(String(postCalls(fetchMock)[0]?.[1]?.body)),
    ).toStrictEqual({
      type: "manager",
      round: 1,
      scheduledAt: "2026-11-05T09:30:00.000Z",
      mode: "presencial",
      outcome: "superada",
      notes: "Llevar portátil",
    });
  });

  it("accepts a past date with no error", async () => {
    const fetchMock = mockFetch({
      "GET /api/applications/a1": makeApplication(),
      "POST /api/applications/a1/interviews": () =>
        jsonResponse(makeApplication(), 201),
    });
    renderDetail();
    const { dialog } = await openAddDialog();

    await userEvent.selectOptions(
      within(dialog).getByRole("combobox", { name: /Tipo/ }),
      "tecnica",
    );
    await userEvent.type(
      within(dialog).getByLabelText("Fecha y hora"),
      "2025-01-10T09:00",
    );
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Guardar ronda" }),
    );

    await vi.waitFor(() => expect(postCalls(fetchMock)).toHaveLength(1));
    expect(
      JSON.parse(String(postCalls(fetchMock)[0]?.[1]?.body)).scheduledAt,
    ).toBe("2025-01-10T08:00:00.000Z");
    expect(
      screen.queryByText("Introduce una fecha y hora válidas."),
    ).not.toBeInTheDocument();
  });

  it("counts the typed characters and the limit with the es-ES grouping", async () => {
    mockFetch({ "GET /api/applications/a1": makeApplication() });
    renderDetail();
    const { dialog } = await openAddDialog();
    const notes = within(dialog).getByRole("textbox", { name: "Notas" });

    await userEvent.type(notes, "abc");
    expect(within(dialog).getByText("3 / 5.000")).toBeInTheDocument();

    fireEvent.change(notes, { target: { value: "a".repeat(5000) } });
    expect(within(dialog).getByText("5.000 / 5.000")).toBeInTheDocument();
  });

  it("explains notes past the limit under the field and sends nothing", async () => {
    const fetchMock = mockFetch({
      "GET /api/applications/a1": makeApplication(),
    });
    renderDetail();
    const { dialog } = await openAddDialog();
    await userEvent.selectOptions(
      within(dialog).getByRole("combobox", { name: /Tipo/ }),
      "tecnica",
    );
    fireEvent.change(within(dialog).getByRole("textbox", { name: "Notas" }), {
      target: { value: "a".repeat(5001) },
    });

    await userEvent.click(
      within(dialog).getByRole("button", { name: "Guardar ronda" }),
    );

    expect(
      await within(dialog).findByText(
        "Las notas admiten hasta 5.000 caracteres.",
      ),
    ).toBeInTheDocument();
    expect(postCalls(fetchMock)).toHaveLength(0);
  });

  it("starts every opening from the defaults", async () => {
    mockFetch({ "GET /api/applications/a1": makeApplication() });
    renderDetail();
    const first = await openAddDialog();
    await userEvent.click(
      within(first.dialog).getByRole("radio", { name: "Teléfono" }),
    );
    await userEvent.click(
      within(first.dialog).getByRole("radio", { name: "Superada" }),
    );
    await userEvent.type(
      within(first.dialog).getByRole("textbox", { name: "Notas" }),
      "algo",
    );
    await userEvent.click(
      within(first.dialog).getByRole("button", { name: "Descartar cambios" }),
    );
    await vi.waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );

    const { dialog } = await openAddDialog();

    expect(
      within(dialog).getByRole("radio", { name: "Online" }),
    ).toHaveAttribute("aria-checked", "true");
    expect(
      within(dialog).getByRole("radio", { name: "Pendiente" }),
    ).toHaveAttribute("aria-checked", "true");
    expect(within(dialog).getByRole("textbox", { name: "Notas" })).toHaveValue(
      "",
    );
    expect(within(dialog).getByText("0 / 5.000")).toBeInTheDocument();
  });
});
