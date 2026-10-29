import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { envSchema, loadConfig } from "./config.js";

const base = {
  MONGO_URL: "mongodb://mongo:27017/tfm",
  S3_ENDPOINT: "http://s3:9000",
  S3_BUCKET: "tfm-assets",
  S3_ACCESS_KEY: "access-key",
  S3_SECRET_KEY: "s3cr3t-value",
  LLM_PROVIDER: "mock",
};

const ollamaEnv = {
  ...base,
  LLM_PROVIDER: "ollama",
  LLM_BASE_URL: "http://ollama:11434",
  LLM_MODEL: "gemma4:e2b",
};

function messageOf(env: NodeJS.ProcessEnv): string {
  try {
    loadConfig(env);
  } catch (err) {
    return err instanceof Error ? err.message : String(err);
  }
  throw new Error("loadConfig did not throw");
}

describe("loadConfig", () => {
  it("applies defaults and coerces types for a valid environment", () => {
    const config = loadConfig(base);
    expect(config.PORT).toBe(3000);
    expect(config.S3_FORCE_PATH_STYLE).toBe(true);
    expect(config.LLM_TIMEOUT_MS).toBe(90_000);
    expect(config.NODE_ENV).toBe("development");
  });

  it("names the missing variables when the environment is empty", () => {
    const message = messageOf({});
    expect(message).toContain("MONGO_URL");
    expect(message).toContain("S3_ENDPOINT");
  });

  it("never echoes values, even when they are invalid or secret", () => {
    const message = messageOf({ ...base, MONGO_URL: "http://x" });
    expect(message).toContain("MONGO_URL");
    expect(message).not.toContain("http://x");
    expect(message).not.toContain("s3cr3t-value");
  });

  it("treats an empty string as absent (compose passes ${VAR:-})", () => {
    const config = loadConfig({ ...ollamaEnv, LLM_API_KEY: "" });
    expect(config.LLM_API_KEY).toBeUndefined();
  });

  it("loads the mock provider without LLM_BASE_URL and LLM_MODEL", () => {
    expect(loadConfig(base).LLM_PROVIDER).toBe("mock");
  });

  it("requires LLM_BASE_URL for the ollama provider", () => {
    const message = messageOf({ ...base, LLM_PROVIDER: "ollama", LLM_MODEL: "gemma4:e2b" });
    expect(message).toContain("LLM_BASE_URL");
  });

  it("requires LLM_API_KEY for the openai provider", () => {
    const message = messageOf({ ...ollamaEnv, LLM_PROVIDER: "openai" });
    expect(message).toContain("LLM_API_KEY");
  });
});

describe(".env.example", () => {
  function readExample(): string {
    try {
      return readFileSync(new URL("../../../.env.example", import.meta.url), "utf8");
    } catch {
      return "";
    }
  }

  it("lists every key of envSchema, commented keys included", () => {
    const keys = new Set(
      readExample()
        .split("\n")
        .map((line) => /^#?\s*([A-Z][A-Z0-9_]*)=/.exec(line)?.[1])
        .filter((key): key is string => key !== undefined),
    );
    const missing = Object.keys(envSchema.shape).filter((key) => !keys.has(key));
    expect(missing).toEqual([]);
  });

  it("leaves the LLM_API_KEY line without a value", () => {
    expect(readExample().split("\n")).toContain("LLM_API_KEY=");
  });
});
