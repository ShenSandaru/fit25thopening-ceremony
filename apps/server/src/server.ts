import { createServer } from "node:http";
import { PROJECT_NAME } from "@fit-expo/shared";
import { createApp } from "./app.js";
import { EnvValidationError, parseServerEnv, type ServerEnv } from "./config/env.js";

function loadEnv(): ServerEnv {
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
const httpServer = createServer(createApp());

httpServer.listen(env.PORT, env.HOST, () => {
  console.info(
    `${PROJECT_NAME} server listening on http://${env.HOST}:${env.PORT} (${env.NODE_ENV})`,
  );
});

function shutdown(signal: NodeJS.Signals): void {
  console.info(`Received ${signal}, shutting down`);
  httpServer.close((error) => {
    if (error) {
      console.error("Error while closing HTTP server", error);
      process.exit(1);
    }
    process.exit(0);
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
