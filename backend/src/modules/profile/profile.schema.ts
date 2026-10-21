
import { z } from "zod";

export const updateProfileSchema = z
  .object({
    heightCm: z.number().int().min(100).max(250),
    startingWeightKg: z.number().min(20).max(400),
    goal: z.enum(["GAIN_MUSCLE", "LOSE_WEIGHT", "MAINTAIN"]),
  })
  .strict();

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
