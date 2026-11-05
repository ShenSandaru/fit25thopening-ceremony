import { DEFAULT_SERVER_PORT } from "@fit-expo/shared";
import { z } from "zod";

// Phase 2 and 3 extend this schema with the variables listed in
// docs/API_SPECIFICATION.md section 6 (CORS_ORIGINS, SESSION_SECRET, credentials, ...).
const serverEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  HOST: z.string().trim().min(1).default("0.0.0.0"),
  PORT: z.coerce.number().int().min(1).max(65535).default(DEFAULT_SERVER_PORT),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

export class EnvValidationError extends Error {
  readonly variables: readonly string[];

  constructor(variables: readonly string[]) {
    super(`Invalid or missing environment variables: ${variables.join(", ")}`);
    this.name = "EnvValidationError";
    this.variables = variables;
  }
}

/**
 * Parses and validates server configuration. Error messages name the offending
 * variables but never include their values, so secrets cannot leak into logs.
 */
export function parseServerEnv(source: NodeJS.ProcessEnv): ServerEnv {
  const result = serverEnvSchema.safeParse(source);
  if (!result.success) {
    const variables = [...new Set(result.error.issues.map((issue) => String(issue.path[0])))];
    throw new EnvValidationError(variables);
  }
  return result.data;
}
