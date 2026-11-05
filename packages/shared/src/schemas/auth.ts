import { z } from "zod";
import { emptyObjectSchema, guestRoleSchema } from "./common.js";

const accessCodeSchema = z.string().trim().min(6).max(128);
const passwordSchema = z.string().min(1).max(128);

export const guestAuthBodySchema = z.strictObject({
  role: guestRoleSchema,
  accessCode: accessCodeSchema,
});

export const displayAuthBodySchema = z.strictObject({
  accessCode: accessCodeSchema,
});

export const adminAuthBodySchema = z.strictObject({
  password: passwordSchema,
});

export const logoutBodySchema = emptyObjectSchema;

export const assignGuestSessionBodySchema = z.strictObject({
  role: guestRoleSchema,
});

export const releaseGuestSessionBodySchema = emptyObjectSchema;
