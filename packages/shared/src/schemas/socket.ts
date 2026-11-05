import { z } from "zod";
import { emptyObjectSchema } from "./common.js";

export const guestActivatePayloadSchema = emptyObjectSchema;

export const clockSyncPayloadSchema = z.strictObject({
  clientSentAt: z.number().finite(),
});
