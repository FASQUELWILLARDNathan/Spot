
import { z } from "zod";

export const updateProfileSchema = z
  .object({
    heightCm: z.number().int().min(100).max(250),
    startingWeightKg: z.number().min(20).max(400),
    goal: z.enum(["GAIN_MUSCLE", "LOSE_WEIGHT", "MAINTAIN"]),
  })
  .strict();

export const editProfileSchema = z.object({
  bio: z.string().trim().max(160).nullable().optional(),
  heightCm: z.number().int().min(100).max(250).nullable().optional(),
  startingWeightKg: z.number().min(20).max(400).nullable().optional(),
  goal: z.enum(["GAIN_MUSCLE", "LOSE_WEIGHT", "MAINTAIN"])
    .nullable()
    .optional(),
}).strict().refine(
  data => Object.keys(data).length > 0,
  "Au moins un champ est requis",
);

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
