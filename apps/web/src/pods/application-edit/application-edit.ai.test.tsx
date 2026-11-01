import { applicationSchema } from "@tfm/contracts";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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
  tags: [{ label: "React", group: "stack" }],
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
      "No hay conexión con el servidor. Inténtalo otra vez.",
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

    expect(
      await screen.findByText(
        "No hemos encontrado datos nuevos en la oferta. Completa el formulario a mano.",
      ),
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
