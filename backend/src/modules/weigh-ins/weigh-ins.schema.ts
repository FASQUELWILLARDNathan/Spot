
import { z } from "zod";

const optionalMeasurement = (max: number) =>
  z.number().finite().min(0).max(max).nullable().optional();

export const createWeighInSchema = z
  .object({
    weightKg: z.number().finite().min(20).max(400),
    bodyFatPct: optionalMeasurement(100),
    muscleMassKg: optionalMeasurement(400),
    bodyWaterPct: optionalMeasurement(100),
    measuredAt: z.iso.datetime({ offset: true }).optional(),
  })
  .strict();

export const updateWeighInSchema = createWeighInSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "Au moins un champ doit être fourni",
  });

export type CreateWeighInInput = z.infer<
  typeof createWeighInSchema
>;