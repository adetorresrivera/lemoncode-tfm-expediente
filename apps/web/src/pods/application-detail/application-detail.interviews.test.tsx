import { applicationSchema } from "@tfm/contracts";
import {
  fireEvent,
  render,
  renderHook,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { jsonResponse, mockFetch } from "@/test/mock-fetch";
import { ApplicationDetailContainer } from "./application-detail.container";
import { useApplicationDetail } from "./application-detail.hooks";
import {
  mapApplicationFromApiToDetailVm,
  mapInterviewFormToApiInput,
  validateInterviewForm,
} from "./application-detail.mapper";
import type { InterviewFormValues } from "./application-detail.vm";
import { InterviewOutcomeBadge } from "./components/interview-outcome-badge";

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

const round = (overrides: Record<string, unknown> = {}) => ({
  id: "i1",
  round: 1,
  type: "tecnica",
  scheduledAt: null,
  mode: "online",
  notes: null,
  outcome: "pendiente",
  ...overrides,
});

describe("rounds view model", () => {
  beforeEach(() => {
    vi.stubEnv("TZ", "Europe/Madrid");
  });

  it("lists by round, then date with null last (as instants), then id, on a copy", () => {
    const application = makeApplication({
      interviews: [
        round({ id: "i3", round: 3 }),
        round({ id: "i2n", round: 2 }),
        round({ id: "i2b", round: 2, scheduledAt: "2026-11-05T11:00:00.000Z" }),
        round({ id: "i1", round: 1 }),
        // Same instant as 09:00Z written with an offset-free millisecond form: not a string compare.
        round({ id: "i2a", round: 2, scheduledAt: "2026-11-05T09:00:00.000Z" }),
      ],
    });

    const vm = mapApplicationFromApiToDetailVm(application);

    expect(vm.interviews.map((item) => item.id)).toStrictEqual([
      "i1",
      "i2a",
      "i2b",
      "i2n",
      "i3",
    ]);
    expect(application.interviews.map((item) => item.id)).toStrictEqual([
      "i3",
      "i2n",
      "i2b",
      "i1",
      "i2a",
    ]);
  });

  it("compares dates as instants, not as strings", () => {
    const vm = mapApplicationFromApiToDetailVm(
      makeApplication({
        interviews: [
          round({ id: "later", scheduledAt: "2026-11-05T10:00:00.000Z" }),
          round({ id: "sooner", scheduledAt: "2026-11-05T09:59:59.999Z" }),
          round({ id: "sub-second", scheduledAt: "2026-11-05T09:59:59Z" }),
        ],
      }),
    );
    expect(vm.interviews.map((item) => item.id)).toStrictEqual([
      "sub-second",
      "sooner",
      "later",
    ]);
  });

  it("falls back to the id when round and date are equal", () => {
    const vm = mapApplicationFromApiToDetailVm(
      makeApplication({
        interviews: [
          round({ id: "b", round: 2, scheduledAt: "2026-11-05T09:00:00.000Z" }),
          round({ id: "a", round: 2, scheduledAt: "2026-11-05T09:00:00.000Z" }),
        ],
      }),
    );
    expect(vm.interviews.map((item) => item.id)).toStrictEqual(["a", "b"]);
  });

  it("labels the date in the browser zone, the mode and the outcome", () => {
    const [item] = mapApplicationFromApiToDetailVm(
      makeApplication({
        interviews: [
          round({
            scheduledAt: "2026-11-05T09:30:00.000Z",
            mode: "presencial",
            outcome: "no_superada",
          }),
        ],
      }),
    ).interviews;
    expect(item?.dateLabel).toBe("5 nov. 2026, 10:30");
    expect(item?.modeLabel).toBe("Presencial");
    expect(item?.outcomeLabel).toBe("No superada");
  });

  it("has no date label without a date", () => {
    const [item] = mapApplicationFromApiToDetailVm(
      makeApplication({ interviews: [round()] }),
    ).interviews;
    expect(item?.dateLabel).toBeNull();
  });
});

describe("outcome badge", () => {
  it.each([
    ["pendiente", "Pendiente"],
    ["superada", "Superada"],
    ["no_superada", "No superada"],
  ] as const)("renders %s as a neutral chip with an icon", (outcome, label) => {
    const { container } = render(
      <InterviewOutcomeBadge outcome={outcome} label={label} />,
    );
    const badge = screen.getByText(label);
    expect(badge.className).toContain("bg-muted");
    expect(badge.className).toContain("text-foreground");
    expect(container.querySelectorAll("svg")).toHaveLength(1);
    expect(container.querySelector("svg")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
  });

  it("uses the same class list for all three outcomes", () => {
    const classes = (["pendiente", "superada", "no_superada"] as const).map(
      (outcome) => {
        const { container, unmount } = render(
          <InterviewOutcomeBadge outcome={outcome} label="x" />,
        );
        const value = container.firstElementChild?.getAttribute("class");
        unmount();
        return value;
      },
    );
    expect(new Set(classes).size).toBe(1);
  });
});

const roundsRegion = () =>
  screen.getByRole("region", { name: "Rondas de entrevista" });

const roundsList = async () =>
  within(
    await screen.findByRole("region", { name: "Rondas de entrevista" }),
  ).getByRole("list");

describe("rounds list", () => {
  beforeEach(() => {
    vi.stubEnv("TZ", "Europe/Madrid");
  });

  it("shows the title, date, mode and outcome of a round in reading order", async () => {
    mockFetch({
      "GET /api/applications/a1": makeApplication({
        interviews: [
          round({
            scheduledAt: "2026-11-05T09:30:00.000Z",
            mode: "presencial",
            outcome: "no_superada",
          }),
        ],
      }),
    });
    renderDetail();

    const item = within(await roundsList()).getByRole("listitem");
    expect(
      within(item).getByRole("heading", {
        level: 3,
        name: "Ronda 1 · Técnica",
      }),
    ).toBeInTheDocument();
    const time = within(item).getByText("5 nov. 2026, 10:30");
    expect(time.tagName).toBe("TIME");
    expect(time).toHaveAttribute("datetime", "2026-11-05T09:30:00.000Z");
    expect(item.textContent).toMatch(
      /Fecha: 5 nov\. 2026, 10:30.*Modalidad: Presencial.*Resultado: No superada/,
    );
  });

  it("shows «Sin fecha» without a time element when there is no date", async () => {
    mockFetch({
      "GET /api/applications/a1": makeApplication({ interviews: [round()] }),
    });
    renderDetail();

    const item = within(await roundsList()).getByRole("listitem");
    expect(within(item).getByText("Sin fecha")).toBeInTheDocument();
    expect(item.querySelector("time")).toBeNull();
    expect(item.textContent).toMatch(
      /Fecha: Sin fecha.*Modalidad: Online.*Resultado: Pendiente/,
    );
  });

  it("lists the rounds in the order of the view model", async () => {
    mockFetch({
      "GET /api/applications/a1": makeApplication({
        interviews: [
          round({ id: "i2", round: 2, type: "cultural" }),
          round({ id: "i1", round: 1, type: "rrhh" }),
        ],
      }),
    });
    renderDetail();

    const titles = within(await roundsList())
      .getAllByRole("heading", { level: 3 })
      .map((heading) => heading.textContent);
    expect(titles).toStrictEqual([
      "Ronda 1 · Recursos humanos",
      "Ronda 2 · Cultural",
    ]);
  });

  describe("notes", () => {
    it("folds the notes behind «Ver notas» and shows markup as text", async () => {
      mockFetch({
        "GET /api/applications/a1": makeApplication({
          interviews: [
            round({ notes: "Llevar <b>portátil</b>\nSegunda línea" }),
          ],
        }),
      });
      renderDetail();

      const trigger = await screen.findByRole("button", {
        name: "Ver notas de la ronda 1",
      });
      expect(trigger).toHaveTextContent("Ver notas");
      expect(screen.queryByText(/Llevar/)).not.toBeInTheDocument();

      await userEvent.click(trigger);

      const text = screen.getByText(/Llevar/);
      expect(text.textContent).toBe("Llevar <b>portátil</b>\nSegunda línea");
      expect(text.querySelector("b")).toBeNull();
      expect(text.className).toContain("whitespace-pre-wrap");
      expect(text.className).toContain("break-words");
      expect(
        screen.getByRole("button", { name: "Ocultar notas de la ronda 1" }),
      ).toBeInTheDocument();
    });

    it.each([[null], [""]])(
      "renders no trigger for notes %j",
      async (notes) => {
        mockFetch({
          "GET /api/applications/a1": makeApplication({
            interviews: [round({ notes })],
          }),
        });
        renderDetail();

        await roundsList();
        expect(
          screen.queryByRole("button", { name: /Ver notas/ }),
        ).not.toBeInTheDocument();
      },
    );
  });

  describe("zero, one and many", () => {
    it("shows only the empty-state sentence without rounds", async () => {
      mockFetch({ "GET /api/applications/a1": makeApplication() });
      renderDetail();

      await screen.findByRole("button", { name: "Añadir ronda" });
      expect(
        within(roundsRegion()).getByText(
          "Aún no hay rondas. Añade la primera cuando te convoquen.",
        ),
      ).toBeInTheDocument();
      expect(
        within(roundsRegion()).queryByRole("list"),
      ).not.toBeInTheDocument();
    });

    it("renders one row for one round", async () => {
      mockFetch({
        "GET /api/applications/a1": makeApplication({ interviews: [round()] }),
      });
      renderDetail();

      const list = await roundsList();
      expect(within(list).getAllByRole("listitem")).toHaveLength(1);
    });

    it("renders twelve rounds in one list with no inner scroll box", async () => {
      mockFetch({
        "GET /api/applications/a1": makeApplication({
          interviews: Array.from({ length: 12 }, (_, index) =>
            round({ id: `i${index + 1}`, round: index + 1 }),
          ),
        }),
      });
      renderDetail();

      const list = await roundsList();
      expect(within(list).getAllByRole("listitem")).toHaveLength(12);
      expect(list.className).not.toMatch(/overflow|max-h/);
    });
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

const deferred = () => {
  let resolve: (response: Response) => void = () => {};
  const promise = new Promise<Response>((r) => {
    resolve = r;
  });
  return { promise, resolve };
};

const serverError = () =>
  jsonResponse({ error: { code: "INTERNAL_ERROR", message: "x" } }, 500);

const callsOf = (fetchMock: ReturnType<typeof mockFetch>, method: string) =>
  fetchMock.mock.calls.filter(([, init]) => init?.method === method);

const threeRounds = (overrides: Record<string, unknown> = {}) =>
  makeApplication({
    interviews: [
      round({
        id: "i1",
        round: 1,
        type: "rrhh",
        scheduledAt: "2026-11-03T08:00:00.000Z",
        notes: "Primera",
      }),
      round({
        id: "i2",
        round: 2,
        type: "tecnica",
        scheduledAt: "2026-11-05T09:30:00.000Z",
        mode: "presencial",
        outcome: "superada",
        notes: "Salió bien",
      }),
      round({ id: "i3", round: 3, type: "cultural" }),
    ],
    ...overrides,
  });

const editButton = (n: number) =>
  screen.findByRole("button", { name: `Editar ronda ${n}` });

const openEditDialog = async (n: number) => {
  const opener = await editButton(n);
  await userEvent.click(opener);
  return { opener, dialog: await screen.findByRole("dialog") };
};

const roundField = (dialog: HTMLElement) =>
  within(dialog).getByRole("spinbutton", { name: /^Ronda/ });

describe("round row actions", () => {
  it("shows an edit button of 44 px with a decorative icon on every row", async () => {
    mockFetch({ "GET /api/applications/a1": threeRounds() });
    renderDetail();

    const button = await editButton(2);
    expect(button.className).toContain("size-11");
    expect(button).toHaveAttribute("type", "button");
    expect(button.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
    expect(
      screen.getAllByRole("button", { name: /^Editar ronda \d$/ }),
    ).toHaveLength(3);
  });

  it("keeps the title wrapping and the actions in place", async () => {
    mockFetch({ "GET /api/applications/a1": threeRounds() });
    renderDetail();

    const button = await editButton(1);
    const heading = within(await roundsList()).getAllByRole("heading", {
      level: 3,
    })[0];
    expect(heading?.className).toContain("break-words");
    expect(button.parentElement?.className).toContain("shrink-0");
  });
});

describe("edit a round", () => {
  beforeEach(() => {
    vi.stubEnv("TZ", "Europe/Madrid");
  });

  it("opens with the stored values in local time", async () => {
    mockFetch({ "GET /api/applications/a1": threeRounds() });
    renderDetail();

    const { dialog } = await openEditDialog(2);

    expect(
      within(dialog).getByRole("heading", { name: "Editar ronda 2" }),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByText("Cambia los datos de esta ronda."),
    ).toBeInTheDocument();
    expect(within(dialog).getByRole("combobox", { name: /Tipo/ })).toHaveValue(
      "tecnica",
    );
    expect(roundField(dialog)).toHaveValue(2);
    expect(within(dialog).getByLabelText("Fecha y hora")).toHaveValue(
      "2026-11-05T10:30",
    );
    expect(
      within(dialog).getByRole("radio", { name: "Presencial" }),
    ).toHaveAttribute("aria-checked", "true");
    expect(
      within(dialog).getByRole("radio", { name: "Superada" }),
    ).toHaveAttribute("aria-checked", "true");
    expect(within(dialog).getByRole("textbox", { name: "Notas" })).toHaveValue(
      "Salió bien",
    );
  });

  it("opens a round without date or notes empty and saves null for both", async () => {
    const fetchMock = mockFetch({
      "GET /api/applications/a1": threeRounds(),
      "PUT /api/applications/a1/interviews/i3": () =>
        jsonResponse(threeRounds()),
    });
    renderDetail();
    const { dialog } = await openEditDialog(3);

    expect(within(dialog).getByLabelText("Fecha y hora")).toHaveValue("");
    expect(within(dialog).getByRole("textbox", { name: "Notas" })).toHaveValue(
      "",
    );
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Guardar ronda" }),
    );

    await vi.waitFor(() => expect(callsOf(fetchMock, "PUT")).toHaveLength(1));
    expect(
      JSON.parse(String(callsOf(fetchMock, "PUT")[0]?.[1]?.body)),
    ).toStrictEqual({
      type: "cultural",
      round: 3,
      scheduledAt: null,
      mode: "online",
      outcome: "pendiente",
      notes: null,
    });
  });

  it("requires «Ronda» in the edit dialog and shows no hint, unlike the add dialog", async () => {
    mockFetch({ "GET /api/applications/a1": threeRounds() });
    renderDetail();

    const { dialog } = await openEditDialog(2);

    const input = roundField(dialog);
    expect(input).toHaveAttribute("aria-required", "true");
    expect(
      dialog.querySelector('label[for="interview-round"]')?.textContent,
    ).toBe("Ronda *");
    expect(
      within(dialog).queryByText("Si lo vacías, se asigna la siguiente."),
    ).not.toBeInTheDocument();
    expect(input).not.toHaveAttribute("aria-describedby");

    await userEvent.click(
      within(dialog).getByRole("button", { name: "Descartar cambios" }),
    );
    await vi.waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    const add = await openAddDialog();
    expect(
      within(add.dialog).getByText("Si lo vacías, se asigna la siguiente."),
    ).toBeInTheDocument();
    expect(roundField(add.dialog)).not.toHaveAttribute("aria-required");
  });

  it.each([[""], ["0"]])(
    "rejects «Ronda» %j with the field error, focus on it and no request",
    async (value) => {
      const fetchMock = mockFetch({
        "GET /api/applications/a1": threeRounds(),
      });
      renderDetail();
      const { dialog } = await openEditDialog(2);
      const input = roundField(dialog);
      await userEvent.clear(input);
      if (value !== "") await userEvent.type(input, value);

      await userEvent.click(
        within(dialog).getByRole("button", { name: "Guardar ronda" }),
      );

      expect(
        await within(dialog).findByText(
          "La ronda debe ser un número entero de 1 o más.",
        ),
      ).toBeInTheDocument();
      await vi.waitFor(() => expect(roundField(dialog)).toHaveFocus());
      expect(callsOf(fetchMock, "PUT")).toHaveLength(0);
    },
  );

  it("validates «Ronda» by mode in the mapper", () => {
    expect(
      validateInterviewForm(baseValues({ round: "" }), "edit"),
    ).toStrictEqual({
      fields: { round: "La ronda debe ser un número entero de 1 o más." },
    });
    expect(
      validateInterviewForm(baseValues({ round: "" }), "add"),
    ).toBeUndefined();
    expect(
      validateInterviewForm(baseValues({ round: "  " }), "edit"),
    ).toBeDefined();
    expect(
      validateInterviewForm(baseValues({ round: "2" }), "edit"),
    ).toBeUndefined();
  });

  it("fills the edit values of the view model from the stored round", () => {
    vi.stubEnv("TZ", "Europe/Madrid");
    const vm = mapApplicationFromApiToDetailVm(threeRounds());
    expect(vm.interviews[1]?.editValues).toStrictEqual({
      type: "tecnica",
      round: "2",
      scheduledAt: "2026-11-05T10:30",
      mode: "presencial",
      outcome: "superada",
      notes: "Salió bien",
    });
    expect(vm.interviews[2]?.editValues.scheduledAt).toBe("");
    expect(vm.interviews[2]?.editValues.notes).toBe("");
  });

  it("rejects update without a request when «Ronda» is empty", async () => {
    const fetchMock = mockFetch({ "GET /api/applications/a1": threeRounds() });
    const { result } = renderHook(() =>
      useApplicationDetail("a1", { onDeleted: () => {} }),
    );
    await waitFor(() => expect(result.current.status).toBe("ok"));
    const values = result.current.vm?.interviews[1]?.editValues;
    if (values === undefined) throw new Error("The application did not load");

    await expect(
      result.current.interviewActions.update("i2", { ...values, round: "" }),
    ).rejects.toThrow();

    expect(callsOf(fetchMock, "PUT")).toHaveLength(0);
  });

  it("saves the change, closes, announces it and returns focus to the row's edit button", async () => {
    const updated = threeRounds({
      interviews: [
        round({ id: "i1", round: 1, type: "rrhh" }),
        round({
          id: "i2",
          round: 2,
          type: "tecnica",
          scheduledAt: "2026-11-05T09:30:00.000Z",
          mode: "presencial",
          outcome: "no_superada",
          notes: "Salió bien",
        }),
        round({ id: "i3", round: 3, type: "cultural" }),
      ],
    });
    const fetchMock = mockFetch({
      "GET /api/applications/a1": threeRounds(),
      "PUT /api/applications/a1/interviews/i2": () => jsonResponse(updated),
    });
    renderDetail();
    const { opener, dialog } = await openEditDialog(2);

    await userEvent.click(
      within(dialog).getByRole("radio", { name: "No superada" }),
    );
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Guardar ronda" }),
    );

    await vi.waitFor(() => expect(callsOf(fetchMock, "PUT")).toHaveLength(1));
    expect(callsOf(fetchMock, "PUT")[0]?.[0]).toBe(
      "/api/applications/a1/interviews/i2",
    );
    expect(
      JSON.parse(String(callsOf(fetchMock, "PUT")[0]?.[1]?.body)),
    ).toStrictEqual({
      type: "tecnica",
      round: 2,
      scheduledAt: "2026-11-05T09:30:00.000Z",
      mode: "presencial",
      outcome: "no_superada",
      notes: "Salió bien",
    });
    await vi.waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    expect(within(roundsRegion()).getByRole("status")).toHaveTextContent(
      "Ronda actualizada.",
    );
    expect(opener).toHaveFocus();
    expect(
      within(roundsRegion()).getByText("No superada", { selector: "span" }),
    ).toBeInTheDocument();
  });

  it("sends the stored date untouched when only another field is edited", async () => {
    // 01:30:15.250Z is the second pass of the Madrid autumn overlap and carries seconds: the
    // control shows 02:30 and cannot hold either detail.
    const stored = "2026-10-25T01:30:15.250Z";
    const application = makeApplication({
      interviews: [round({ id: "i1", round: 1, scheduledAt: stored })],
    });
    const fetchMock = mockFetch({
      "GET /api/applications/a1": application,
      "PUT /api/applications/a1/interviews/i1": () => jsonResponse(application),
    });
    renderDetail();
    const { dialog } = await openEditDialog(1);
    expect(within(dialog).getByLabelText("Fecha y hora")).toHaveValue(
      "2026-10-25T02:30",
    );

    await userEvent.click(
      within(dialog).getByRole("radio", { name: "Superada" }),
    );
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Guardar ronda" }),
    );

    await vi.waitFor(() => expect(callsOf(fetchMock, "PUT")).toHaveLength(1));
    expect(
      JSON.parse(String(callsOf(fetchMock, "PUT")[0]?.[1]?.body)),
    ).toMatchObject({ scheduledAt: stored, outcome: "superada" });
  });

  it("sends the new date once the user changes the date control", async () => {
    const stored = "2026-10-25T01:30:15.250Z";
    const application = makeApplication({
      interviews: [round({ id: "i1", round: 1, scheduledAt: stored })],
    });
    const fetchMock = mockFetch({
      "GET /api/applications/a1": application,
      "PUT /api/applications/a1/interviews/i1": () => jsonResponse(application),
    });
    renderDetail();
    const { dialog } = await openEditDialog(1);

    fireEvent.change(within(dialog).getByLabelText("Fecha y hora"), {
      target: { value: "2026-11-05T10:30" },
    });
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Guardar ronda" }),
    );

    await vi.waitFor(() => expect(callsOf(fetchMock, "PUT")).toHaveLength(1));
    expect(
      JSON.parse(String(callsOf(fetchMock, "PUT")[0]?.[1]?.body)),
    ).toMatchObject({ scheduledAt: "2026-11-05T09:30:00.000Z" });
  });

  it("keeps the stored instant in the mapper only while the control holds the loaded value", () => {
    const loaded = {
      local: "2026-10-25T02:30",
      iso: "2026-10-25T01:30:15.250Z",
    };
    expect(
      mapInterviewFormToApiInput(
        baseValues({ scheduledAt: "2026-10-25T02:30" }),
        loaded,
      ).scheduledAt,
    ).toBe("2026-10-25T01:30:15.250Z");
    expect(
      mapInterviewFormToApiInput(
        baseValues({ scheduledAt: "2026-10-26T02:30" }),
        loaded,
      ).scheduledAt,
    ).toBe("2026-10-26T01:30:00.000Z");
    expect(
      mapInterviewFormToApiInput(baseValues({ scheduledAt: "" }), loaded)
        .scheduledAt,
    ).toBeNull();
  });

  it("keeps the dialog open with the values and an error when the PUT fails", async () => {
    const fetchMock = mockFetch({
      "GET /api/applications/a1": threeRounds(),
      "PUT /api/applications/a1/interviews/i2": serverError,
    });
    renderDetail();
    const { dialog } = await openEditDialog(2);
    await userEvent.click(
      within(dialog).getByRole("radio", { name: "No superada" }),
    );

    await userEvent.click(
      within(dialog).getByRole("button", { name: "Guardar ronda" }),
    );

    expect(
      await within(dialog).findByText(
        "No se pudo guardar la ronda. Inténtalo de nuevo.",
      ),
    ).toBeInTheDocument();
    expect(callsOf(fetchMock, "PUT")).toHaveLength(1);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(
      within(dialog).getByRole("radio", { name: "No superada" }),
    ).toHaveAttribute("aria-checked", "true");
  });

  it("reads «Guardando…» and cannot be closed while the PUT is pending", async () => {
    const put = deferred();
    mockFetch({
      "GET /api/applications/a1": threeRounds(),
      "PUT /api/applications/a1/interviews/i2": () => put.promise,
    });
    renderDetail();
    const { dialog } = await openEditDialog(2);

    await userEvent.click(
      within(dialog).getByRole("button", { name: "Guardar ronda" }),
    );

    expect(
      await within(dialog).findByRole("button", { name: "Guardando…" }),
    ).toBeInTheDocument();
    await userEvent.keyboard("{Escape}");
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    put.resolve(jsonResponse(threeRounds()));
    await vi.waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
  });

  it("disables the row actions while a status change is pending", async () => {
    const patch = deferred();
    mockFetch({
      "GET /api/applications/a1": threeRounds(),
      "PATCH /api/applications/a1/status": () => patch.promise,
    });
    renderDetail();
    await userEvent.selectOptions(
      await screen.findByRole("combobox", { name: "Cambiar estado" }),
      "rechazada",
    );

    const button = await editButton(1);
    expect(button).toHaveAttribute("aria-disabled", "true");
    await userEvent.click(button);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    patch.resolve(jsonResponse(threeRounds({ status: "rechazada" })));
    await vi.waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Editar ronda 1" }),
      ).toHaveAttribute("aria-disabled", "false"),
    );
  });
});

const deleteButton = (n: number) =>
  screen.findByRole("button", { name: `Eliminar ronda ${n}` });

const openDeleteDialog = async (n: number) => {
  const opener = await deleteButton(n);
  await userEvent.click(opener);
  return { opener, dialog: await screen.findByRole("alertdialog") };
};

const withoutRound = (id: string) =>
  makeApplication({
    interviews: [
      round({ id: "i1", round: 1, type: "rrhh" }),
      round({ id: "i2", round: 2, type: "tecnica" }),
      round({ id: "i3", round: 3, type: "cultural" }),
    ].filter((item) => item.id !== id),
  });

describe("delete a round", () => {
  it("shows a delete button of 44 px whose icon carries no destructive token", async () => {
    mockFetch({ "GET /api/applications/a1": threeRounds() });
    renderDetail();

    const button = await deleteButton(2);
    expect(button.className).toContain("size-11");
    const icon = button.querySelector("svg");
    expect(icon).toHaveAttribute("aria-hidden", "true");
    expect(icon?.getAttribute("class") ?? "").not.toContain("destructive");
    expect(
      screen.getAllByRole("button", { name: /^Eliminar ronda \d$/ }),
    ).toHaveLength(3);
  });

  it("asks for confirmation with the round and its type, focusing «Conservar ronda»", async () => {
    mockFetch({ "GET /api/applications/a1": threeRounds() });
    renderDetail();

    const { dialog } = await openDeleteDialog(2);

    expect(
      within(dialog).getByRole("heading", { name: "¿Eliminar la ronda 2?" }),
    ).toBeInTheDocument();
    const description = within(dialog).getByText(
      "Vas a eliminar la ronda 2 (Técnica). Esta acción no se puede deshacer.",
    );
    expect(description.className).toContain("break-words");
    expect(
      within(dialog).getByRole("button", { name: "Conservar ronda" }),
    ).toHaveFocus();
  });

  it("tells two rounds with the same number apart by their type", async () => {
    mockFetch({
      "GET /api/applications/a1": makeApplication({
        interviews: [
          round({ id: "ia", round: 2, type: "tecnica" }),
          round({ id: "ib", round: 2, type: "cultural" }),
        ],
      }),
    });
    renderDetail();

    const buttons = await screen.findAllByRole("button", {
      name: "Eliminar ronda 2",
    });
    await userEvent.click(buttons[0] as HTMLElement);
    const first = (await screen.findByRole("alertdialog")).textContent;
    await userEvent.keyboard("{Escape}");
    await vi.waitFor(() =>
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument(),
    );
    await userEvent.click(buttons[1] as HTMLElement);
    const second = (await screen.findByRole("alertdialog")).textContent;

    expect(first).toContain("(Técnica)");
    expect(second).toContain("(Cultural)");
  });

  it.each([
    [
      "«Conservar ronda»",
      async (dialog: HTMLElement) => {
        await userEvent.click(
          within(dialog).getByRole("button", { name: "Conservar ronda" }),
        );
      },
    ],
    [
      "Escape",
      async () => {
        await userEvent.keyboard("{Escape}");
      },
    ],
    [
      "an overlay click",
      async () => {
        const overlay = document.querySelector(
          '[data-slot="alert-dialog-overlay"]',
        );
        await userEvent.click(overlay as HTMLElement);
      },
    ],
  ])(
    "closes with %s without a request and focuses the delete button",
    async (_label, close) => {
      const fetchMock = mockFetch({
        "GET /api/applications/a1": threeRounds(),
      });
      renderDetail();
      const { opener, dialog } = await openDeleteDialog(2);

      await close(dialog);

      await vi.waitFor(() =>
        expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument(),
      );
      expect(opener).toHaveFocus();
      expect(callsOf(fetchMock, "DELETE")).toHaveLength(0);
    },
  );

  it("sends one DELETE and ignores a second click and every close while pending", async () => {
    const del = deferred();
    const fetchMock = mockFetch({
      "GET /api/applications/a1": threeRounds(),
      "DELETE /api/applications/a1/interviews/i2": () => del.promise,
    });
    renderDetail();
    const { dialog } = await openDeleteDialog(2);

    await userEvent.click(
      within(dialog).getByRole("button", { name: "Eliminar ronda" }),
    );

    const confirm = await within(dialog).findByRole("button", {
      name: "Eliminando…",
    });
    expect(confirm).toHaveAttribute("aria-disabled", "true");
    expect(
      within(dialog).getByRole("button", { name: "Conservar ronda" }),
    ).toHaveAttribute("aria-disabled", "true");
    await userEvent.click(confirm);
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Conservar ronda" }),
    );
    await userEvent.keyboard("{Escape}");
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    expect(callsOf(fetchMock, "DELETE")).toHaveLength(1);
    expect(callsOf(fetchMock, "DELETE")[0]?.[0]).toBe(
      "/api/applications/a1/interviews/i2",
    );

    del.resolve(jsonResponse(withoutRound("i2")));
    await vi.waitFor(() =>
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument(),
    );
  });

  it("removes the row, announces it and moves focus to «Añadir ronda»", async () => {
    mockFetch({
      "GET /api/applications/a1": threeRounds(),
      "DELETE /api/applications/a1/interviews/i2": () =>
        jsonResponse(withoutRound("i2")),
    });
    renderDetail();
    const { dialog } = await openDeleteDialog(2);

    await userEvent.click(
      within(dialog).getByRole("button", { name: "Eliminar ronda" }),
    );

    await vi.waitFor(() =>
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument(),
    );
    expect(
      screen.queryByRole("heading", { name: /^Ronda 2/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Ronda 3 · Cultural" }),
    ).toBeInTheDocument();
    expect(within(roundsRegion()).getByRole("status")).toHaveTextContent(
      "Ronda eliminada.",
    );
    expect(screen.getByRole("button", { name: "Añadir ronda" })).toHaveFocus();
  });

  it("keeps the dialog open with an error on a 500 and lets the user confirm again", async () => {
    const fetchMock = mockFetch({
      "GET /api/applications/a1": threeRounds(),
      "DELETE /api/applications/a1/interviews/i2": serverError,
    });
    renderDetail();
    const { dialog } = await openDeleteDialog(2);

    await userEvent.click(
      within(dialog).getByRole("button", { name: "Eliminar ronda" }),
    );

    expect(
      await within(dialog).findByText(
        "No se pudo eliminar la ronda. Inténtalo de nuevo.",
      ),
    ).toBeInTheDocument();
    const confirm = within(dialog).getByRole("button", {
      name: "Eliminar ronda",
    });
    expect(confirm).not.toHaveAttribute("aria-disabled", "true");
    await userEvent.click(confirm);
    await vi.waitFor(() =>
      expect(callsOf(fetchMock, "DELETE")).toHaveLength(2),
    );
  });

  it("disables the delete button while a status change is pending", async () => {
    const patch = deferred();
    mockFetch({
      "GET /api/applications/a1": threeRounds(),
      "PATCH /api/applications/a1/status": () => patch.promise,
    });
    renderDetail();
    await userEvent.selectOptions(
      await screen.findByRole("combobox", { name: "Cambiar estado" }),
      "rechazada",
    );

    const button = await deleteButton(1);
    expect(button).toHaveAttribute("aria-disabled", "true");
    await userEvent.click(button);
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();

    patch.resolve(jsonResponse(threeRounds({ status: "rechazada" })));
    await vi.waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Eliminar ronda 1" }),
      ).toHaveAttribute("aria-disabled", "false"),
    );
  });
});

const statusSelect = () =>
  screen.getByRole("combobox", { name: "Cambiar estado", hidden: true });

// The select sits behind the open modal (aria-hidden, pointer-events off), so the change is fired
// directly instead of going through the pointer.
const chooseStatus = (value: string) =>
  fireEvent.change(statusSelect(), { target: { value } });

describe("one change at a time across the detail", () => {
  it("locks «Cambiar estado» while a round is being added and sends no PATCH", async () => {
    const post = deferred();
    const fetchMock = mockFetch({
      "GET /api/applications/a1": makeApplication(),
      "POST /api/applications/a1/interviews": () => post.promise,
      "PATCH /api/applications/a1/status": () =>
        jsonResponse(makeApplication({ status: "rechazada" })),
    });
    renderDetail();
    const { dialog } = await openAddDialog();
    await userEvent.selectOptions(
      within(dialog).getByRole("combobox", { name: /Tipo/ }),
      "tecnica",
    );
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Guardar ronda" }),
    );

    await vi.waitFor(() =>
      expect(statusSelect()).toHaveAttribute("aria-disabled", "true"),
    );
    expect(statusSelect()).toHaveAttribute("aria-busy", "false");
    chooseStatus("rechazada");
    expect(callsOf(fetchMock, "PATCH")).toHaveLength(0);

    post.resolve(
      jsonResponse(
        makeApplication({ interviews: [round({ id: "i1", round: 1 })] }),
        201,
      ),
    );
    await vi.waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    expect(statusSelect()).toHaveAttribute("aria-disabled", "false");
    expect(callsOf(fetchMock, "PATCH")).toHaveLength(0);
  });

  it("locks «Cambiar estado» while a round is being edited", async () => {
    const put = deferred();
    const fetchMock = mockFetch({
      "GET /api/applications/a1": threeRounds(),
      "PUT /api/applications/a1/interviews/i2": () => put.promise,
      "PATCH /api/applications/a1/status": () =>
        jsonResponse(threeRounds({ status: "rechazada" })),
    });
    renderDetail();
    const { dialog } = await openEditDialog(2);
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Guardar ronda" }),
    );

    await vi.waitFor(() =>
      expect(statusSelect()).toHaveAttribute("aria-disabled", "true"),
    );
    expect(statusSelect()).toHaveAttribute("aria-busy", "false");
    chooseStatus("rechazada");
    expect(callsOf(fetchMock, "PATCH")).toHaveLength(0);

    put.resolve(jsonResponse(threeRounds()));
    await vi.waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    expect(statusSelect()).toHaveAttribute("aria-disabled", "false");
  });

  it("locks «Cambiar estado» while a round is being deleted", async () => {
    const del = deferred();
    const fetchMock = mockFetch({
      "GET /api/applications/a1": threeRounds(),
      "DELETE /api/applications/a1/interviews/i2": () => del.promise,
      "PATCH /api/applications/a1/status": () =>
        jsonResponse(threeRounds({ status: "rechazada" })),
    });
    renderDetail();
    const { dialog } = await openDeleteDialog(2);
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Eliminar ronda" }),
    );

    await vi.waitFor(() =>
      expect(statusSelect()).toHaveAttribute("aria-disabled", "true"),
    );
    expect(statusSelect()).toHaveAttribute("aria-busy", "false");
    chooseStatus("rechazada");
    expect(callsOf(fetchMock, "PATCH")).toHaveLength(0);

    del.resolve(jsonResponse(withoutRound("i2")));
    await vi.waitFor(() =>
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument(),
    );
    expect(statusSelect()).toHaveAttribute("aria-disabled", "false");
  });

  it("makes every round control unavailable while a status change is pending", async () => {
    const patch = deferred();
    mockFetch({
      "GET /api/applications/a1": threeRounds(),
      "PATCH /api/applications/a1/status": () => patch.promise,
    });
    renderDetail();
    await userEvent.selectOptions(
      await screen.findByRole("combobox", { name: "Cambiar estado" }),
      "rechazada",
    );

    const add = screen.getByRole("button", { name: "Añadir ronda" });
    const edit = await editButton(1);
    const remove = await deleteButton(1);
    expect(statusSelect()).toHaveAttribute("aria-busy", "true");
    for (const control of [add, edit, remove]) {
      expect(control).toHaveAttribute("aria-disabled", "true");
      await userEvent.click(control);
    }
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();

    patch.resolve(jsonResponse(threeRounds({ status: "rechazada" })));
    await vi.waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Añadir ronda" }),
      ).toHaveAttribute("aria-disabled", "false"),
    );
    expect(
      screen.getByRole("button", { name: "Editar ronda 1" }),
    ).toHaveAttribute("aria-disabled", "false");
    expect(
      screen.getByRole("button", { name: "Eliminar ronda 1" }),
    ).toHaveAttribute("aria-disabled", "false");
    await userEvent.click(screen.getByRole("button", { name: "Añadir ronda" }));
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
  });
});
