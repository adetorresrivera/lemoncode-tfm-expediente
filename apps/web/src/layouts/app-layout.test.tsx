import { createMemoryHistory, RouterProvider } from "@tanstack/react-router";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { createAppRouter } from "@/core/router/router";
import { THEME_STORAGE_KEY } from "@/core/theme/theme";

async function renderShell() {
  const router = createAppRouter(
    createMemoryHistory({ initialEntries: ["/applications"] }),
  );
  render(<RouterProvider router={router} />);
  await screen.findByRole("heading", { level: 1, name: "Mis candidaturas" });
  return router;
}

describe("AppLayout", () => {
  it("shows the main navigation with the active link", async () => {
    await renderShell();

    const nav = screen.getByRole("navigation", { name: "Principal" });
    const link = within(nav).getByRole("link", { name: "Mis candidaturas" });

    expect(link).toHaveAttribute("href", "/applications");
    expect(link).toHaveAttribute("aria-current", "page");
  });

  it("marks Tablero and Documentos as disabled without links", async () => {
    await renderShell();

    const nav = screen.getByRole("navigation", { name: "Principal" });

    for (const label of ["Tablero", "Documentos"]) {
      const item = within(nav).getByText(label).closest("[aria-disabled]");
      expect(item).toHaveAttribute("aria-disabled", "true");
      expect(item).toHaveTextContent("Próximamente");
      expect(
        within(nav).queryByRole("link", { name: new RegExp(label) }),
      ).not.toBeInTheDocument();
    }
  });

  it("renders the scene inside the main landmark", async () => {
    await renderShell();

    const main = screen.getByRole("main");

    expect(
      within(main).getByRole("heading", { level: 1, name: "Mis candidaturas" }),
    ).toBeInTheDocument();
  });

  it("opens the menu sheet with navigation and theme switch", async () => {
    const user = userEvent.setup();
    await renderShell();

    await user.click(screen.getByRole("button", { name: "Abrir menú" }));

    const dialog = await screen.findByRole("dialog", { name: "Expediente" });
    expect(
      within(dialog).getByRole("navigation", { name: "Principal" }),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByRole("link", { name: "Mis candidaturas" }),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByRole("radio", { name: "Oscuro" }),
    ).toBeInTheDocument();
  });

  it("closes the sheet with Escape", async () => {
    const user = userEvent.setup();
    await renderShell();

    await user.click(screen.getByRole("button", { name: "Abrir menú" }));
    await screen.findByRole("dialog");
    await user.keyboard("{Escape}");

    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
  });

  it("closes the sheet after following a link", async () => {
    const user = userEvent.setup();
    await renderShell();

    await user.click(screen.getByRole("button", { name: "Abrir menú" }));
    const dialog = await screen.findByRole("dialog");
    await user.click(
      within(dialog).getByRole("link", { name: "Mis candidaturas" }),
    );

    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
  });

  it("switches to dark from the sidebar and stores the choice", async () => {
    const user = userEvent.setup();
    await renderShell();

    await user.click(screen.getByRole("radio", { name: "Oscuro" }));

    expect(document.documentElement).toHaveClass("dark");
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
  });
});
