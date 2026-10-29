import { describe, expect, it } from "vitest";
import { errorResponseSchema, healthSchema } from "./error.schema.js";

describe("errorResponseSchema", () => {
  it("accepts a body without details", () => {
    const result = errorResponseSchema.safeParse({
      error: { code: "NOT_FOUND", message: "Recurso no encontrado" },
    });
    expect(result.success).toBe(true);
  });

  it("accepts a body with details of any shape", () => {
    const result = errorResponseSchema.safeParse({
      error: {
        code: "VALIDATION_ERROR",
        message: "Datos no válidos",
        details: { fieldErrors: { title: ["Required"] } },
      },
    });
    expect(result.success).toBe(true);
  });

  it("rejects an unknown error code", () => {
    const result = errorResponseSchema.safeParse({
      error: { code: "TEAPOT", message: "No" },
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(["error", "code"]);
    }
  });
});

describe("healthSchema", () => {
  it("accepts the documented shape", () => {
    expect(
      healthSchema.safeParse({
        status: "ok",
        mongo: "ok",
        s3: "error",
        llm: "ok",
      }).success,
    ).toBe(true);
  });

  it('rejects status "error" (the endpoint always answers ok)', () => {
    expect(
      healthSchema.safeParse({
        status: "error",
        mongo: "ok",
        s3: "ok",
        llm: "ok",
      }).success,
    ).toBe(false);
  });

  it('rejects a dependency value other than "ok" or "error"', () => {
    expect(
      healthSchema.safeParse({
        status: "ok",
        mongo: "ok",
        s3: "ok",
        llm: "down",
      }).success,
    ).toBe(false);
  });
});
