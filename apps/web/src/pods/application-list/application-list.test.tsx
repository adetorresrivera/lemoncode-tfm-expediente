import { applicationSchema } from "@tfm/contracts";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ApplicationListComponent } from "./application-list.component";
import {
  mapApplicationFromApiToVm,
  mapApplicationListFromApiToVm,
} from "./application-list.mapper";
import type { ApplicationListItem } from "./application-list.vm";

const EMPTY_TEXT =
  "Aún no has guardado ninguna oferta. Empieza añadiendo la primera.";

const application = applicationSchema.parse({
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

describe("ApplicationListComponent", () => {
  it("shows the empty state and no list when there are no applications", () => {
    render(<ApplicationListComponent applications={[]} />);

    expect(screen.getByText(EMPTY_TEXT)).toBeInTheDocument();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });

  it("shows one item with title and company and hides the empty state", () => {
    const items: ApplicationListItem[] = [
      {
        id: "a1",
        title: "Frontend Developer",
        company: "Lemoncode",
        status: "guardada",
      },
    ];
    render(<ApplicationListComponent applications={items} />);

    const item = screen.getByRole("listitem");
    expect(item).toHaveTextContent("Frontend Developer");
    expect(item).toHaveTextContent("Lemoncode");
    expect(screen.queryByText(EMPTY_TEXT)).not.toBeInTheDocument();
  });
});
