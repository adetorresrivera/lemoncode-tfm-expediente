import {
  applicationStatusSchema,
  tagKey,
  workModeSchema,
  type ApplicationStatus,
} from "@tfm/contracts";
import { describe, expect, it } from "vitest";
import { MOCK_OFFER_EXTRACTION } from "../../llm/mock.provider.js";
import { OFFER_FIXTURES } from "../../offers/__fixtures__/fixtures.js";
import {
  buildSeedPlan,
  type SeedApplication,
  type SeedPlan,
} from "./seed.plan.js";

const NOW = new Date("2026-11-09T09:00:00.000Z");
const DAY_MS = 86_400_000;
const PLAN: SeedPlan = buildSeedPlan(NOW);

// Replays a timeline with the domain rules the services apply: the creation status opens the
// history, a status move adds an entry only when it differs, and a round created while the
// application is `enviada` moves it to `en_entrevistas`.
function replay(application: SeedApplication): ApplicationStatus[] {
  const history: ApplicationStatus[] = [application.input.status];
  for (const step of application.timeline) {
    const current = history.at(-1);
    if (step.op === "status" && step.status !== current) {
      history.push(step.status);
    }
    if (step.op === "interview" && current === "enviada") {
      history.push("en_entrevistas");
    }
  }
  return history;
}

function finalStatus(application: SeedApplication): ApplicationStatus {
  const status = replay(application).at(-1);
  if (status === undefined) throw new Error("empty history");
  return status;
}

function interviewsOf(application: SeedApplication) {
  return application.timeline.flatMap((step) =>
    step.op === "interview" ? [step.interview] : [],
  );
}

function countBy<T>(items: readonly T[], key: (item: T) => string) {
  const counts = new Map<string, number>();
  for (const item of items) {
    counts.set(key(item), (counts.get(key(item)) ?? 0) + 1);
  }
  return counts;
}

describe("buildSeedPlan", () => {
  it("describes 12 applications and 3 short-named documents (2 CV, 1 cover letter)", () => {
    expect(PLAN.applications).toHaveLength(12);
    expect(PLAN.documents.map((doc) => doc.asset)).toEqual([
      "cv-frontend.pdf",
      "cv-fullstack.pdf",
      "cover-letter.pdf",
    ]);
    expect(PLAN.documents.map((doc) => doc.input.type).sort()).toEqual([
      "carta",
      "cv",
      "cv",
    ]);
    for (const doc of PLAN.documents) {
      expect(doc.input.name.length).toBeLessThanOrEqual(40);
    }
  });

  it("covers the 7 statuses with enviada and en_entrevistas the most frequent", () => {
    const counts = countBy(PLAN.applications, finalStatus);
    for (const status of applicationStatusSchema.options) {
      expect(counts.get(status) ?? 0).toBeGreaterThan(0);
    }
    expect(counts.get("enviada")).toBe(3);
    expect(counts.get("en_entrevistas")).toBe(3);
    for (const [status, count] of counts) {
      if (status !== "enviada" && status !== "en_entrevistas") {
        expect(count).toBeLessThanOrEqual(2);
      }
    }
  });

  it("has exactly 3 applications with 3 numbered rounds and the rest with 0 or 1", () => {
    const sizes = PLAN.applications.map((app) => interviewsOf(app).length);
    expect(sizes.filter((size) => size === 3)).toHaveLength(3);
    expect(sizes.filter((size) => size === 1).length).toBeGreaterThanOrEqual(1);
    expect(sizes.filter((size) => size === 0).length).toBeGreaterThanOrEqual(1);
    for (const size of sizes) expect(size).toBeLessThanOrEqual(3);

    for (const application of PLAN.applications) {
      const rounds = interviewsOf(application);
      expect(rounds.map((round) => round.round)).toEqual(
        rounds.map((_, index) => index + 1),
      );
    }
    const all = PLAN.applications.flatMap(interviewsOf);
    expect(new Set(all.map((round) => round.type)).size).toBeGreaterThan(2);
    expect(new Set(all.map((round) => round.outcome)).size).toBe(3);
  });

  it("schedules exactly one round in the next 14 days and none later", () => {
    const scheduled = PLAN.applications
      .flatMap(interviewsOf)
      .flatMap((round) =>
        round.scheduledAt === null ? [] : [new Date(round.scheduledAt)],
      );
    const future = scheduled.filter((date) => date.getTime() > NOW.getTime());
    expect(future).toHaveLength(1);
    expect(future[0]!.getTime() - NOW.getTime()).toBeLessThanOrEqual(
      14 * DAY_MS,
    );
  });

  it("keeps every timeline inside the 42 days before now and never goes back in time", () => {
    const oldest = NOW.getTime() - 42 * DAY_MS;
    for (const doc of PLAN.documents) {
      expect(doc.at.getTime()).toBeGreaterThanOrEqual(oldest);
      expect(doc.at.getTime()).toBeLessThanOrEqual(NOW.getTime());
    }
    for (const application of PLAN.applications) {
      expect(application.timeline[0]?.op).toBe("create");
      let previous = oldest;
      for (const step of application.timeline) {
        expect(step.at.getTime()).toBeGreaterThanOrEqual(previous);
        expect(step.at.getTime()).toBeLessThanOrEqual(NOW.getTime());
        previous = step.at.getTime();
      }
    }
  });

  it("puts en_entrevistas after enviada for every application with rounds", () => {
    for (const application of PLAN.applications) {
      if (interviewsOf(application).length === 0) continue;
      const history = replay(application);
      const sent = history.indexOf("enviada");
      expect(sent).toBeGreaterThanOrEqual(0);
      expect(history.indexOf("en_entrevistas")).toBeGreaterThan(sent);
    }
  });

  it("never reuses the mock draft or the pasted fixture offers (D-08)", () => {
    const forbiddenCompanies = new Set<string>([
      MOCK_OFFER_EXTRACTION.company,
      ...OFFER_FIXTURES.flatMap((fixture) =>
        fixture.expected.company === undefined ||
        fixture.expected.company === null
          ? []
          : [fixture.expected.company],
      ),
    ]);
    const forbiddenTitles = new Set<string>([
      MOCK_OFFER_EXTRACTION.title,
      ...OFFER_FIXTURES.flatMap((fixture) =>
        fixture.expected.title === undefined ? [] : [fixture.expected.title],
      ),
    ]);
    expect(forbiddenCompanies.size).toBeGreaterThanOrEqual(4);
    for (const { input } of PLAN.applications) {
      expect(forbiddenCompanies.has(input.company)).toBe(false);
      expect(forbiddenTitles.has(input.title)).toBe(false);
    }
  });

  it("includes every display case of the list (UI-SPEC section 9)", () => {
    const inputs = PLAN.applications.map((app) => app.input);
    expect(inputs.some((input) => input.tags.length > 3)).toBe(true);
    expect(
      inputs.some(
        (input) => input.salaryMin === null && input.salaryMax === null,
      ),
    ).toBe(true);
    expect(inputs.some((input) => input.location === null)).toBe(true);
    expect(
      inputs.some(
        (input) => input.title.length >= 70 && input.title.length <= 80,
      ),
    ).toBe(true);
    for (const mode of workModeSchema.options) {
      expect(inputs.some((input) => input.workMode === mode)).toBe(true);
    }
    for (const input of inputs) {
      const keys = input.tags.map((tag) => tagKey(tag.label));
      expect(new Set(keys).size).toBe(keys.length);
      for (const tag of input.tags) {
        expect(tag.label.length).toBeLessThan(40);
      }
      if (input.offerText !== null) {
        expect(input.offerText.length).toBeLessThan(1500);
      }
      if (input.sourceUrl !== null) {
        expect(input.sourceUrl.startsWith("https://ofertas.example/")).toBe(
          true,
        );
      }
    }
  });

  it("links every document at least once and the cover letter on a 3-round application", () => {
    for (const doc of PLAN.documents) {
      const linked = PLAN.applications.filter(
        (app) => app.cv === doc.key || app.coverLetter === doc.key,
      );
      expect(linked.length).toBeGreaterThanOrEqual(1);
    }
    const withLetter = PLAN.applications.filter(
      (app) => app.coverLetter !== null,
    );
    expect(withLetter.length).toBeGreaterThanOrEqual(1);
    for (const app of withLetter) {
      expect(interviewsOf(app)).toHaveLength(3);
    }
    for (const app of PLAN.applications) {
      if (app.cv !== null) {
        expect(
          PLAN.documents.find((doc) => doc.key === app.cv)?.input.type,
        ).toBe("cv");
      }
    }
  });

  it("is deterministic for the same date", () => {
    expect(buildSeedPlan(new Date(NOW))).toEqual(PLAN);
  });
});
