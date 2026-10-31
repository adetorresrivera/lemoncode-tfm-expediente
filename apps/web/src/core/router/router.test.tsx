import { createMemoryHistory, RouterProvider } from "@tanstack/react-router";
import { applicationSchema } from "@tfm/contracts";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { mockFetch } from "@/test/mock-fetch";
import { createAppRouter } from "./router";

const EMPTY_TEXT =
  "Aún no has guardado ninguna oferta. Empieza añadiendo la primera.";

const stored = applicationSchema.parse({
  id: "a1",
  title: "Frontend Developer",
  company: "Lemoncode",
  status: "guardada",
  statusHistory: [{ status: "guardada", at: "2026-10-12T10:00:00.000Z" }],
  interviews: [],
  createdAt: "2026-10-12T10:00:00.000Z",
  updatedAt: "2026-10-12T10:00:00.000Z",
  ownerId: null,
});

describe("app router", () => {
  it("redirects / to /applications and lists the stored applications", async () => {
    mockFetch({ "GET /api/applications": [stored] });
    const router = createAppRouter(
      createMemoryHistory({ initialEntries: ["/"] }),
    );
    render(<RouterProvider router={router} />);

    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: "Mis candidaturas",
      }),
    ).toBeInTheDocument();
    expect(await screen.findByText("Frontend Developer")).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/applications");
  });

  it("shows the empty text when there are no applications", async () => {
    mockFetch({ "GET /api/applications": [] });
    const router = createAppRouter(
      createMemoryHistory({ initialEntries: ["/applications"] }),
    );
    render(<RouterProvider router={router} />);

    expect(await screen.findByText(EMPTY_TEXT)).toBeInTheDocument();
  });

  it("renders the scene header and eyebrow at /applications", async () => {
    const router = createAppRouter(
      createMemoryHistory({ initialEntries: ["/applications"] }),
    );
    render(<RouterProvider router={router} />);

    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: "Mis candidaturas",
      }),
    ).toBeInTheDocument();
    expect(
      within(screen.getByRole("main")).getByText("Expediente"),
    ).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/applications");
  });
});
