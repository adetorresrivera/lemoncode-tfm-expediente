import { applicationSchema } from "@tfm/contracts";
import {
  act,
  render,
  renderHook,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { jsonResponse, mockFetch } from "@/test/mock-fetch";
import { ApplicationDetailContainer } from "./application-detail.container";
import { useApplicationDetail } from "./application-detail.hooks";
import {
  mapApplicationFromApiToDetailVm,
  toSafeHttpUrl,
} from "./application-detail.mapper";

// The scene supplies the real router link; pod tests use a plain anchor.
const renderListLink = (link: { className?: string; children: ReactNode }) => (
  <a href="/applications" className={link.className}>
    {link.children}
  </a>
);

const makeApplication = (overrides: Record<string, unknown> = {}) =>
  applicationSchema.parse({
    id: "a1",
    title: "Frontend Developer",
    company: "Lemoncode",
    status: "guardada",
    statusHistory: [{ status: "guardada", at: "2026-10-12T10:00:00.000Z" }],
    interviews: [],
    createdAt: "2026-10-12T10:00:00.000Z",
    updatedAt: "2026-10-12T10:00:00.000Z",
    ownerId: null,
    ...overrides,
  });

const notFoundResponse = () =>
  jsonResponse(
    { error: { code: "NOT_FOUND", message: "Candidatura no encontrada" } },
    404,
  );

describe("toSafeHttpUrl", () => {
  it.each([
    ["http://example.com/job", "http://example.com/job"],
    ["https://example.com/job?id=1", "https://example.com/job?id=1"],
    ["javascript:alert(1)", null],
    ["data:text/html,<b>x</b>", null],
    ["not a url", null],
    ["", null],
    [null, null],
  ])("maps %s to %s", (input, expected) => {
    expect(toSafeHttpUrl(input)).toBe(expected);
  });
});

describe("application-detail mapper", () => {
  it("maps a bare application to the exact view-model fields", () => {
    expect(mapApplicationFromApiToDetailVm(makeApplication())).toStrictEqual({
      id: "a1",
      title: "Frontend Developer",
      company: "Lemoncode",
      location: null,
      status: "guardada",
      salaryLine: null,
      appliedAtLabel: null,
      sourceUrl: null,
      createdAtLabel: "12 oct. 2026",
      updatedAtLabel: "12 oct. 2026",
      tagGroups: [],
      notes: null,
      offerText: null,
      history: [{ status: "guardada", atLabel: "12 oct. 2026" }],
    });
  });

  it("orders the history newest first", () => {
    const vm = mapApplicationFromApiToDetailVm(
      makeApplication({
        status: "enviada",
        statusHistory: [
          { status: "guardada", at: "2026-10-12T10:00:00.000Z" },
          { status: "enviada", at: "2026-10-14T10:00:00.000Z" },
        ],
      }),
    );
    expect(vm.history).toStrictEqual([
      { status: "enviada", atLabel: "14 oct. 2026" },
      { status: "guardada", atLabel: "12 oct. 2026" },
    ]);
  });

  it("builds the tag groups in order and drops the empty ones", () => {
    const vm = mapApplicationFromApiToDetailVm(
      makeApplication({
        workMode: "hibrido",
        seniority: "senior",
        contractType: "indefinido",
        tags: [
          { label: "Inglés", group: "language" },
          { label: "Docker", group: "nice_to_have" },
          { label: "React", group: "stack" },
        ],
      }),
    );
    expect(vm.tagGroups).toStrictEqual([
      { title: "Stack tecnológico", tags: [{ label: "React", soft: false }] },
      { title: "Se valora", tags: [{ label: "Docker", soft: true }] },
      {
        title: "Modelo de trabajo",
        tags: [{ label: "Híbrido", soft: false }],
      },
      { title: "Seniority", tags: [{ label: "Senior", soft: false }] },
      { title: "Contrato", tags: [{ label: "Indefinido", soft: false }] },
      { title: "Idiomas", tags: [{ label: "Inglés", soft: false }] },
    ]);
  });

  it("builds the salary line with «brutos al año» and drops unsafe links", () => {
    const vm = mapApplicationFromApiToDetailVm(
      makeApplication({
        salaryMin: 52000,
        salaryMax: 65000,
        appliedAt: "2026-10-13T08:00:00.000Z",
        sourceUrl: "https://example.com/job",
      }),
    );
    expect(vm.salaryLine).toBe("52.000 € – 65.000 € brutos al año");
    expect(vm.appliedAtLabel).toBe("13 oct. 2026");
    expect(vm.sourceUrl).toBe("https://example.com/job");
  });
});

describe("useApplicationDetail", () => {
  it("loads and maps the application", async () => {
    mockFetch({ "GET /api/applications/a1": makeApplication() });
    const { result } = renderHook(() => useApplicationDetail("a1"));

    expect(result.current.status).toBe("loading");
    await waitFor(() => expect(result.current.status).toBe("ok"));
    expect(result.current.vm?.title).toBe("Frontend Developer");
  });

  it("yields notFound for a 404 answer", async () => {
    mockFetch({ "GET /api/applications/zzz": notFoundResponse });
    const { result } = renderHook(() => useApplicationDetail("zzz"));

    await waitFor(() => expect(result.current.status).toBe("notFound"));
    expect(result.current.vm).toBeNull();
  });

  it("yields error for a network failure and refetches once on retry", async () => {
    let calls = 0;
    const fetchMock = mockFetch({
      "GET /api/applications/a1": () => {
        calls += 1;
        return calls === 1
          ? Promise.reject(new TypeError("offline"))
          : jsonResponse(makeApplication());
      },
    });
    const { result } = renderHook(() => useApplicationDetail("a1"));

    await waitFor(() => expect(result.current.status).toBe("error"));
    expect(result.current.errorCode).toBe("NETWORK_ERROR");
    expect(fetchMock).toHaveBeenCalledTimes(1);

    act(() => result.current.retry());
    await waitFor(() => expect(result.current.status).toBe("ok"));
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("encodes the id before it reaches the API path", async () => {
    const fetchMock = mockFetch({});
    const { result } = renderHook(() => useApplicationDetail("a/b?c"));

    await waitFor(() => expect(result.current.status).toBe("notFound"));
    expect(String(fetchMock.mock.calls[0]?.[0])).toBe(
      "/api/applications/a%2Fb%3Fc",
    );
  });
});

describe("ApplicationDetailContainer header", () => {
  it("shows the back link, eyebrow, h1, company with location and the status badge", async () => {
    mockFetch({
      "GET /api/applications/a1": makeApplication({
        location: "Madrid",
        status: "enviada",
        statusHistory: [
          { status: "guardada", at: "2026-10-12T10:00:00.000Z" },
          { status: "enviada", at: "2026-10-14T10:00:00.000Z" },
        ],
      }),
    });
    render(
      <ApplicationDetailContainer
        applicationId="a1"
        renderListLink={renderListLink}
      />,
    );

    const heading = await screen.findByRole("heading", { level: 1 });
    expect(heading).toHaveTextContent("Frontend Developer");
    expect(heading).toHaveAttribute("tabindex", "-1");
    expect(heading).toHaveClass("min-w-0", "break-words", "font-serif");
    expect(screen.getByText("Expediente")).toBeInTheDocument();
    expect(screen.getByText(/Lemoncode/)).toHaveTextContent(
      "Lemoncode · Madrid",
    );
    expect(screen.getByText("Enviada")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Mis candidaturas" }),
    ).toHaveAttribute("href", "/applications");
    expect(document.title).toBe("Frontend Developer · Expediente");
  });

  it("shows the not-found link to the list for a 404", async () => {
    mockFetch({ "GET /api/applications/zzz": notFoundResponse });
    render(
      <ApplicationDetailContainer
        applicationId="zzz"
        renderListLink={renderListLink}
      />,
    );

    expect(
      await screen.findByRole("link", { name: "Volver a Mis candidaturas" }),
    ).toHaveAttribute("href", "/applications");
  });

  it("offers «Reintentar» after a failure and refetches", async () => {
    let calls = 0;
    mockFetch({
      "GET /api/applications/a1": () => {
        calls += 1;
        return calls === 1
          ? jsonResponse(
              { error: { code: "INTERNAL_ERROR", message: "x" } },
              500,
            )
          : jsonResponse(makeApplication());
      },
    });
    render(
      <ApplicationDetailContainer
        applicationId="a1"
        renderListLink={renderListLink}
      />,
    );

    await userEvent.click(
      await screen.findByRole("button", { name: "Reintentar" }),
    );
    expect(await screen.findByRole("heading", { level: 1 })).toHaveTextContent(
      "Frontend Developer",
    );
  });
});
