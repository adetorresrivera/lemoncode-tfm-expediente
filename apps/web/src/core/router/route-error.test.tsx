import {
  createMemoryHistory,
  RouterContextProvider,
  RouterProvider,
} from "@tanstack/react-router";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RootError } from "@/common/components/route-error";
import { checkA11y, summarizeViolations } from "@/test/axe";
import { createAppRouter } from "./router";

// `vi.mock` is hoisted per file: this file forces a route render error by making one scene throw.
vi.mock("@/scenes/document-list.scene", () => ({
  DocumentListScene: () => {
    throw new Error("detalle interno");
  },
}));

afterEach(() => {
  vi.restoreAllMocks();
});

describe("route render error", () => {
  it("shows the Spanish error card inside the shell and never the thrown message", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const router = createAppRouter(
      createMemoryHistory({ initialEntries: ["/documents"] }),
    );
    render(<RouterProvider router={router} />);

    const heading = await screen.findByRole("heading", {
      level: 1,
      name: "Algo ha fallado",
    });
    const main = screen.getByRole("main");
    expect(main).toContainElement(heading);
    expect(
      screen.getByRole("navigation", { name: "Principal" }),
    ).toBeInTheDocument();

    const card = within(main).getByRole("alert");
    expect(card).toContainElement(heading);
    expect(
      within(card).getByText(
        "No se pudo mostrar esta pantalla. Inténtalo de nuevo o vuelve a Mis candidaturas.",
      ),
    ).toBeInTheDocument();
    expect(document.body).not.toHaveTextContent("detalle interno");

    expect(
      within(card).getByRole("button", { name: "Volver a cargar la pantalla" }),
    ).toBeInTheDocument();
    const way = within(card).getByRole("link", {
      name: "Volver a Mis candidaturas",
    });
    expect(way.tagName).toBe("A");
    expect(way).toHaveAttribute("href", "/applications");

    await waitFor(() => expect(heading).toHaveFocus());
    expect(document.title).toBe("Algo ha fallado · Expediente");
    expect(consoleError).toHaveBeenCalled();
  });

  it.each(["light", "dark"])(
    "has no axe violations in the %s theme",
    async (theme) => {
      if (theme === "dark") document.documentElement.classList.add("dark");
      vi.spyOn(console, "error").mockImplementation(() => {});
      const router = createAppRouter(
        createMemoryHistory({ initialEntries: ["/documents"] }),
      );
      render(<RouterProvider router={router} />);

      await screen.findByRole("heading", { level: 1, name: "Algo ha fallado" });

      expect(summarizeViolations(await checkA11y())).toEqual([]);
    },
  );

  it("renders the same card standalone, without the shell, for a root failure", async () => {
    const user = userEvent.setup();
    const reset = vi.fn();
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const router = createAppRouter(
      createMemoryHistory({ initialEntries: ["/applications"] }),
    );
    const invalidate = vi.spyOn(router, "invalidate").mockResolvedValue();
    const { container } = render(
      <RouterContextProvider router={router}>
        <RootError error={new Error("detalle interno")} reset={reset} />
      </RouterContextProvider>,
    );

    expect(
      screen.getByRole("heading", { level: 1, name: "Algo ha fallado" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
    expect(container.firstElementChild).toHaveClass("min-h-screen");
    expect(document.body).not.toHaveTextContent("detalle interno");
    expect(consoleError).toHaveBeenCalledTimes(1);
    expect(
      screen.getByRole("link", { name: "Volver a Mis candidaturas" }),
    ).toHaveAttribute("href", "/applications");

    await user.click(
      screen.getByRole("button", { name: "Volver a cargar la pantalla" }),
    );
    expect(reset).toHaveBeenCalledTimes(1);
    expect(invalidate).toHaveBeenCalledTimes(1);
  });
});
