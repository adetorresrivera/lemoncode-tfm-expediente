import { applicationSchema } from "@tfm/contracts";
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

// The scene supplies the real router links; pod tests use plain anchors.
const link =
  (href: string) => (props: { className?: string; children: ReactNode }) => (
    <a href={href} className={props.className}>
      {props.children}
    </a>
  );

const OFFER_TEXT =
  "Buscamos una persona frontend para un equipo de producto en Madrid.";

const EXTRACTION = {
  title: "Desarrollador/a Frontend Senior",
  company: "Lumen Analytics",
  location: "Madrid",
  workMode: "remoto",
  seniority: "senior",
  contractType: "indefinido",
  salaryMin: 45000,
  salaryMax: 55000,
  currency: "EUR",
  tags: [],
};

const created = applicationSchema.parse({
  id: "new1",
  title: "Mi puesto",
  company: "Lumen Analytics",
  status: "guardada",
  statusHistory: [{ status: "guardada", at: "2026-10-12T10:00:00.000Z" }],
  interviews: [],
  createdAt: "2026-10-12T10:00:00.000Z",
  updatedAt: "2026-10-12T10:00:00.000Z",
  ownerId: null,
});

const renderCreate = () =>
  render(
    <ApplicationEditContainer
      onSaved={() => {}}
      renderCancelLink={link("/applications")}
      renderListLink={link("/applications-list-stub")}
    />,
  );

const callsTo = (
  fetchMock: ReturnType<typeof mockFetch>,
  method: string,
  path: string,
) =>
  fetchMock.mock.calls.filter(([input, init]) => {
    const url = new URL(String(input), "http://localhost");
    return (init?.method ?? "GET") === method && url.pathname === path;
  });

const pasteOffer = (text = OFFER_TEXT) => {
  fireEvent.change(screen.getByLabelText("Texto de la oferta"), {
    target: { value: text },
  });
};

const NO_DATA = {
  title: null,
  company: null,
  location: null,
  workMode: null,
  seniority: null,
  contractType: null,
  salaryMin: null,
  salaryMax: null,
  currency: null,
  tags: [],
};

const errorBody = (code: string) => ({ error: { code, message: "x" } });

const analyzeButton = () =>
  screen.getByRole("button", { name: "Autocompletar con IA" });

// A response the test releases by hand, to act while the analysis is in flight.
function deferred() {
  let release: (response: Response) => void = () => {};
  const promise = new Promise<Response>((resolve) => {
    release = resolve;
  });
  return { promise, release };
}

describe("ApplicationEditContainer AI autocomplete", () => {
  it("opens the offer panel on create, analyses the pasted text and fills only the empty fields", async () => {
    const user = userEvent.setup();
    let release: (response: Response) => void = () => {};
    const fetchMock = mockFetch({
      "POST /api/offers/extract": () =>
        new Promise<Response>((resolve) => {
          release = resolve;
        }),
    });
    renderCreate();

    const trigger = screen.getByRole("button", { name: "Pegar oferta" });
    expect(trigger).toHaveAttribute("aria-expanded", "true");

    await user.type(screen.getByLabelText("Puesto *"), "Mi puesto");
    pasteOffer();
    const analyze = screen.getByRole("button", {
      name: "Autocompletar con IA",
    });
    await user.click(analyze);

    expect(await screen.findByText("Analizando la oferta…")).toBeVisible();
    const sent = callsTo(fetchMock, "POST", "/api/offers/extract");
    expect(sent).toHaveLength(1);
    expect(JSON.parse(String(sent[0]?.[1]?.body))).toStrictEqual({
      text: OFFER_TEXT,
    });

    release(jsonResponse(EXTRACTION));

    expect(
      await screen.findByText("Hemos rellenado 8 campos. Revísalos."),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Puesto *")).toHaveValue("Mi puesto");
    expect(screen.getByLabelText("Empresa *")).toHaveValue("Lumen Analytics");
    expect(screen.getByLabelText("Ubicación")).toHaveValue("Madrid");
    expect(screen.getByLabelText("Modalidad")).toHaveValue("remoto");
    expect(screen.getByLabelText("Seniority")).toHaveValue("senior");
    expect(screen.getByLabelText("Tipo de contrato")).toHaveValue("indefinido");
    expect(analyze).toHaveFocus();
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(callsTo(fetchMock, "POST", "/api/applications")).toHaveLength(0);
  });

  it("saves the merged values only when the user presses «Guardar candidatura»", async () => {
    const user = userEvent.setup();
    const fetchMock = mockFetch({
      "POST /api/offers/extract": () => jsonResponse(EXTRACTION),
      "POST /api/applications": () => jsonResponse(created, 201),
    });
    renderCreate();

    await user.type(screen.getByLabelText("Puesto *"), "Mi puesto");
    pasteOffer();
    await user.click(
      screen.getByRole("button", { name: "Autocompletar con IA" }),
    );
    await screen.findByText("Hemos rellenado 8 campos. Revísalos.");
    expect(callsTo(fetchMock, "POST", "/api/applications")).toHaveLength(0);

    await user.click(
      screen.getByRole("button", { name: "Guardar candidatura" }),
    );

    await waitFor(() =>
      expect(callsTo(fetchMock, "POST", "/api/applications")).toHaveLength(1),
    );
    const body: unknown = JSON.parse(
      String(callsTo(fetchMock, "POST", "/api/applications")[0]?.[1]?.body),
    );
    expect(body).toMatchObject({
      title: "Mi puesto",
      company: "Lumen Analytics",
      workMode: "remoto",
    });
  });

  it("keeps a value typed while the analysis runs (D-20)", async () => {
    const user = userEvent.setup();
    const pending = deferred();
    mockFetch({ "POST /api/offers/extract": () => pending.promise });
    renderCreate();

    pasteOffer();
    await user.click(analyzeButton());
    await screen.findByText("Analizando la oferta…");
    await user.type(screen.getByLabelText("Empresa *"), "Acme");
    pending.release(jsonResponse(EXTRACTION));

    await screen.findByText("Hemos rellenado 8 campos. Revísalos.");
    expect(screen.getByLabelText("Empresa *")).toHaveValue("Acme");
    expect(screen.getByLabelText("Puesto *")).toHaveValue(
      "Desarrollador/a Frontend Senior",
    );
  });

  it("treats a whitespace-only value as empty and ignores null extraction values", async () => {
    const user = userEvent.setup();
    mockFetch({
      "POST /api/offers/extract": () =>
        jsonResponse({ ...NO_DATA, company: "Acme SL", location: "Sevilla" }),
    });
    renderCreate();

    await user.type(screen.getByLabelText("Empresa *"), "   ");
    pasteOffer();
    await user.click(analyzeButton());

    await screen.findByText(
      "Hemos rellenado 2 campos. Revísalos. Te falta completar: Puesto, Modalidad y Seniority.",
    );
    expect(screen.getByLabelText("Empresa *")).toHaveValue("Acme SL");
    expect(screen.getByLabelText("Ubicación")).toHaveValue("Sevilla");
    expect(screen.getByLabelText("Puesto *")).toHaveValue("");
    expect(screen.getByLabelText("Modalidad")).toHaveValue("");
  });

  it("reads «Hemos rellenado 1 campo. Revísalo.» when one field is filled", async () => {
    const user = userEvent.setup();
    mockFetch({
      "POST /api/offers/extract": () =>
        jsonResponse({ ...NO_DATA, company: "Acme SL" }),
    });
    renderCreate();

    pasteOffer();
    await user.click(analyzeButton());

    expect(
      await screen.findByText(
        "Hemos rellenado 1 campo. Revísalo. Te falta completar: Puesto, Modalidad y Seniority.",
      ),
    ).toBeInTheDocument();
  });

  it("says nothing new was found when the extraction adds no data", async () => {
    const user = userEvent.setup();
    mockFetch({ "POST /api/offers/extract": () => jsonResponse(NO_DATA) });
    renderCreate();

    pasteOffer();
    await user.click(analyzeButton());

    expect(
      await screen.findByText(
        "No hemos encontrado datos nuevos en la oferta. Completa el formulario a mano. Te falta completar: Puesto, Empresa, Modalidad y Seniority.",
      ),
    ).toBeInTheDocument();
  });

  it.each([
    [
      "LLM_TIMEOUT",
      504,
      "La IA ha tardado demasiado. Inténtalo otra vez o rellena el formulario a mano.",
    ],
    [
      "LLM_ERROR",
      502,
      "No hemos podido leer la oferta. Inténtalo otra vez o rellena el formulario a mano.",
    ],
    [
      "VALIDATION_ERROR",
      400,
      "La oferta debe tener entre 50 y 20.000 caracteres.",
    ],
  ])(
    "shows the message for a %s answer and lets the user retry",
    async (code, status, message) => {
      const user = userEvent.setup();
      let attempts = 0;
      mockFetch({
        "POST /api/offers/extract": () => {
          attempts += 1;
          return attempts === 1
            ? jsonResponse(errorBody(code), status)
            : jsonResponse(EXTRACTION);
        },
      });
      renderCreate();

      pasteOffer();
      await user.click(analyzeButton());

      expect(await screen.findByText(message)).toBeInTheDocument();
      expect(screen.getByLabelText("Puesto *")).toBeEnabled();
      expect(analyzeButton()).not.toHaveAttribute("aria-disabled", "true");

      await user.click(analyzeButton());
      expect(
        await screen.findByText("Hemos rellenado 9 campos. Revísalos."),
      ).toBeInTheDocument();
      expect(screen.queryByText(message)).toBeNull();
    },
  );

  it("shows the connection message when the request itself fails", async () => {
    const user = userEvent.setup();
    mockFetch({
      "POST /api/offers/extract": () => {
        throw new TypeError("Failed to fetch");
      },
    });
    renderCreate();

    pasteOffer();
    await user.click(analyzeButton());

    expect(
      await screen.findByText(
        "No hay conexión con el servidor. Inténtalo otra vez.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Empresa *")).toBeEnabled();
  });

  it("fills the salary range and the currency of an empty create form and counts them", async () => {
    const user = userEvent.setup();
    mockFetch({
      "POST /api/offers/extract": () =>
        jsonResponse({
          ...EXTRACTION,
          salaryMin: 45000,
          salaryMax: 55000,
          currency: "USD",
          seniority: null,
        }),
    });
    renderCreate();

    pasteOffer();
    await user.click(analyzeButton());

    expect(
      await screen.findByText(
        "Hemos rellenado 8 campos. Revísalos. Te falta completar: Seniority.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Salario mínimo")).toHaveValue(45000);
    expect(screen.getByLabelText("Salario máximo")).toHaveValue(55000);
    expect(screen.getByLabelText("Moneda")).toHaveValue("USD");
  });

  it("names two missing fields with «y»", async () => {
    const user = userEvent.setup();
    mockFetch({
      "POST /api/offers/extract": () =>
        jsonResponse({ ...EXTRACTION, company: null, seniority: null }),
    });
    renderCreate();

    pasteOffer();
    await user.click(analyzeButton());

    expect(
      await screen.findByText(/Te falta completar: Empresa y Seniority\.$/),
    ).toBeInTheDocument();
  });

  it("names the four relevant fields when none was found", async () => {
    const user = userEvent.setup();
    mockFetch({
      "POST /api/offers/extract": () =>
        jsonResponse({
          ...EXTRACTION,
          title: null,
          company: null,
          workMode: null,
          seniority: null,
        }),
    });
    renderCreate();

    pasteOffer();
    await user.click(analyzeButton());

    expect(
      await screen.findByText(
        /Te falta completar: Puesto, Empresa, Modalidad y Seniority\.$/,
      ),
    ).toBeInTheDocument();
  });

  it("keeps a salary the user typed instead of inverting the range", async () => {
    const user = userEvent.setup();
    mockFetch({ "POST /api/offers/extract": () => jsonResponse(EXTRACTION) });
    renderCreate();

    await user.type(screen.getByLabelText("Salario mínimo"), "60000");
    pasteOffer();
    await user.click(analyzeButton());

    await screen.findByText("Hemos rellenado 6 campos. Revísalos.");
    expect(screen.getByLabelText("Salario mínimo")).toHaveValue(60000);
    expect(screen.getByLabelText("Salario máximo")).toHaveValue(null);
    expect(screen.getByLabelText("Moneda")).toHaveValue("EUR");
  });

  it("drops the missing sentence on a second analysis once the user completed the field", async () => {
    const user = userEvent.setup();
    mockFetch({
      "POST /api/offers/extract": () =>
        jsonResponse({ ...EXTRACTION, seniority: null }),
    });
    renderCreate();

    pasteOffer();
    await user.click(analyzeButton());
    await screen.findByText(/Te falta completar: Seniority\.$/);

    await user.selectOptions(screen.getByLabelText("Seniority"), "mid");
    await user.click(analyzeButton());

    // The 8 fields still marked «IA» are filled again by the second analysis.
    expect(
      await screen.findByText("Hemos rellenado 8 campos. Revísalos."),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Te falta completar/)).toBeNull();
  });

  it("keeps the status region outside the collapsible content so a collapse does not lose it", async () => {
    const user = userEvent.setup();
    mockFetch({ "POST /api/offers/extract": () => jsonResponse(EXTRACTION) });
    const { container } = renderCreate();

    pasteOffer();
    await user.click(analyzeButton());
    await screen.findByText("Hemos rellenado 9 campos. Revísalos.");
    await user.click(screen.getByRole("button", { name: "Pegar oferta" }));

    const status = container.querySelector("[role='status']");
    expect(status).toHaveAttribute("aria-live", "polite");
    expect(status).toHaveTextContent("Hemos rellenado 9 campos. Revísalos.");
    expect(screen.queryByLabelText("Texto de la oferta")).toBeNull();
  });

  it("starts collapsed in edit mode and opens on demand", async () => {
    const user = userEvent.setup();
    mockFetch({
      "GET /api/applications/a1": () =>
        jsonResponse(
          applicationSchema.parse({
            id: "a1",
            title: "Frontend Developer",
            company: "Acme",
            status: "enviada",
            statusHistory: [
              { status: "guardada", at: "2026-10-12T10:00:00.000Z" },
            ],
            interviews: [],
            createdAt: "2026-10-12T10:00:00.000Z",
            updatedAt: "2026-10-30T08:15:00.000Z",
            ownerId: null,
          }),
        ),
    });
    render(
      <ApplicationEditContainer
        applicationId="a1"
        onSaved={() => {}}
        renderCancelLink={link("/applications")}
        renderListLink={link("/applications-list-stub")}
      />,
    );

    const trigger = await screen.findByRole("button", { name: "Pegar oferta" });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByLabelText("Texto de la oferta")).toBeNull();

    await user.click(trigger);

    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByLabelText("Texto de la oferta")).toBeInTheDocument();
  });

  it("aborts the request on unmount and writes no state afterwards", async () => {
    const user = userEvent.setup();
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const pending = deferred();
    const fetchMock = mockFetch({
      "POST /api/offers/extract": () => pending.promise,
    });
    const { unmount } = renderCreate();

    pasteOffer();
    await user.click(analyzeButton());
    await screen.findByText("Analizando la oferta…");
    const sent = callsTo(fetchMock, "POST", "/api/offers/extract");
    const signal = sent[0]?.[1]?.signal;
    expect(signal?.aborted).toBe(false);

    unmount();
    expect(signal?.aborted).toBe(true);
    pending.release(jsonResponse(EXTRACTION));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(consoleError).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });
});

const BADGE = "Rellenado por la IA";
const MISSING = "Complétalo tú";

const GOLD = ["border-brand-gold", "bg-ai-missing-bg"];

const describedBy = (control: HTMLElement): string[] =>
  (control.getAttribute("aria-describedby") ?? "").split(" ").filter(Boolean);

// Title, company and work mode found; seniority and everything else left empty.
const PARTIAL = {
  ...NO_DATA,
  title: "Desarrollador/a Frontend",
  company: "Lumen Analytics",
  workMode: "remoto",
};

describe("ApplicationEditContainer AI marks", () => {
  it("marks the filled fields with «IA» and highlights the relevant one still empty", async () => {
    const user = userEvent.setup();
    mockFetch({ "POST /api/offers/extract": () => jsonResponse(PARTIAL) });
    renderCreate();

    pasteOffer();
    await user.click(analyzeButton());
    await screen.findByText(/Hemos rellenado 3 campos/);

    expect(screen.getAllByText(BADGE)).toHaveLength(3);
    expect(describedBy(screen.getByLabelText("Puesto *"))).toContain(
      "field-title-ai",
    );
    const seniority = screen.getByLabelText("Seniority");
    expect(seniority).toHaveClass(...GOLD);
    expect(describedBy(seniority)).toContain("field-seniority-missing");
    expect(screen.getAllByText(MISSING)).toHaveLength(1);
    expect(
      document.getElementById("field-seniority-missing"),
    ).toHaveTextContent(MISSING);
  });

  it("does not highlight empty location, contract or salary fields", async () => {
    const user = userEvent.setup();
    mockFetch({ "POST /api/offers/extract": () => jsonResponse(PARTIAL) });
    renderCreate();

    pasteOffer();
    await user.click(analyzeButton());
    await screen.findByText(/Hemos rellenado 3 campos/);

    for (const label of [
      "Ubicación",
      "Tipo de contrato",
      "Salario mínimo",
      "Salario máximo",
    ]) {
      const control = screen.getByLabelText(label);
      expect(control).not.toHaveClass(...GOLD);
      expect(describedBy(control).join(" ")).not.toMatch(/-missing|-ai/);
    }
  });

  it("removes a badge on the first edit and does not bring it back when the value is restored", async () => {
    const user = userEvent.setup();
    mockFetch({ "POST /api/offers/extract": () => jsonResponse(PARTIAL) });
    renderCreate();

    pasteOffer();
    await user.click(analyzeButton());
    await screen.findByText(/Hemos rellenado 3 campos/);
    expect(document.getElementById("field-company-ai")).not.toBeNull();

    await user.type(screen.getByLabelText("Empresa *"), "x");
    expect(document.getElementById("field-company-ai")).toBeNull();
    expect(document.getElementById("field-title-ai")).not.toBeNull();

    await user.type(screen.getByLabelText("Empresa *"), "{Backspace}");
    expect(screen.getByLabelText("Empresa *")).toHaveValue("Lumen Analytics");
    expect(document.getElementById("field-company-ai")).toBeNull();
    expect(screen.getAllByText(BADGE)).toHaveLength(2);
  });

  it("removes «Complétalo tú» once the field has a value and does not restore it when cleared", async () => {
    const user = userEvent.setup();
    mockFetch({ "POST /api/offers/extract": () => jsonResponse(PARTIAL) });
    renderCreate();

    pasteOffer();
    await user.click(analyzeButton());
    await screen.findByText(/Hemos rellenado 3 campos/);
    const seniority = screen.getByLabelText("Seniority");
    expect(screen.getByText(MISSING)).toBeInTheDocument();

    await user.selectOptions(seniority, "mid");
    expect(screen.queryByText(MISSING)).toBeNull();
    expect(seniority).not.toHaveClass(...GOLD);

    await user.selectOptions(seniority, "");
    expect(screen.queryByText(MISSING)).toBeNull();
    expect(seniority).not.toHaveClass(...GOLD);
  });

  it("marks the fields a second analysis fills again, leaves the edited one unmarked and recalculates the missing list", async () => {
    const user = userEvent.setup();
    let calls = 0;
    mockFetch({
      "POST /api/offers/extract": () => {
        calls += 1;
        return jsonResponse(
          calls === 1 ? PARTIAL : { ...PARTIAL, seniority: "senior" },
        );
      },
    });
    renderCreate();

    pasteOffer();
    await user.click(analyzeButton());
    await screen.findByText(/Hemos rellenado 3 campos/);
    await user.type(screen.getByLabelText("Empresa *"), "x");
    expect(screen.getAllByText(BADGE)).toHaveLength(2);

    await user.click(analyzeButton());
    await waitFor(() =>
      expect(screen.getByLabelText("Seniority")).toHaveValue("senior"),
    );

    // Title and work mode are filled again and marked, the edited company stays unmarked, seniority is new.
    expect(document.getElementById("field-title-ai")).not.toBeNull();
    expect(document.getElementById("field-workMode-ai")).not.toBeNull();
    expect(document.getElementById("field-seniority-ai")).not.toBeNull();
    expect(document.getElementById("field-company-ai")).toBeNull();
    expect(screen.queryByText(MISSING)).toBeNull();
  });

  it("brings «Complétalo tú» back only when a later analysis leaves the field empty", async () => {
    const user = userEvent.setup();
    mockFetch({ "POST /api/offers/extract": () => jsonResponse(PARTIAL) });
    renderCreate();

    pasteOffer();
    await user.click(analyzeButton());
    await screen.findByText(/Hemos rellenado 3 campos/);
    const seniority = screen.getByLabelText("Seniority");
    await user.selectOptions(seniority, "mid");
    await user.selectOptions(seniority, "");
    expect(screen.queryByText(MISSING)).toBeNull();

    await user.click(analyzeButton());
    // The second analysis reads the same summary as the first, so wait on the mark itself.
    expect(await screen.findByText(MISSING)).toBeInTheDocument();
    expect(seniority).toHaveClass(...GOLD);
  });

  it("replaces the fields still marked «IA» on a second analysis, clears the ones the new offer lacks and keeps the edited one", async () => {
    const user = userEvent.setup();
    let calls = 0;
    mockFetch({
      "POST /api/offers/extract": () => {
        calls += 1;
        return jsonResponse(
          calls === 1
            ? PARTIAL
            : { ...NO_DATA, title: "Backend Developer", seniority: "mid" },
        );
      },
    });
    renderCreate();

    pasteOffer();
    await user.click(analyzeButton());
    await screen.findByText(/Hemos rellenado 3 campos/);
    await user.type(screen.getByLabelText("Empresa *"), "x");

    await user.click(analyzeButton());
    await screen.findByText(
      "Hemos rellenado 2 campos. Revísalos. Te falta completar: Modalidad.",
    );

    expect(screen.getByLabelText("Puesto *")).toHaveValue("Backend Developer");
    expect(document.getElementById("field-title-ai")).not.toBeNull();
    expect(screen.getByLabelText("Empresa *")).toHaveValue("Lumen Analyticsx");
    expect(document.getElementById("field-company-ai")).toBeNull();
    const workMode = screen.getByLabelText("Modalidad");
    expect(workMode).toHaveValue("");
    expect(document.getElementById("field-workMode-ai")).toBeNull();
    expect(describedBy(workMode)).toContain("field-workMode-missing");
    expect(screen.getByLabelText("Seniority")).toHaveValue("mid");
    expect(document.getElementById("field-seniority-ai")).not.toBeNull();
    expect(screen.getAllByText(BADGE)).toHaveLength(2);
  });

  it("replaces the AI salary range and currency on a second analysis and resets them when the next offer has none", async () => {
    const user = userEvent.setup();
    const answers = [
      { ...NO_DATA, salaryMin: 45000, salaryMax: 55000, currency: "USD" },
      { ...NO_DATA, salaryMin: 50000, salaryMax: 60000, currency: "GBP" },
      NO_DATA,
    ];
    let calls = 0;
    mockFetch({
      "POST /api/offers/extract": () => {
        const answer = answers[Math.min(calls, answers.length - 1)];
        calls += 1;
        return jsonResponse(answer);
      },
    });
    renderCreate();

    pasteOffer();
    await user.click(analyzeButton());
    await waitFor(() =>
      expect(screen.getByLabelText("Moneda")).toHaveValue("USD"),
    );

    await user.click(analyzeButton());
    await waitFor(() =>
      expect(screen.getByLabelText("Moneda")).toHaveValue("GBP"),
    );
    expect(screen.getByLabelText("Salario mínimo")).toHaveValue(50000);
    expect(screen.getByLabelText("Salario máximo")).toHaveValue(60000);
    expect(screen.getAllByText(BADGE)).toHaveLength(3);

    await user.click(analyzeButton());
    await waitFor(() =>
      expect(screen.getByLabelText("Moneda")).toHaveValue("EUR"),
    );
    expect(screen.getByLabelText("Salario mínimo")).toHaveValue(null);
    expect(screen.getByLabelText("Salario máximo")).toHaveValue(null);
    expect(screen.queryByText(BADGE)).toBeNull();
  });

  it("keeps a field the user edits while a second analysis runs (D-20)", async () => {
    const user = userEvent.setup();
    const pending = deferred();
    let calls = 0;
    mockFetch({
      "POST /api/offers/extract": () => {
        calls += 1;
        return calls === 1 ? jsonResponse(PARTIAL) : pending.promise;
      },
    });
    renderCreate();

    pasteOffer();
    await user.click(analyzeButton());
    await screen.findByText(/Hemos rellenado 3 campos/);

    await user.click(analyzeButton());
    await screen.findByText("Analizando la oferta…");
    await user.type(screen.getByLabelText("Empresa *"), "x");
    pending.release(jsonResponse({ ...PARTIAL, company: "Otra Empresa" }));

    await screen.findByText(/Hemos rellenado 2 campos/);
    expect(screen.getByLabelText("Empresa *")).toHaveValue("Lumen Analyticsx");
    expect(document.getElementById("field-company-ai")).toBeNull();
    expect(document.getElementById("field-title-ai")).not.toBeNull();
  });

  it("lets the validation error win over «Complétalo tú» on a missing required field", async () => {
    const user = userEvent.setup();
    mockFetch({
      "POST /api/offers/extract": () =>
        jsonResponse({ ...PARTIAL, company: null }),
    });
    renderCreate();

    pasteOffer();
    await user.click(analyzeButton());
    await screen.findByText(/Hemos rellenado 2 campos/);
    expect(screen.getAllByText(MISSING)).toHaveLength(2);
    const company = screen.getByLabelText("Empresa *");
    expect(company).toHaveClass(...GOLD);

    await user.click(
      screen.getByRole("button", { name: "Guardar candidatura" }),
    );

    expect(await screen.findByText("Escribe la empresa.")).toBeInTheDocument();
    expect(document.getElementById("field-company-missing")).toBeNull();
    expect(company).not.toHaveClass(...GOLD);
    expect(describedBy(company)).toStrictEqual(["field-company-error"]);
  });

  it("keeps the marks after a failed save", async () => {
    const user = userEvent.setup();
    mockFetch({
      "POST /api/offers/extract": () => jsonResponse(EXTRACTION),
      "POST /api/applications": () =>
        jsonResponse(errorBody("INTERNAL_ERROR"), 500),
    });
    renderCreate();

    pasteOffer();
    await user.click(analyzeButton());
    await screen.findByText(/Hemos rellenado 9 campos/);
    await user.click(
      screen.getByRole("button", { name: "Guardar candidatura" }),
    );

    expect(
      await screen.findByText(
        "No se pudo guardar la candidatura. Inténtalo de nuevo.",
      ),
    ).toBeInTheDocument();
    expect(screen.getAllByText(BADGE)).toHaveLength(9);
    expect(screen.getByText(/Hemos rellenado 9 campos/)).toBeInTheDocument();
  });

  it("clears every badge and the summary line after a successful save, before navigating", async () => {
    const user = userEvent.setup();
    mockFetch({
      "POST /api/offers/extract": () => jsonResponse(EXTRACTION),
      "POST /api/applications": () => jsonResponse(created, 201),
    });
    const onSaved = vi.fn();
    render(
      <ApplicationEditContainer
        onSaved={onSaved}
        renderCancelLink={link("/applications")}
        renderListLink={link("/applications-list-stub")}
      />,
    );

    pasteOffer();
    await user.click(analyzeButton());
    await screen.findByText(/Hemos rellenado 9 campos/);
    expect(screen.getAllByText(BADGE)).toHaveLength(9);

    await user.click(
      screen.getByRole("button", { name: "Guardar candidatura" }),
    );

    await waitFor(() => expect(onSaved).toHaveBeenCalledWith("new1"));
    expect(screen.queryByText(BADGE)).toBeNull();
    expect(screen.queryByText(/Hemos rellenado/)).toBeNull();
  });

  it("shows no mark right after loading an application in edit mode", async () => {
    mockFetch({
      "GET /api/applications/a1": () =>
        jsonResponse(
          applicationSchema.parse({
            id: "a1",
            title: "Frontend Developer",
            company: "Acme",
            status: "enviada",
            statusHistory: [
              { status: "guardada", at: "2026-10-12T10:00:00.000Z" },
            ],
            interviews: [],
            createdAt: "2026-10-12T10:00:00.000Z",
            updatedAt: "2026-10-30T08:15:00.000Z",
            ownerId: null,
          }),
        ),
    });
    render(
      <ApplicationEditContainer
        applicationId="a1"
        onSaved={() => {}}
        renderCancelLink={link("/applications")}
        renderListLink={link("/applications-list-stub")}
      />,
    );

    await screen.findByDisplayValue("Frontend Developer");

    expect(screen.queryByText(BADGE)).toBeNull();
    expect(screen.queryByText(MISSING)).toBeNull();
  });
});

const AI_NOTE = "(propuesta por IA)";
const STACK = "Stack tecnológico";
const NICE = "Se valora";
const LANGUAGES = "Idiomas";

const groupOf = (legend: string) => screen.getByRole("group", { name: legend });
const chip = (label: string) =>
  screen.queryByRole("button", { name: `Quitar ${label}` });
const typeTag = async (
  user: ReturnType<typeof userEvent.setup>,
  legend: string,
  text: string,
) => {
  await user.type(
    screen.getByLabelText(`Añadir etiqueta a ${legend}`),
    `${text}{Enter}`,
  );
};

const withTags = (tags: { label: string; group: string }[]) => ({
  ...NO_DATA,
  tags,
});

const TAGGED = withTags([
  { label: "React", group: "stack" },
  { label: "TypeScript", group: "stack" },
  { label: "Inglés B2", group: "language" },
]);

// The chip is the list item that holds the «Quitar {label}» button.
const chipOf = (label: string): HTMLElement => {
  const item = screen
    .getByRole("button", { name: `Quitar ${label}` })
    .closest("li");
  if (item === null) throw new Error(`No chip for ${label}`);
  return item;
};

describe("ApplicationEditContainer AI tags", () => {
  it("adds the proposed tags to their groups, marks each one and counts them in the summary", async () => {
    const user = userEvent.setup();
    mockFetch({
      "POST /api/offers/extract": () =>
        jsonResponse({ ...TAGGED, company: "Acme SL", location: "Sevilla" }),
    });
    renderCreate();

    pasteOffer();
    await user.click(analyzeButton());

    expect(
      await screen.findByText(
        "Hemos rellenado 2 campos y añadido 3 etiquetas. Revísalos. Te falta completar: Puesto, Modalidad y Seniority.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("3 de 20")).toBeInTheDocument();
    expect(within(groupOf(STACK)).getAllByRole("listitem")).toHaveLength(2);
    expect(within(groupOf(LANGUAGES)).getAllByRole("listitem")).toHaveLength(1);
    for (const label of ["React", "TypeScript", "Inglés B2"]) {
      expect(chipOf(label)).toHaveTextContent(`${label}${AI_NOTE}`);
    }
    // The group legends get no badge.
    expect(screen.getByText(STACK)).toHaveTextContent(/^Stack tecnológico$/);
  });

  it("reads the tags-only sentences in the singular and the plural", async () => {
    const user = userEvent.setup();
    let calls = 0;
    mockFetch({
      "POST /api/offers/extract": () => {
        calls += 1;
        return jsonResponse(
          calls === 1
            ? withTags([{ label: "React", group: "stack" }])
            : withTags([
                { label: "Vue", group: "stack" },
                { label: "Docker", group: "nice_to_have" },
              ]),
        );
      },
    });
    renderCreate();

    pasteOffer();
    await user.click(analyzeButton());
    expect(
      await screen.findByText(
        "Hemos añadido 1 etiqueta. Revísala. Te falta completar: Puesto, Empresa, Modalidad y Seniority.",
      ),
    ).toBeInTheDocument();

    await user.click(analyzeButton());
    expect(
      await screen.findByText(
        "Hemos añadido 2 etiquetas. Revísalas. Te falta completar: Puesto, Empresa, Modalidad y Seniority.",
      ),
    ).toBeInTheDocument();
  });

  it("reads one field and one tag in the singular", async () => {
    const user = userEvent.setup();
    mockFetch({
      "POST /api/offers/extract": () =>
        jsonResponse({
          ...withTags([{ label: "React", group: "stack" }]),
          company: "Acme SL",
        }),
    });
    renderCreate();

    pasteOffer();
    await user.click(analyzeButton());

    expect(
      await screen.findByText(
        "Hemos rellenado 1 campo y añadido 1 etiqueta. Revísalos. Te falta completar: Puesto, Modalidad y Seniority.",
      ),
    ).toBeInTheDocument();
  });

  it("keeps a user tag with its spelling and no mark when the AI proposes the same one", async () => {
    const user = userEvent.setup();
    mockFetch({
      "POST /api/offers/extract": () =>
        jsonResponse(withTags([{ label: "React", group: "stack" }])),
    });
    renderCreate();

    await typeTag(user, STACK, "react");
    pasteOffer();
    await user.click(analyzeButton());

    expect(
      await screen.findByText(/No hemos encontrado datos nuevos/),
    ).toBeInTheDocument();
    expect(screen.getByText("1 de 20")).toBeInTheDocument();
    expect(chipOf("react")).not.toHaveTextContent(AI_NOTE);
    expect(chip("React")).toBeNull();
  });

  it("drops the mark of a removed chip for good, even when the user adds it again", async () => {
    const user = userEvent.setup();
    mockFetch({ "POST /api/offers/extract": () => jsonResponse(TAGGED) });
    renderCreate();

    pasteOffer();
    await user.click(analyzeButton());
    await screen.findByText(/añadido 3 etiquetas/);

    await user.click(screen.getByRole("button", { name: "Quitar TypeScript" }));
    expect(chip("TypeScript")).toBeNull();
    await typeTag(user, STACK, "TypeScript");

    expect(chipOf("TypeScript")).not.toHaveTextContent(AI_NOTE);
    expect(chipOf("React")).toHaveTextContent(AI_NOTE);
    expect(chipOf("Inglés B2")).toHaveTextContent(AI_NOTE);
  });

  it("keeps the marks of the chips still present when a second analysis adds only new tags", async () => {
    const user = userEvent.setup();
    let calls = 0;
    mockFetch({
      "POST /api/offers/extract": () => {
        calls += 1;
        return jsonResponse(
          calls === 1
            ? withTags([{ label: "React", group: "stack" }])
            : withTags([
                { label: "react", group: "stack" },
                { label: "Docker", group: "nice_to_have" },
              ]),
        );
      },
    });
    renderCreate();

    pasteOffer();
    await user.click(analyzeButton());
    await screen.findByText(/añadido 1 etiqueta\./);
    await user.click(analyzeButton());
    await waitFor(() => expect(chip("Docker")).not.toBeNull());

    expect(screen.getByText("2 de 20")).toBeInTheDocument();
    expect(chipOf("React")).toHaveTextContent(AI_NOTE);
    expect(chipOf("Docker")).toHaveTextContent(AI_NOTE);
    expect(within(groupOf(NICE)).getAllByRole("listitem")).toHaveLength(1);
  });

  it("leaves the chips as they were while analysing and after an error", async () => {
    const user = userEvent.setup();
    const pending = deferred();
    mockFetch({ "POST /api/offers/extract": () => pending.promise });
    renderCreate();

    await typeTag(user, STACK, "Node");
    pasteOffer();
    await user.click(analyzeButton());
    expect(await screen.findByText("Analizando la oferta…")).toBeVisible();
    expect(screen.getByText("1 de 20")).toBeInTheDocument();

    pending.release(jsonResponse(errorBody("LLM_ERROR"), 502));
    await screen.findByText(/No hemos podido leer la oferta/);

    expect(screen.getByText("1 de 20")).toBeInTheDocument();
    expect(chipOf("Node")).not.toHaveTextContent(AI_NOTE);
  });

  it("clears the chip marks with the other marks after a successful save", async () => {
    const user = userEvent.setup();
    mockFetch({
      "POST /api/offers/extract": () =>
        jsonResponse({ ...TAGGED, title: "Frontend", company: "Acme SL" }),
      "POST /api/applications": () => jsonResponse(created, 201),
    });
    const onSaved = vi.fn();
    render(
      <ApplicationEditContainer
        onSaved={onSaved}
        renderCancelLink={link("/applications")}
        renderListLink={link("/applications-list-stub")}
      />,
    );

    pasteOffer();
    await user.click(analyzeButton());
    await screen.findByText(/añadido 3 etiquetas/);
    expect(screen.getAllByText(AI_NOTE)).toHaveLength(3);

    await user.click(
      screen.getByRole("button", { name: "Guardar candidatura" }),
    );

    await waitFor(() => expect(onSaved).toHaveBeenCalledWith("new1"));
    expect(screen.queryByText(AI_NOTE)).toBeNull();
  });
});

const STORED_OFFER =
  "Oferta guardada: buscamos una persona frontend para un equipo de producto.";

const storedApplication = (offerText: string | null) =>
  applicationSchema.parse({
    id: "a1",
    title: "Frontend Developer",
    company: "Acme",
    status: "enviada",
    statusHistory: [{ status: "guardada", at: "2026-10-12T10:00:00.000Z" }],
    interviews: [],
    createdAt: "2026-10-12T10:00:00.000Z",
    updatedAt: "2026-10-30T08:15:00.000Z",
    ownerId: null,
    offerText,
  });

const renderEdit = () =>
  render(
    <ApplicationEditContainer
      applicationId="a1"
      onSaved={() => {}}
      renderCancelLink={link("/applications")}
      renderListLink={link("/applications-list-stub")}
    />,
  );

const sentBody = (
  fetchMock: ReturnType<typeof mockFetch>,
  method: string,
  path: string,
): { offerText?: unknown } => {
  const parsed: unknown = JSON.parse(
    String(callsTo(fetchMock, method, path)[0]?.[1]?.body),
  );
  return parsed as { offerText?: unknown };
};

describe("ApplicationEditContainer stored offer text", () => {
  it("posts the trimmed analyzed text as offerText on create", async () => {
    const user = userEvent.setup();
    const fetchMock = mockFetch({
      "POST /api/offers/extract": () => jsonResponse(EXTRACTION),
      "POST /api/applications": () => jsonResponse(created, 201),
    });
    renderCreate();

    pasteOffer(`  ${OFFER_TEXT}  `);
    await user.click(analyzeButton());
    await screen.findByText(/Hemos rellenado/);
    await user.click(
      screen.getByRole("button", { name: "Guardar candidatura" }),
    );

    await waitFor(() =>
      expect(callsTo(fetchMock, "POST", "/api/applications")).toHaveLength(1),
    );
    expect(sentBody(fetchMock, "POST", "/api/applications").offerText).toBe(
      OFFER_TEXT,
    );
  });

  it("keeps the analyzed text when the textarea changes afterwards without analysing", async () => {
    const user = userEvent.setup();
    const fetchMock = mockFetch({
      "POST /api/offers/extract": () => jsonResponse(EXTRACTION),
      "POST /api/applications": () => jsonResponse(created, 201),
    });
    renderCreate();

    pasteOffer();
    await user.click(analyzeButton());
    await screen.findByText(/Hemos rellenado/);
    pasteOffer("Otro texto distinto que se teclea pero no se analiza nunca.");
    await user.click(
      screen.getByRole("button", { name: "Guardar candidatura" }),
    );

    await waitFor(() =>
      expect(callsTo(fetchMock, "POST", "/api/applications")).toHaveLength(1),
    );
    expect(sentBody(fetchMock, "POST", "/api/applications").offerText).toBe(
      OFFER_TEXT,
    );
  });

  it("posts offerText null when nothing was analysed", async () => {
    const user = userEvent.setup();
    const fetchMock = mockFetch({
      "POST /api/applications": () => jsonResponse(created, 201),
    });
    renderCreate();

    pasteOffer();
    await user.type(screen.getByLabelText("Puesto *"), "Mi puesto");
    await user.type(screen.getByLabelText("Empresa *"), "Acme");
    await user.click(
      screen.getByRole("button", { name: "Guardar candidatura" }),
    );

    await waitFor(() =>
      expect(callsTo(fetchMock, "POST", "/api/applications")).toHaveLength(1),
    );
    expect(
      sentBody(fetchMock, "POST", "/api/applications").offerText,
    ).toBeNull();
  });

  it("prefills the edit panel with the stored text and sends it back unchanged", async () => {
    const user = userEvent.setup();
    const fetchMock = mockFetch({
      "GET /api/applications/a1": () =>
        jsonResponse(storedApplication(STORED_OFFER)),
      "PUT /api/applications/a1": () =>
        jsonResponse(storedApplication(STORED_OFFER)),
    });
    renderEdit();

    await user.click(
      await screen.findByRole("button", { name: "Pegar oferta" }),
    );
    expect(screen.getByLabelText("Texto de la oferta")).toHaveValue(
      STORED_OFFER,
    );

    await user.click(
      screen.getByRole("button", { name: "Guardar candidatura" }),
    );

    await waitFor(() =>
      expect(callsTo(fetchMock, "PUT", "/api/applications/a1")).toHaveLength(1),
    );
    expect(sentBody(fetchMock, "PUT", "/api/applications/a1").offerText).toBe(
      STORED_OFFER,
    );
  });

  it("keeps the stored text when the textarea is edited without analysing", async () => {
    const user = userEvent.setup();
    const fetchMock = mockFetch({
      "GET /api/applications/a1": () =>
        jsonResponse(storedApplication(STORED_OFFER)),
      "PUT /api/applications/a1": () =>
        jsonResponse(storedApplication(STORED_OFFER)),
    });
    renderEdit();

    await user.click(
      await screen.findByRole("button", { name: "Pegar oferta" }),
    );
    pasteOffer("Texto tecleado sin analizar que no debe llegar a guardarse.");
    await user.click(
      screen.getByRole("button", { name: "Guardar candidatura" }),
    );

    await waitFor(() =>
      expect(callsTo(fetchMock, "PUT", "/api/applications/a1")).toHaveLength(1),
    );
    expect(sentBody(fetchMock, "PUT", "/api/applications/a1").offerText).toBe(
      STORED_OFFER,
    );
  });

  it("sends the trimmed textarea text after analysing the stored offer again", async () => {
    const user = userEvent.setup();
    const fetchMock = mockFetch({
      "GET /api/applications/a1": () =>
        jsonResponse(storedApplication(STORED_OFFER)),
      "POST /api/offers/extract": () => jsonResponse(NO_DATA),
      "PUT /api/applications/a1": () =>
        jsonResponse(storedApplication(OFFER_TEXT)),
    });
    renderEdit();

    await user.click(
      await screen.findByRole("button", { name: "Pegar oferta" }),
    );
    pasteOffer(`  ${OFFER_TEXT}  `);
    await user.click(analyzeButton());
    await screen.findByText(/No hemos encontrado datos nuevos/);
    await user.click(
      screen.getByRole("button", { name: "Guardar candidatura" }),
    );

    await waitFor(() =>
      expect(callsTo(fetchMock, "PUT", "/api/applications/a1")).toHaveLength(1),
    );
    expect(sentBody(fetchMock, "PUT", "/api/applications/a1").offerText).toBe(
      OFFER_TEXT,
    );
  });

  it("starts with an empty textarea when the stored offerText is null", async () => {
    const user = userEvent.setup();
    mockFetch({
      "GET /api/applications/a1": () => jsonResponse(storedApplication(null)),
    });
    renderEdit();

    await user.click(
      await screen.findByRole("button", { name: "Pegar oferta" }),
    );
    expect(screen.getByLabelText("Texto de la oferta")).toHaveValue("");
  });
});

const HINT_MIN = "Pega al menos 50 caracteres";
const HINT_MAX = "Has llegado al límite de 20.000 caracteres.";

const idsOf = (control: HTMLElement): string[] =>
  (control.getAttribute("aria-describedby") ?? "").split(" ").filter(Boolean);

describe("ApplicationEditContainer offer limits", () => {
  it("starts empty with the counter, the hint and a focusable but disabled trigger", async () => {
    const user = userEvent.setup();
    const fetchMock = mockFetch({
      "POST /api/offers/extract": () => jsonResponse(EXTRACTION),
    });
    renderCreate();

    expect(screen.getByText("0 / 20.000")).toBeInTheDocument();
    const hint = screen.getByText(HINT_MIN);
    const button = analyzeButton();
    expect(button).toHaveAttribute("aria-disabled", "true");
    expect(button).not.toBeDisabled();
    expect(idsOf(button)).toStrictEqual([hint.id]);

    button.focus();
    expect(button).toHaveFocus();
    await user.click(button);

    expect(callsTo(fetchMock, "POST", "/api/offers/extract")).toHaveLength(0);
    expect(button).toHaveFocus();
  });

  it("keeps the trigger disabled at 49 trimmed characters and enables it at 50", () => {
    renderCreate();

    pasteOffer(`   ${"a".repeat(49)}   `);
    expect(analyzeButton()).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByText(HINT_MIN)).toBeInTheDocument();

    pasteOffer("a".repeat(50));
    expect(analyzeButton()).not.toHaveAttribute("aria-disabled", "true");
    expect(analyzeButton()).not.toHaveAttribute("aria-describedby");
    expect(screen.queryByText(HINT_MIN)).toBeNull();
  });

  it("formats the counter with the es-ES thousands separator", () => {
    renderCreate();

    pasteOffer("a".repeat(1234));

    expect(screen.getByText("1.234 / 20.000")).toBeInTheDocument();
  });

  it("does not put the counter in a live region", () => {
    renderCreate();

    pasteOffer("a".repeat(60));

    expect(screen.getByText("60 / 20.000").closest("[aria-live]")).toBeNull();
  });

  it("shows the limit hint at exactly 20,000 characters and caps the textarea", () => {
    renderCreate();

    pasteOffer("a".repeat(20000));

    expect(screen.getByText("20.000 / 20.000")).toBeInTheDocument();
    expect(screen.getByText(HINT_MAX)).toBeInTheDocument();
    expect(screen.queryByText(HINT_MIN)).toBeNull();
    expect(screen.getByLabelText("Texto de la oferta")).toHaveAttribute(
      "maxlength",
      "20000",
    );
  });

  it("measures UTF-16 code units, like the API schema", () => {
    renderCreate();

    // 25 emoji are 50 code units: the gate and the counter agree with Zod's string length.
    pasteOffer("😀".repeat(25));

    expect(screen.getByText("50 / 20.000")).toBeInTheDocument();
    expect(analyzeButton()).not.toHaveAttribute("aria-disabled", "true");
  });

  it("sends nothing from a trimmed draft shorter than the minimum", async () => {
    const user = userEvent.setup();
    const fetchMock = mockFetch({
      "POST /api/offers/extract": () => jsonResponse(EXTRACTION),
    });
    renderCreate();

    pasteOffer(`${"a".repeat(49)}          `);
    await user.click(analyzeButton());

    expect(callsTo(fetchMock, "POST", "/api/offers/extract")).toHaveLength(0);
    expect(screen.queryByText("Analizando la oferta…")).toBeNull();
  });
});

const cancelButton = () =>
  screen.getByRole("button", { name: "Cancelar análisis" });
const queryCancel = () =>
  screen.queryByRole("button", { name: "Cancelar análisis" });

describe("ApplicationEditContainer cancel and analysing state", () => {
  it("sends one request when the trigger is pressed twice while analysing", async () => {
    const user = userEvent.setup();
    const pending = deferred();
    const fetchMock = mockFetch({
      "POST /api/offers/extract": () => pending.promise,
    });
    renderCreate();

    pasteOffer();
    await user.click(analyzeButton());
    await screen.findByText("Analizando la oferta…");
    await user.click(analyzeButton());

    expect(callsTo(fetchMock, "POST", "/api/offers/extract")).toHaveLength(1);
  });

  it("locks the textarea and the panel trigger while analysing but not the form", async () => {
    const user = userEvent.setup();
    mockFetch({ "POST /api/offers/extract": () => deferred().promise });
    renderCreate();

    expect(queryCancel()).toBeNull();
    pasteOffer();
    await user.click(analyzeButton());
    await screen.findByText("Analizando la oferta…");

    const textarea = screen.getByLabelText("Texto de la oferta");
    expect(textarea).toHaveAttribute("readonly");
    expect(textarea).toHaveClass("bg-muted");
    expect(screen.getByRole("button", { name: "Pegar oferta" })).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Pegar oferta" }),
    ).toHaveAttribute("aria-expanded", "true");
    expect(cancelButton()).toBeVisible();
    expect(screen.getByLabelText("Puesto *")).toBeEnabled();
    await user.type(screen.getByLabelText("Puesto *"), "Mi puesto");
    expect(screen.getByLabelText("Puesto *")).toHaveValue("Mi puesto");
    expect(document.querySelector("[aria-busy]")).toBeNull();
  });

  it("cancels: aborts the request, says so, moves focus to the trigger and ignores a late answer", async () => {
    const user = userEvent.setup();
    const pending = deferred();
    const fetchMock = mockFetch({
      "POST /api/offers/extract": () => pending.promise,
    });
    renderCreate();

    pasteOffer();
    await user.click(analyzeButton());
    await screen.findByText("Analizando la oferta…");
    const signal = callsTo(fetchMock, "POST", "/api/offers/extract")[0]?.[1]
      ?.signal;
    expect(signal?.aborted).toBe(false);

    await user.click(cancelButton());

    expect(signal?.aborted).toBe(true);
    const message = screen.getByText("Análisis cancelado.");
    expect(message.querySelector("svg")).toBeNull();
    expect(screen.queryByText("Analizando la oferta…")).toBeNull();
    expect(queryCancel()).toBeNull();
    expect(analyzeButton()).toHaveFocus();
    expect(screen.getByLabelText("Texto de la oferta")).not.toHaveAttribute(
      "readonly",
    );

    pending.release(jsonResponse(EXTRACTION));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(screen.getByText("Análisis cancelado.")).toBeInTheDocument();
    expect(screen.getByLabelText("Puesto *")).toHaveValue("");
    expect(screen.queryByText(/Hemos rellenado/)).toBeNull();
  });

  it("sends a fresh request after a cancel and fills only the still-empty fields", async () => {
    const user = userEvent.setup();
    const first = deferred();
    let calls = 0;
    const fetchMock = mockFetch({
      "POST /api/offers/extract": () => {
        calls += 1;
        return calls === 1
          ? first.promise
          : Promise.resolve(jsonResponse(EXTRACTION));
      },
    });
    renderCreate();

    pasteOffer();
    await user.click(analyzeButton());
    await screen.findByText("Analizando la oferta…");
    await user.click(cancelButton());
    await user.type(screen.getByLabelText("Empresa *"), "Acme");
    await user.click(analyzeButton());

    expect(
      await screen.findByText("Hemos rellenado 8 campos. Revísalos."),
    ).toBeInTheDocument();
    expect(callsTo(fetchMock, "POST", "/api/offers/extract")).toHaveLength(2);
    expect(screen.getByLabelText("Empresa *")).toHaveValue("Acme");
    expect(screen.getByLabelText("Puesto *")).toHaveValue(
      "Desarrollador/a Frontend Senior",
    );
    expect(screen.queryByText("Análisis cancelado.")).toBeNull();
  });

  it("does not move focus when the analysis succeeds or fails", async () => {
    const user = userEvent.setup();
    let calls = 0;
    mockFetch({
      "POST /api/offers/extract": () => {
        calls += 1;
        return calls === 1
          ? jsonResponse(errorBody("LLM_ERROR"), 502)
          : jsonResponse(EXTRACTION);
      },
    });
    renderCreate();

    pasteOffer();
    await user.click(analyzeButton());
    await screen.findByText(/No hemos podido leer la oferta/);
    expect(analyzeButton()).toHaveFocus();

    screen.getByLabelText("Empresa *").focus();
    await user.click(analyzeButton());
    await screen.findByText(/Hemos rellenado/);
    await user.click(screen.getByLabelText("Ubicación"));
    expect(screen.getByLabelText("Ubicación")).toHaveFocus();
  });

  it("inserts a newline with Enter in the textarea and submits nothing", async () => {
    const user = userEvent.setup();
    const fetchMock = mockFetch({
      "POST /api/applications": () => jsonResponse(created, 201),
    });
    renderCreate();

    await user.type(screen.getByLabelText("Puesto *"), "Mi puesto");
    await user.type(screen.getByLabelText("Empresa *"), "Acme");
    await user.type(
      screen.getByLabelText("Texto de la oferta"),
      "primera linea{Enter}segunda",
    );

    expect(screen.getByLabelText("Texto de la oferta")).toHaveValue(
      "primera linea\nsegunda",
    );
    expect(callsTo(fetchMock, "POST", "/api/applications")).toHaveLength(0);
  });

  it("tabs from the panel trigger to the textarea, the AI button, the cancel button and the first field", async () => {
    const user = userEvent.setup();
    mockFetch({ "POST /api/offers/extract": () => deferred().promise });
    renderCreate();

    pasteOffer();
    await user.click(analyzeButton());
    await screen.findByText("Analizando la oferta…");
    // The trigger is disabled while analysing, so the sequence starts at the textarea.
    screen.getByLabelText("Texto de la oferta").focus();
    await user.tab();
    expect(analyzeButton()).toHaveFocus();
    await user.tab();
    expect(cancelButton()).toHaveFocus();
    await user.tab();
    expect(screen.getByLabelText("Puesto *")).toHaveFocus();
  });

  it("tabs from the AI button straight to the first field when idle", async () => {
    const user = userEvent.setup();
    renderCreate();

    pasteOffer();
    screen.getByRole("button", { name: "Pegar oferta" }).focus();
    await user.tab();
    expect(screen.getByLabelText("Texto de la oferta")).toHaveFocus();
    await user.tab();
    expect(analyzeButton()).toHaveFocus();
    await user.tab();
    expect(screen.getByLabelText("Puesto *")).toHaveFocus();
  });

  it("aborts silently when the form is left while analysing", async () => {
    const user = userEvent.setup();
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const pending = deferred();
    const fetchMock = mockFetch({
      "POST /api/offers/extract": () => pending.promise,
    });
    const { unmount } = renderCreate();

    pasteOffer();
    await user.click(analyzeButton());
    await screen.findByText("Analizando la oferta…");
    const signal = callsTo(fetchMock, "POST", "/api/offers/extract")[0]?.[1]
      ?.signal;

    unmount();
    expect(signal?.aborted).toBe(true);
    pending.release(jsonResponse(EXTRACTION));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(consoleError).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });
});
