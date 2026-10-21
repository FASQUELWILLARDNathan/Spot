
import { z } from "zod";

export const checkRecordSchema = z.object({
  exerciseId: z.uuid(),
  weightKg: z.number().finite().positive().max(2000),
  reps: z.number().int().min(1).max(1000),
}).strict();
