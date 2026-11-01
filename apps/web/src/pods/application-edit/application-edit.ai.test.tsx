import { applicationSchema } from "@tfm/contracts";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
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
      await screen.findByText("Hemos rellenado 5 campos. Revísalos."),
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
    await screen.findByText("Hemos rellenado 5 campos. Revísalos.");
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
});
