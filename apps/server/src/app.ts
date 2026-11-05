import express, { type Express } from "express";

export function createApp(): Express {
  const app = express();
  app.disable("x-powered-by");
  app.use(express.json({ limit: "10kb" }));
  return app;
}
