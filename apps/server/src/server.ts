import { PROJECT_NAME } from "@fit-expo/shared";
import { EnvValidationError, parseServerEnv } from "./config/env.js";
import { createRuntime } from "./create-runtime.js";

function loadEnv() {
  try {
    return parseServerEnv(process.env);
  } catch (error) {
    if (error instanceof EnvValidationError) {
      console.error(error.message);
      process.exit(1);
    }
    throw error;
  }
}

const env = loadEnv();
const runtime = createRuntime(env);
const listenHost = env.HOST === "0.0.0.0" ? "::" : env.HOST;

runtime.logger.info(`${PROJECT_NAME} starting`, {
  host: listenHost,
  port: env.PORT,
  environment: env.NODE_ENV,
  persistence: "in-memory",
});

runtime.httpServer.listen(env.PORT, listenHost, () => {
  runtime.logger.info(`${PROJECT_NAME} server listening`, {
    url: `http://${listenHost}:${env.PORT}`,
    environment: env.NODE_ENV,
  });
});

function shutdown(signal: NodeJS.Signals): void {
  runtime.logger.info("Shutting down", { signal });
  runtime.httpServer.close((error) => {
    runtime.dispose();
    if (error) {
      runtime.logger.error("Error while closing HTTP server", {
        message: error.message,
      });
      process.exit(1);
    }
    process.exit(0);
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
