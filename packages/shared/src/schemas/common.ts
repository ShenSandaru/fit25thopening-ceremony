import { z } from "zod";
import { GUEST_ROLES, ROLES } from "../constants/roles.js";

export const guestRoleSchema = z.enum(GUEST_ROLES);
export const roleSchema = z.enum(ROLES);

export const emptyObjectSchema = z.strictObject({});
