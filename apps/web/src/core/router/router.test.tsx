import { createMemoryHistory, RouterProvider } from "@tanstack/react-router";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { createAppRouter } from "./router";

const EMPTY_TEXT =
  "Aún no has guardado ninguna oferta. Empieza añadiendo la primera.";

describe("app router", () => {
  it("redirects / to /applications and shows the empty list", async () => {
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
    expect(screen.getByText(EMPTY_TEXT)).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/applications");
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
