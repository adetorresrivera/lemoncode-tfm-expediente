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

  it("marks Tablero as disabled without a link", async () => {
    await renderShell();

    const nav = screen.getByRole("navigation", { name: "Principal" });
    const item = within(nav).getByText("Tablero").closest("[aria-disabled]");

    expect(item).toHaveAttribute("aria-disabled", "true");
    expect(item).toHaveTextContent("Próximamente");
    expect(
      within(nav).queryByRole("link", { name: /Tablero/ }),
    ).not.toBeInTheDocument();
  });

  it("links Documentos to /documents without «Próximamente»", async () => {
    await renderShell();

    const nav = screen.getByRole("navigation", { name: "Principal" });
    const link = within(nav).getByRole("link", { name: "Documentos" });

    expect(link).toHaveAttribute("href", "/documents");
    expect(link).not.toHaveAttribute("aria-disabled");
    expect(link).not.toHaveTextContent("Próximamente");
    expect(link).toHaveClass(
      "flex",
      "items-center",
      "gap-3",
      "rounded-md",
      "px-3",
      "py-2",
      "text-sm",
      "font-medium",
      "text-sidebar-foreground",
    );
    expect(link).not.toHaveClass("cursor-not-allowed");
  });

  it("opens the library from the sidebar link", async () => {
    const user = userEvent.setup();
    const router = await renderShell();

    await user.click(
      within(screen.getByRole("navigation", { name: "Principal" })).getByRole(
        "link",
        { name: "Documentos" },
      ),
    );

    expect(
      await screen.findByRole("heading", { level: 1, name: "Documentos" }),
    ).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/documents");
  });

  it("closes the sheet after following the Documentos link", async () => {
    const user = userEvent.setup();
    await renderShell();

    await user.click(screen.getByRole("button", { name: "Abrir menú" }));
    const dialog = await screen.findByRole("dialog");
    const link = within(dialog).getByRole("link", { name: "Documentos" });
    expect(link).not.toHaveTextContent("Próximamente");
    await user.click(link);

    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    expect(
      await screen.findByRole("heading", { level: 1, name: "Documentos" }),
    ).toBeInTheDocument();
  });

  it("renders the scene inside the main landmark", async () => {
    await renderShell();

    const main = screen.getByRole("main");

    expect(
      within(main).getByRole("heading", { level: 1, name: "Mis candidaturas" }),
    ).toBeInTheDocument();
  });

  it("clears the 256 px sidebar and centres a width-limited content column", async () => {
    await renderShell();

    const main = screen.getByRole("main");

    expect(main).toHaveClass("lg:pl-64");
    expect(main).not.toHaveClass("lg:pl-72");
    expect(main.firstElementChild).toHaveClass(
      "mx-auto",
      "w-full",
      "max-w-5xl",
    );
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

    const trigger = screen.getByRole("button", { name: "Abrir menú" });
    await user.click(trigger);
    await screen.findByRole("dialog");
    await user.keyboard("{Escape}");

    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it("places the menu button before the wordmark in the mobile header", async () => {
    await renderShell();

    const trigger = screen.getByRole("button", { name: "Abrir menú" });
    const header = trigger.closest("header");
    if (header === null) {
      throw new Error("The menu button is not inside a header");
    }

    expect(header.firstElementChild).toBe(trigger);

    const wordmark = within(header).getByText("Expediente");
    expect(
      trigger.compareDocumentPosition(wordmark) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
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
