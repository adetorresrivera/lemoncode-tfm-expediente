import { applicationSchema } from "@tfm/contracts";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { jsonResponse, mockFetch } from "@/test/mock-fetch";
import { ApplicationListContainer } from "./application-list.container";
import {
  mapApplicationFromApiToVm,
  mapApplicationListFromApiToVm,
} from "./application-list.mapper";

const EMPTY_TEXT =
  "Aún no has guardado ninguna oferta. Empieza añadiendo la primera.";

const makeApplication = (id: string, title: string, company: string) =>
  applicationSchema.parse({
    id,
    title,
    company,
    status: "guardada",
    statusHistory: [{ status: "guardada", at: "2026-10-12T10:00:00.000Z" }],
    interviews: [],
    createdAt: "2026-10-12T10:00:00.000Z",
    updatedAt: "2026-10-12T10:00:00.000Z",
    ownerId: null,
  });

const application = makeApplication("a1", "Frontend Developer", "Lemoncode");

describe("application-list mapper", () => {
  it("maps an API application to exactly the view-model fields", () => {
    expect(mapApplicationFromApiToVm(application)).toStrictEqual({
      id: "a1",
      title: "Frontend Developer",
      company: "Lemoncode",
      status: "guardada",
    });
  });

  it("maps an empty list to an empty list", () => {
    expect(mapApplicationListFromApiToVm([])).toStrictEqual([]);
  });

  it("maps every element of the list", () => {
    expect(mapApplicationListFromApiToVm([application])).toHaveLength(1);
  });
});

describe("ApplicationListContainer", () => {
  it("renders the applications in the exact order of the API response", async () => {
    mockFetch({
      "GET /api/applications": [
        makeApplication("b2", "Zeta Engineer", "Zeta"),
        makeApplication("a1", "Alpha Engineer", "Alpha"),
      ],
    });
    render(<ApplicationListContainer />);

    expect(screen.getByRole("status")).toHaveTextContent(
      "Cargando candidaturas…",
    );
    const items = await screen.findAllByRole("listitem");
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent("Zeta Engineer");
    expect(items[1]).toHaveTextContent("Alpha Engineer");
    expect(screen.queryByText(EMPTY_TEXT)).not.toBeInTheDocument();
  });

  it("shows the empty text and no list for an empty response", async () => {
    mockFetch({ "GET /api/applications": [] });
    render(<ApplicationListContainer />);

    expect(await screen.findByText(EMPTY_TEXT)).toBeInTheDocument();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });

  it("offers «Reintentar» after a server error and refetches exactly once per click", async () => {
    let calls = 0;
    const fetchMock = mockFetch({
      "GET /api/applications": () => {
        calls += 1;
        return calls === 1
          ? jsonResponse(
              { error: { code: "INTERNAL_ERROR", message: "Error interno" } },
              500,
            )
          : jsonResponse([application]);
      },
    });
    render(<ApplicationListContainer />);

    const retry = await screen.findByRole("button", { name: "Reintentar" });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await userEvent.click(retry);

    expect(await screen.findByRole("listitem")).toHaveTextContent(
      "Frontend Developer",
    );
    expect(fetchMock).toHaveBeenCalledTimes(2);
    await waitFor(() =>
      expect(
        screen.queryByRole("button", { name: "Reintentar" }),
      ).not.toBeInTheDocument(),
    );
  });
});
