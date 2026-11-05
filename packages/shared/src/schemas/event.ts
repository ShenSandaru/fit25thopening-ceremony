import { z } from "zod";
import { MANUAL_START_CONFIRMATION } from "../constants/defaults.js";
import { emptyObjectSchema } from "./common.js";

export const prepareEventBodySchema = emptyObjectSchema;
export const startEventBodySchema = emptyObjectSchema;
export const resetEventBodySchema = emptyObjectSchema;

export const abortEventBodySchema = z.strictObject({
  reason: z.string().trim().max(200).optional(),
});

export const manualStartBodySchema = z.strictObject({
  confirmation: z.literal(MANUAL_START_CONFIRMATION),
  password: z.string().min(1).max(128),
});

export const activityQuerySchema = z.strictObject({
  limit: z.coerce.number().int().min(1).max(200).default(100),
});
