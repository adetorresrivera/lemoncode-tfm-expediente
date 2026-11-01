import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Input } from "@/common/components/ui/input";
import { controlProps } from "./field-props";
import { FormField } from "./form-field";

describe("controlProps marks", () => {
  it("is unchanged without flags", () => {
    expect(controlProps({ id: "f", hint: "h" })).toStrictEqual({
      id: "f",
      "aria-describedby": "f-hint",
      "aria-invalid": undefined,
      "aria-required": undefined,
      className: undefined,
    });
  });

  it("adds the badge id after the hint when the field was filled by the AI", () => {
    const props = controlProps({ id: "f", hint: "h", aiFilled: true });
    expect(props["aria-describedby"]).toBe("f-hint f-ai");
    expect(props.className).toBeUndefined();
  });

  it("adds the missing id and the gold classes when the field is missing", () => {
    const props = controlProps({ id: "f", missing: true });
    expect(props["aria-describedby"]).toBe("f-missing");
    expect(props.className).toBe("border-brand-gold bg-ai-missing-bg");
  });

  it("drops the missing id and the classes when there is an error, keeping the order hint, ai, error", () => {
    const props = controlProps({
      id: "f",
      hint: "h",
      aiFilled: true,
      missing: true,
      error: "Mal.",
    });
    expect(props["aria-describedby"]).toBe("f-hint f-ai f-error");
    expect(props.className).toBeUndefined();
    expect(props["aria-invalid"]).toBe(true);
  });
});

describe("FormField marks", () => {
  it("renders the badge next to the label, outside it, without changing the accessible name", () => {
    render(
      <FormField id="field-title" label="Puesto" required aiFilled>
        <Input {...controlProps({ id: "field-title", aiFilled: true })} />
      </FormField>,
    );

    const control = screen.getByLabelText("Puesto *");
    expect(control).toHaveAttribute("aria-describedby", "field-title-ai");
    const badge = document.getElementById("field-title-ai");
    expect(badge).not.toBeNull();
    expect(badge?.closest("label")).toBeNull();
    expect(screen.getByText("Rellenado por la IA")).toBeInTheDocument();
  });

  it("renders no badge when the field was not filled by the AI", () => {
    render(
      <FormField id="f" label="Puesto">
        <Input {...controlProps({ id: "f" })} />
      </FormField>,
    );
    expect(screen.queryByText("Rellenado por la IA")).toBeNull();
  });

  it("renders «Complétalo tú» in the hint slot when missing and there is no error", () => {
    render(
      <FormField id="field-title" label="Puesto" missing>
        <Input {...controlProps({ id: "field-title", missing: true })} />
      </FormField>,
    );

    const line = screen.getByText("Complétalo tú");
    expect(line).toHaveAttribute("id", "field-title-missing");
    expect(line).toHaveClass("text-sm", "font-semibold", "text-brand-gold-ink");
    expect(screen.getByLabelText("Puesto")).toHaveClass(
      "border-brand-gold",
      "bg-ai-missing-bg",
    );
  });

  it("lets the validation error win over the missing treatment", () => {
    render(
      <FormField
        id="field-title"
        label="Puesto"
        missing
        error="Escribe el puesto."
      >
        <Input
          {...controlProps({
            id: "field-title",
            missing: true,
            error: "Escribe el puesto.",
          })}
        />
      </FormField>,
    );

    expect(screen.queryByText("Complétalo tú")).toBeNull();
    expect(screen.getByText("Escribe el puesto.")).toBeInTheDocument();
    const control = screen.getByLabelText("Puesto");
    expect(control).not.toHaveClass("border-brand-gold");
    expect(control).toHaveAttribute("aria-describedby", "field-title-error");
  });
});
