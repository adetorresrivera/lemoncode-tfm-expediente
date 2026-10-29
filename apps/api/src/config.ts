import { z } from "zod";

export const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().int().min(1).max(65535).default(3000),
    MONGO_URL: z.string().regex(/^mongodb(\+srv)?:\/\//, "must start with mongodb:// or mongodb+srv://"),
    S3_ENDPOINT: z.url(),
    S3_REGION: z.string().min(1).default("us-east-1"),
    S3_BUCKET: z.string().min(3),
    S3_ACCESS_KEY: z.string().min(1),
    S3_SECRET_KEY: z.string().min(1),
    S3_FORCE_PATH_STYLE: z.stringbool().default(true),
    LLM_PROVIDER: z.enum(["ollama", "openai", "mock"]).default("ollama"),
    LLM_BASE_URL: z.url().optional(),
    LLM_MODEL: z.string().min(1).optional(),
    LLM_API_KEY: z.string().min(1).optional(),
    LLM_TIMEOUT_MS: z.coerce.number().int().positive().default(90_000),
    WEB_DIST_DIR: z.string().min(1).optional(),
  })
  .superRefine((env, ctx) => {
    if (env.LLM_PROVIDER !== "mock") {
      for (const key of ["LLM_BASE_URL", "LLM_MODEL"] as const) {
        if (!env[key]) {
          ctx.addIssue({
            code: "custom",
            path: [key],
            message: `required when LLM_PROVIDER=${env.LLM_PROVIDER}`,
          });
        }
      }
    }
    if (env.LLM_PROVIDER === "openai" && !env.LLM_API_KEY) {
      ctx.addIssue({
        code: "custom",
        path: ["LLM_API_KEY"],
        message: "required when LLM_PROVIDER=openai",
      });
    }
  });

export type Config = z.infer<typeof envSchema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  // Compose passes unset optional variables as empty strings: treat them as absent.
  const cleaned = Object.fromEntries(
    Object.entries(env).filter(([, value]) => value !== undefined && value !== ""),
  );
  const parsed = envSchema.safeParse(cleaned);
  if (!parsed.success) {
    // Names and messages only, never values (they may be secrets).
    const lines = parsed.error.issues.map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`);
    throw new Error(`Invalid environment:\n${lines.join("\n")}`);
  }
  return parsed.data;
}
