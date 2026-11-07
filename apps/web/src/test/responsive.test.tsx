import {
  createMemoryHistory,
  RouterContextProvider,
  RouterProvider,
} from "@tanstack/react-router";
import {
  applicationSchema,
  documentListItemSchema,
  documentSchema,
  tagSummarySchema,
} from "@tfm/contracts";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RootError } from "@/common/components/route-error";
import { createAppRouter } from "@/core/router/router";
import { mockFetch } from "./mock-fetch";

// D-12: jsdom has no layout, so these are class guards on the UI-SPEC §5 risk points (360 px) and
// on fixed widths at 768 and 1280 px. Real `scrollWidth` / `clientWidth` are measured in the human
// pass of 06-17. S1-S11 are the screens of the UI-SPEC «Verification Protocol».

const VIEWPORTS = [360, 768, 1280];

// Content width of the shell at each viewport (layouts/app-layout.tsx): `px-4` below `lg`
// (768 - 32 = 736); at 1280 the `lg:w-64` sidebar and `lg:px-8` leave 1280 - 256 - 64 = 960. At
// 360 the narrowest container is a dialog, 328 px wide (`w-[calc(100%-2rem)]`).
const CONTENT_WIDTH: Record<number, number> = { 360: 328, 768: 736, 1280: 960 };

const BREAKPOINTS: Record<string, number> = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  "2xl": 1536,
};

const fill = (length: number, seed: string): string =>
  seed.repeat(Math.ceil(length / seed.length)).slice(0, length - 1) + "x";

const LONG_TITLE = fill(120, "Ingeniero de software frontend senior ");
const LONG_DOC_NAME = fill(120, "Curriculum para ofertas de plataforma ");
const LONG_VERSION = fill(40, "v1");
const LONG_TAG = fill(39, "herramientas-de-diseno-");
const LONG_URL = fill(200, "https://ofertas.example/puesto/");
const OFFER_TEXT = `Buscamos a alguien con ganas.\nMás información: ${LONG_URL}\nGracias.`;

// ---- helpers -------------------------------------------------------------------------------

// Splits a Tailwind class on its top-level colons (arbitrary values such as `has-[a:focus]` keep
// theirs).
const splitVariants = (
  token: string,
): { variants: string[]; utility: string } => {
  const parts: string[] = [];
  let depth = 0;
  let current = "";
  for (const char of token) {
    if (char === "[") depth += 1;
    if (char === "]") depth -= 1;
    if (char === ":" && depth === 0) {
      parts.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  return { variants: parts, utility: current };
};

const tokensOf = (element: Element): string[] =>
  (element.getAttribute("class") ?? "").split(/\s+/).filter(Boolean);

// Unprefixed tokens only (what is active at every width).
const baseTokens = (element: Element): Set<string> =>
  new Set(tokensOf(element).filter((token) => !token.includes(":")));

// A class is active at a width when every variant in front of it is a breakpoint at or below it.
const isActiveAt = (variants: string[], width: number): boolean =>
  variants.every((variant) => {
    const min = BREAKPOINTS[variant];
    return min !== undefined && min <= width;
  });

// Fixed width in px of a `w-` / `min-w-` utility, or null (`w-[420px]`, `min-w-96`).
const fixedWidthPx = (utility: string): number | null => {
  const arbitrary = /^(?:min-w|w)-\[(\d+(?:\.\d+)?)px\]$/.exec(utility);
  if (arbitrary?.[1] !== undefined) return Number(arbitrary[1]);
  const scale = /^(?:min-w|w)-(\d+(?:\.5)?)$/.exec(utility);
  if (scale?.[1] !== undefined) return Number(scale[1]) * 4;
  return null;
};

const label = (element: Element): string =>
  `<${element.tagName.toLowerCase()} class="${element.getAttribute("class") ?? ""}"> ${(element.textContent ?? "").trim().slice(0, 40)}`;

// No fixed width or min-width active at `width` exceeds the content width there.
const widthViolations = (root: ParentNode, width: number): string[] => {
  const limit = CONTENT_WIDTH[width] ?? width;
  const found: string[] = [];
  for (const element of root.querySelectorAll("*")) {
    for (const token of tokensOf(element)) {
      const { variants, utility } = splitVariants(token);
      if (!isActiveAt(variants, width)) continue;
      const px = fixedWidthPx(utility);
      if (px !== null && px > limit) {
        found.push(
          `${width}px: ${token} (${px}px > ${limit}px) on ${label(element)}`,
        );
      }
    }
  }
  return found;
};

const visibleName = (element: Element): string => {
  const clone = element.cloneNode(true);
  if (!(clone instanceof Element)) return "";
  for (const hidden of clone.querySelectorAll(
    ".sr-only, [aria-hidden='true']",
  )) {
    hidden.remove();
  }
  return (clone.textContent ?? "").trim();
};

// Direct text of an element (its own text nodes), as `getByText` sees it.
const ownText = (element: Element): string =>
  Array.from(element.childNodes)
    .filter((node) => node.nodeType === Node.TEXT_NODE)
    .map((node) => node.textContent ?? "")
    .join("");

const isRowOrGridContainer = (element: Element): boolean => {
  const tokens = baseTokens(element);
  if (tokens.has("grid")) return true;
  return (
    (tokens.has("flex") || tokens.has("inline-flex")) && !tokens.has("flex-col")
  );
};

const isBoundary = (element: Element): boolean =>
  element.tagName === "MAIN" ||
  element.tagName === "BODY" ||
  element.getAttribute("role") === "dialog" ||
  element.getAttribute("role") === "alertdialog";

// UI-SPEC §5 «Known risk points» at 360 px.
const riskViolations = (root: ParentNode): string[] => {
  const found: string[] = [];

  // 1. A button (or button-styled link) with a label over 24 characters is `w-full` below `sm`.
  //    Tag chips are exempt: they shrink (`max-w-full`) and truncate with a title.
  for (const element of root.querySelectorAll(
    "button, a[data-slot='button']",
  )) {
    const tokens = baseTokens(element);
    if (tokens.has("max-w-full")) continue;
    if (visibleName(element).length > 24 && !tokens.has("w-full")) {
      found.push(
        `button label over 24 characters without w-full: ${label(element)}`,
      );
    }
  }

  // 2. Native selects are `w-full min-w-0`.
  for (const element of root.querySelectorAll("select")) {
    const tokens = baseTokens(element);
    if (!tokens.has("w-full") || !tokens.has("min-w-0")) {
      found.push(`select without w-full min-w-0: ${label(element)}`);
    }
  }

  // 3. Long titles and names wrap (`break-words`) or truncate with a title, and every row-flex or
  //    grid item between the text and its dialog or page can shrink (`min-w-0`).
  for (const element of root.querySelectorAll("*")) {
    if (element.tagName === "OPTION") continue;
    const text = ownText(element);
    if (
      ![LONG_TITLE, LONG_DOC_NAME, LONG_VERSION].some((long) =>
        text.includes(long),
      )
    ) {
      continue;
    }
    let wraps = false;
    for (
      let node: Element | null = element;
      node !== null && !isBoundary(node);
      node = node.parentElement
    ) {
      const tokens = baseTokens(node);
      if (
        tokens.has("break-words") ||
        (tokens.has("truncate") && node.hasAttribute("title"))
      ) {
        wraps = true;
      }
      const parent = node.parentElement;
      if (
        parent !== null &&
        isRowOrGridContainer(parent) &&
        !tokens.has("min-w-0")
      ) {
        found.push(
          `flex or grid item without min-w-0 around long text: ${label(node)}`,
        );
      }
    }
    if (!wraps)
      found.push(
        `long text that neither wraps nor truncates: ${label(element)}`,
      );
  }

  // 4. Tag chips are `max-w-full`.
  for (const element of root.querySelectorAll(`[title='${LONG_TAG}']`)) {
    const chip = element.parentElement;
    if (chip !== null && !baseTokens(chip).has("max-w-full")) {
      found.push(`tag chip without max-w-full: ${label(chip)}`);
    }
  }

  // 5. The offer text keeps its line breaks and breaks an unbroken URL.
  for (const element of root.querySelectorAll("p")) {
    if (!ownText(element).includes(LONG_URL)) continue;
    const tokens = baseTokens(element);
    if (!tokens.has("whitespace-pre-wrap") || !tokens.has("break-words")) {
      found.push(
        `offer text without whitespace-pre-wrap break-words: ${label(element)}`,
      );
    }
  }

  return found;
};

// Runs the 360 px risk points and the width rule at every viewport on what is on screen.
const expectResponsive = () => {
  const problems: string[] = [];
  for (const width of VIEWPORTS) {
    problems.push(...widthViolations(document.body, width));
    if (width === 360) problems.push(...riskViolations(document.body));
  }
  expect(problems).toEqual([]);
};

// ---- fixtures ------------------------------------------------------------------------------

const makeApplication = (overrides: Record<string, unknown> = {}) =>
  applicationSchema.parse({
    id: "a1",
    title: LONG_TITLE,
    company: "Lemoncode",
    location: "Madrid",
    workMode: "remoto",
    seniority: "senior",
    salaryMin: 50000,
    salaryMax: 60000,
    currency: "EUR",
    status: "en_entrevistas",
    statusHistory: [
      { status: "guardada", at: "2026-10-12T10:00:00.000Z" },
      { status: "enviada", at: "2026-10-14T10:00:00.000Z" },
      { status: "en_entrevistas", at: "2026-10-20T10:00:00.000Z" },
    ],
    tags: [
      { label: LONG_TAG, group: "stack" },
      { label: "React", group: "stack" },
      { label: "TypeScript", group: "stack" },
      { label: "Testing", group: "nice_to_have" },
      { label: "Inglés", group: "language" },
    ],
    interviews: [1, 2, 3].map((round) => ({
      id: `i${round}`,
      round,
      type: "tecnica",
      mode: "online",
      scheduledAt: "2026-10-2" + round + "T10:00:00.000Z",
      outcome: round < 3 ? "superada" : "pendiente",
      notes: null,
    })),
    notes: "Notas",
    sourceUrl: "https://ofertas.example/frontend",
    offerText: OFFER_TEXT,
    cvDocumentId: "d1",
    createdAt: "2026-10-12T10:00:00.000Z",
    updatedAt: "2026-10-20T10:00:00.000Z",
    ownerId: null,
    ...overrides,
  });

const longDocument = documentSchema.parse({
  id: "d1",
  type: "cv",
  name: LONG_DOC_NAME,
  version: LONG_VERSION,
  fileName: "cv.pdf",
  s3Key: "documents/d1.pdf",
  mimeType: "application/pdf",
  size: 235520,
  createdAt: "2026-10-12T10:00:00.000Z",
});

const longListItem = documentListItemSchema.parse({
  ...longDocument,
  usedBy: 1,
});

const tagSummaries = [
  tagSummarySchema.parse({ label: LONG_TAG, group: "stack", count: 1 }),
  tagSummarySchema.parse({ label: "React", group: "stack", count: 3 }),
];

const routes = {
  "GET /api/applications": [makeApplication()],
  "GET /api/applications/a1": makeApplication(),
  "GET /api/tags": tagSummaries,
  "GET /api/documents": [longListItem],
  "GET /api/documents/d1": longDocument,
};

const renderAt = (path: string) => {
  mockFetch(routes);
  const router = createAppRouter(
    createMemoryHistory({ initialEntries: [path] }),
  );
  render(<RouterProvider router={router} />);
  return router;
};

afterEach(() => {
  vi.restoreAllMocks();
});

// ---- helper self-test ----------------------------------------------------------------------

describe("responsive helpers", () => {
  it("rejects a md:w-[800px] element at 768 px and accepts it at 360 px", () => {
    const { container } = render(<div className="md:w-[800px]">fixture</div>);

    expect(widthViolations(container, 768)).toHaveLength(1);
    // 800 px still fits the 960 px of content at 1280, so the same element is fine there.
    expect(widthViolations(container, 1280)).toEqual([]);
    expect(widthViolations(container, 360)).toEqual([]);
  });

  it("flags each 360 px risk point on a fixture that breaks it", () => {
    const { container } = render(
      <div>
        <button type="button" className="h-11">
          Una etiqueta de botón larga de verdad
        </button>
        <select aria-label="Documento" className="w-full" />
        <h2 className="flex">
          <a href="/x">{LONG_TITLE}</a>
        </h2>
        <span>
          <span className="truncate" title={LONG_TAG}>
            {LONG_TAG}
          </span>
        </span>
        <p>{LONG_URL}</p>
      </div>,
    );

    const problems = riskViolations(container);

    expect(problems.some((p) => p.startsWith("button label"))).toBe(true);
    expect(problems.some((p) => p.startsWith("select without"))).toBe(true);
    expect(problems.some((p) => p.startsWith("long text"))).toBe(true);
    expect(problems.some((p) => p.startsWith("tag chip"))).toBe(true);
    expect(problems.some((p) => p.startsWith("offer text"))).toBe(true);
  });

  it("rejects an unprefixed w-[400px] at 360 px but keeps lg:w-64 under every limit", () => {
    const { container } = render(
      <div>
        <div className="w-[400px]">wide</div>
        <div className="lg:w-64">sidebar</div>
      </div>,
    );

    expect(widthViolations(container, 360)).toHaveLength(1);
    expect(widthViolations(container, 1280)).toEqual([]);
  });
});

// ---- S1-S11 --------------------------------------------------------------------------------

describe("responsive guards per screen", () => {
  it("S1 list with long content", async () => {
    renderAt("/applications");

    expect((await screen.findAllByText(LONG_TITLE)).length).toBeGreaterThan(0);
    expect(await screen.findAllByTitle(LONG_TAG)).not.toHaveLength(0);
    expectResponsive();
  });

  it("S2 list with the mobile filter open", async () => {
    const user = userEvent.setup();
    renderAt("/applications");

    await screen.findAllByText(LONG_TITLE);
    await user.click(screen.getByRole("button", { name: /^Filtros y orden/ }));
    expect(
      screen.getByRole("button", { name: /^Filtros y orden/ }),
    ).toHaveAttribute("aria-expanded", "true");
    expectResponsive();
  });

  it("S3 detail with 3 rounds, long title, document and offer text", async () => {
    const user = userEvent.setup();
    renderAt("/applications/a1");

    await screen.findByRole("heading", { level: 1, name: LONG_TITLE });
    await screen.findByRole("link", { name: /^Descargar / });
    await user.click(
      screen.getByRole("button", { name: "Mostrar texto original" }),
    );
    expect(await screen.findByText(new RegExp(LONG_URL))).toBeInTheDocument();
    expect(screen.getAllByText(/^Ronda \d/).length).toBeGreaterThanOrEqual(3);
    expectResponsive();
  });

  it("S4 «Añadir ronda» dialog and the delete dialog", async () => {
    const user = userEvent.setup();
    renderAt("/applications/a1");

    await screen.findByRole("heading", { level: 1, name: LONG_TITLE });
    await user.click(screen.getByRole("button", { name: "Añadir ronda" }));
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expectResponsive();

    await user.keyboard("{Escape}");
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );

    await user.click(screen.getByRole("button", { name: "Eliminar" }));
    expect(await screen.findByRole("alertdialog")).toBeInTheDocument();
    expectResponsive();
  });

  it("S5 create form with «Pegar oferta» open and long document names in the pickers", async () => {
    const user = userEvent.setup();
    renderAt("/applications/new");

    await screen.findByRole("heading", {
      level: 1,
      name: "Añadir candidatura",
    });
    if (screen.queryByLabelText("Texto de la oferta") === null) {
      await user.click(screen.getByRole("button", { name: /Pegar oferta/ }));
    }
    await screen.findByLabelText("Texto de la oferta");
    await waitFor(() =>
      expect(document.body).toHaveTextContent(LONG_DOC_NAME.slice(0, 30)),
    );
    expect(document.querySelectorAll("select").length).toBeGreaterThan(0);
    expectResponsive();
  });

  it("S6 edit form with a long tag and long document names", async () => {
    renderAt("/applications/a1/edit");

    await waitFor(() =>
      expect(
        screen.getByLabelText(/^Puesto/, { selector: "input" }),
      ).toHaveValue(LONG_TITLE),
    );
    expect((await screen.findAllByTitle(LONG_TAG)).length).toBeGreaterThan(0);
    expectResponsive();
  });

  it("S7 /documents with a 120-character name and a 40-character version", async () => {
    renderAt("/documents");

    expect((await screen.findAllByText(LONG_DOC_NAME)).length).toBeGreaterThan(
      0,
    );
    expect(screen.getAllByText(LONG_VERSION).length).toBeGreaterThan(0);
    expectResponsive();

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /^Eliminar / }));
    expect(await screen.findByRole("alertdialog")).toBeInTheDocument();
    expectResponsive();
  });

  it("S8 upload dialog", async () => {
    const user = userEvent.setup();
    renderAt("/documents");

    await screen.findAllByText(LONG_DOC_NAME);
    await user.click(screen.getByRole("button", { name: "Subir documento" }));
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expectResponsive();
  });

  it("S9 unknown route", async () => {
    renderAt("/nope");

    await screen.findByRole("heading", {
      level: 1,
      name: "No encontramos esta página",
    });
    expectResponsive();
  });

  it("S10 route error card (standalone root variant, same layout as the in-shell one)", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const router = createAppRouter(
      createMemoryHistory({ initialEntries: ["/applications"] }),
    );
    render(
      <RouterContextProvider router={router}>
        <RootError error={new Error("detalle interno")} reset={() => {}} />
      </RouterContextProvider>,
    );

    expect(
      screen.getByRole("heading", { level: 1, name: "Algo ha fallado" }),
    ).toBeInTheDocument();
    expectResponsive();
  });

  it("S11 open menu Sheet", async () => {
    const user = userEvent.setup();
    renderAt("/applications");

    await screen.findAllByText(LONG_TITLE);
    await user.click(screen.getByRole("button", { name: "Abrir menú" }));
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expectResponsive();
  });
});

// ---- guards for the findings of the human pass (06-17 Task 2) -------------------------------
// Each one fails without its fix. The UAT rows read «S# · viewport · theme · what happened»; every
// finding repeats at all viewports and in both themes, so the guard is on the class that causes it.

// UI-SPEC §Spacing: every interactive control has a 44 px hit area (`size-11`, `h-11` or `min-h-11`).
const HIT_AREA = ["size-11", "h-11", "min-h-11"];
const hasHitArea = (element: Element): boolean =>
  HIT_AREA.some((token) => baseTokens(element).has(token));

// UI-SPEC §8: under `prefers-reduced-motion: reduce` the fades stop. A bare
// `data-[state=open]:animate-in` has a higher specificity than `motion-reduce:animate-none`, so the
// animation classes may only exist inside the `motion-safe` media query.
const unguardedAnimations = (element: Element): string[] =>
  tokensOf(element).filter((token) => {
    const { variants, utility } = splitVariants(token);
    return (
      (utility === "animate-in" || utility === "animate-out") &&
      !variants.includes("motion-safe")
    );
  });

const expectMotionSafe = (content: Element, overlaySlot: string) => {
  expect(unguardedAnimations(content)).toEqual([]);
  const overlay = document.querySelector(`[data-slot='${overlaySlot}']`);
  expect(overlay).not.toBeNull();
  if (overlay !== null) expect(unguardedAnimations(overlay)).toEqual([]);
};

describe("findings of the human pass", () => {
  it("S4 · all viewports · both themes · the round dialog and its overlay do not animate under reduced motion", async () => {
    const user = userEvent.setup();
    renderAt("/applications/a1");

    await screen.findByRole("heading", { level: 1, name: LONG_TITLE });
    await user.click(screen.getByRole("button", { name: "Añadir ronda" }));

    expectMotionSafe(await screen.findByRole("dialog"), "dialog-overlay");
  });

  it("S4 · all viewports · both themes · the delete dialog and its overlay do not animate under reduced motion", async () => {
    const user = userEvent.setup();
    renderAt("/applications/a1");

    await screen.findByRole("heading", { level: 1, name: LONG_TITLE });
    await user.click(screen.getByRole("button", { name: "Eliminar" }));

    expectMotionSafe(
      await screen.findByRole("alertdialog"),
      "alert-dialog-overlay",
    );
  });

  it("S11 · all viewports · both themes · the Sheet and its overlay do not animate under reduced motion", async () => {
    const user = userEvent.setup();
    renderAt("/applications");

    await screen.findAllByText(LONG_TITLE);
    await user.click(screen.getByRole("button", { name: "Abrir menú" }));

    expectMotionSafe(await screen.findByRole("dialog"), "sheet-overlay");
  });

  it("S11 · all viewports · both themes · the Sheet close button «Cerrar» has a 44 px hit area", async () => {
    const user = userEvent.setup();
    renderAt("/applications");

    await screen.findAllByText(LONG_TITLE);
    await user.click(screen.getByRole("button", { name: "Abrir menú" }));
    const close = within(await screen.findByRole("dialog")).getByRole(
      "button",
      { name: "Cerrar" },
    );

    expect(hasHitArea(close)).toBe(true);
  });

  it("S6 · all viewports · both themes · the «Quitar {etiqueta}» tag buttons have a 44 px hit area", async () => {
    renderAt("/applications/a1/edit");

    await waitFor(() =>
      expect(
        screen.getByLabelText(/^Puesto/, { selector: "input" }),
      ).toHaveValue(LONG_TITLE),
    );
    const removes = await screen.findAllByRole("button", { name: /^Quitar / });

    expect(removes.length).toBeGreaterThan(0);
    expect(removes.filter((button) => !hasHitArea(button))).toEqual([]);
  });

  it("S1 · all viewports · both themes · the status filter buttons have a 44 px hit area", async () => {
    const user = userEvent.setup();
    renderAt("/applications");

    await screen.findAllByText(LONG_TITLE);
    await user.click(screen.getByRole("button", { name: /^Filtros y orden/ }));
    const buttons = screen
      .getAllByRole("group", { name: "Estado" })
      .flatMap((group) => Array.from(group.querySelectorAll("button")));

    expect(buttons.length).toBeGreaterThan(0);
    expect(buttons.filter((button) => !hasHitArea(button))).toEqual([]);
  });

  it("S2 · all viewports · both themes · the stack filter chips have a 44 px hit area", async () => {
    const user = userEvent.setup();
    renderAt("/applications");

    await screen.findAllByText(LONG_TITLE);
    await user.click(screen.getByRole("button", { name: /^Filtros y orden/ }));
    const chips = await screen.findAllByRole("button", { name: "React" });

    expect(chips.length).toBeGreaterThan(0);
    expect(chips.filter((chip) => !hasHitArea(chip))).toEqual([]);
  });

  it("S3 · all viewports · both themes · the «Ver oferta original» link has a 44 px hit area", async () => {
    renderAt("/applications/a1");

    await screen.findByRole("heading", { level: 1, name: LONG_TITLE });
    const link = await screen.findByRole("link", {
      name: /^Ver oferta original/,
    });

    expect(hasHitArea(link)).toBe(true);
  });
});
