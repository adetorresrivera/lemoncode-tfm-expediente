import { applicationStatusSchema } from "@tfm/contracts";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { StatusBadge } from "./status-badge";
import { TagChip } from "./tag-chip";

const EXPECTED = [
  ["guardada", "Guardada", "saved"],
  ["enviada", "Enviada", "sent"],
  ["en_entrevistas", "En entrevistas", "interview"],
  ["oferta_recibida", "Oferta recibida", "offer"],
  ["aceptada", "Aceptada", "offer"],
  ["rechazada", "Rechazada", "rejected"],
  ["descartada", "Descartada", "rejected"],
] as const;

describe("StatusBadge", () => {
  it("covers every contract status", () => {
    expect(EXPECTED.map(([status]) => status)).toStrictEqual(
      applicationStatusSchema.options,
    );
  });

  it.each(EXPECTED)(
    "renders %s as «%s» with the %s tokens and an aria-hidden icon and dot",
    (status, label, family) => {
      render(<StatusBadge status={status} />);

      const badge = screen.getByText(label);
      expect(badge).toHaveClass(
        `bg-status-${family}-bg`,
        `text-status-${family}`,
      );
      const hidden = badge.querySelectorAll('[aria-hidden="true"]');
      expect(hidden).toHaveLength(2);
      expect(badge.querySelector("svg")).not.toBeNull();
    },
  );

  it("uses a different icon for statuses that share a colour family", () => {
    const { container: a } = render(<StatusBadge status="aceptada" />);
    const { container: b } = render(<StatusBadge status="oferta_recibida" />);
    expect(a.querySelector("svg")?.innerHTML).not.toBe(
      b.querySelector("svg")?.innerHTML,
    );
  });
});

describe("TagChip", () => {
  it("renders a plain chip with a truncating label and its full text as title", () => {
    render(<TagChip label="React" />);

    expect(screen.getByText("React")).toHaveClass("truncate");
    expect(screen.getByText("React")).toHaveAttribute("title", "React");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.getByText("React").parentElement).not.toHaveClass(
      "border-dashed",
    );
  });

  it("draws the soft variant with a dashed border", () => {
    render(<TagChip label="Docker" soft />);
    expect(screen.getByText("Docker").parentElement).toHaveClass(
      "border-dashed",
    );
  });

  it("renders a «Quitar {label}» button that calls onRemove", async () => {
    const onRemove = vi.fn();
    render(<TagChip label="React" onRemove={onRemove} />);

    await userEvent.click(screen.getByRole("button", { name: "Quitar React" }));

    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  it("renders a pressed toggle with a check icon when selected", async () => {
    const onToggle = vi.fn();
    const { rerender } = render(
      <TagChip label="React" selected={false} onToggle={onToggle} />,
    );

    const off = screen.getByRole("button", { name: "React" });
    expect(off).toHaveAttribute("aria-pressed", "false");
    expect(off.querySelector("svg")).toBeNull();
    await userEvent.click(off);
    expect(onToggle).toHaveBeenCalledTimes(1);

    rerender(<TagChip label="React" selected onToggle={onToggle} />);
    const on = screen.getByRole("button", { name: "React" });
    expect(on).toHaveAttribute("aria-pressed", "true");
    expect(on.querySelector("svg")).not.toBeNull();
    expect(on).toHaveClass("bg-primary", "text-primary-foreground");
  });

  it("renders a hostile label as text, never as markup", () => {
    render(<TagChip label="<img src=x onerror=alert(1)>" />);

    expect(
      screen.getByText("<img src=x onerror=alert(1)>"),
    ).toBeInTheDocument();
    expect(document.querySelector("img")).toBeNull();
  });
});
