import { applicationStatusSchema } from "@tfm/contracts";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AiMark } from "./ai-mark";
import { RequestStatus } from "./request-status";
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

  it("marks an AI tag with a decorative Sparkles icon and a screen-reader note outside the truncating span", () => {
    render(<TagChip label="React" aiSuggested />);

    const chip = screen.getByText("React").parentElement;
    const icon = chip?.querySelector("svg");
    expect(icon).toHaveAttribute("aria-hidden", "true");
    expect(icon).toHaveClass("size-3", "text-primary");
    expect(chip?.firstElementChild).toBe(icon);
    expect(screen.getByText("React")).toHaveClass("truncate");
    expect(screen.getByText("(propuesta por IA)")).toHaveClass("sr-only");
    expect(screen.getByText("(propuesta por IA)").parentElement).toBe(chip);
    expect(chip).toHaveTextContent("React(propuesta por IA)");
  });

  it("keeps the remove button name on an AI tag", () => {
    render(<TagChip label="React" aiSuggested onRemove={() => {}} />);
    expect(
      screen.getByRole("button", { name: "Quitar React" }),
    ).toBeInTheDocument();
  });

  it("draws no AI mark unless aiSuggested is set", () => {
    const { container } = render(
      <>
        <TagChip label="Uno" />
        <TagChip label="Dos" soft />
        <TagChip label="Tres" onRemove={() => {}} />
        <TagChip label="Cuatro" selected={false} onToggle={() => {}} />
      </>,
    );
    expect(screen.queryByText("(propuesta por IA)")).not.toBeInTheDocument();
    // Only the X icon of the removable chip.
    expect(container.querySelectorAll("svg")).toHaveLength(1);
  });

  it("renders a hostile label as text, never as markup", () => {
    render(<TagChip label="<img src=x onerror=alert(1)>" />);

    expect(
      screen.getByText("<img src=x onerror=alert(1)>"),
    ).toBeInTheDocument();
    expect(document.querySelector("img")).toBeNull();
  });
});

describe("RequestStatus", () => {
  it("renders a spinning, motion-safe loader for loading, hidden from assistive tech", () => {
    const { container } = render(
      <RequestStatus kind="loading" message="Guardando…" />,
    );

    expect(screen.getByText("Guardando…")).toBeInTheDocument();
    const icon = container.querySelector("svg");
    expect(icon).toHaveAttribute("aria-hidden", "true");
    expect(icon).toHaveClass("animate-spin", "motion-reduce:animate-none");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("renders a check for success", () => {
    const { container } = render(
      <RequestStatus kind="success" message="Cambios guardados." />,
    );

    expect(screen.getByText("Cambios guardados.")).toBeInTheDocument();
    const icon = container.querySelector("svg");
    expect(icon).toHaveAttribute("aria-hidden", "true");
    expect(icon).not.toHaveClass("text-destructive");
  });

  it("renders the alert icon, the message and a retry button for error", async () => {
    const onRetry = vi.fn();
    const { container } = render(
      <RequestStatus
        kind="error"
        message="No se pudo guardar."
        onRetry={onRetry}
      />,
    );

    expect(screen.getByText("No se pudo guardar.")).toBeInTheDocument();
    const icon = container.querySelector("svg");
    expect(icon).not.toHaveClass("text-destructive");
    expect(icon).toHaveClass("mt-1");
    expect(icon).toHaveAttribute("aria-hidden", "true");

    await userEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("uses a custom retry label and adds no live region of its own", () => {
    render(
      <RequestStatus
        kind="error"
        message="Fallo."
        onRetry={() => {}}
        retryLabel="Volver a probar"
      />,
    );

    expect(
      screen.getByRole("button", { name: "Volver a probar" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});

describe("AiMark", () => {
  it("renders the navy badge with a visible «IA» hidden from assistive tech and an sr-only reading", () => {
    render(<AiMark id="field-title-ai" />);

    const badge = document.getElementById("field-title-ai");
    expect(badge).not.toBeNull();
    expect(badge).toHaveClass(
      "inline-flex",
      "h-5",
      "items-center",
      "rounded-sm",
      "bg-brand-navy",
      "px-2",
      "text-[11px]",
      "font-semibold",
      "tracking-wide",
      "text-brand-parchment",
    );
    expect(screen.getByText("IA")).toHaveAttribute("aria-hidden", "true");
    expect(screen.getByText("Rellenado por la IA")).toHaveClass("sr-only");
  });
});
