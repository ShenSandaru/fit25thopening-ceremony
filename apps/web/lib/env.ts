import { z } from "zod";

const publicEnvSchema = z.object({
  NEXT_PUBLIC_SERVER_URL: z.url({ protocol: /^https?$/ }),
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;

export class PublicEnvValidationError extends Error {
  constructor(variables: readonly string[]) {
    super(`Invalid or missing environment variables: ${variables.join(", ")}`);
    this.name = "PublicEnvValidationError";
  }
}

export function parsePublicEnv(source: Record<string, string | undefined>): PublicEnv {
  const result = publicEnvSchema.safeParse(source);
  if (!result.success) {
    const variables = [...new Set(result.error.issues.map((issue) => String(issue.path[0])))];
    throw new PublicEnvValidationError(variables);
  }
  return result.data;
}

export function readPublicEnv(): PublicEnv {
  // Next.js only inlines NEXT_PUBLIC_* variables that are referenced literally.
  return parsePublicEnv({
    NEXT_PUBLIC_SERVER_URL: process.env.NEXT_PUBLIC_SERVER_URL,
  });
}
