
import { z } from "zod";

const workoutSetSchema = z.object({
  weightKg: z.number().finite().min(0).max(2000).nullable(),
  reps: z.number().int().min(0).max(1000).nullable(),
  rpe: z.number().finite().min(1).max(10).nullable().optional(),
  completed: z.boolean(),
}).strict();

const workoutExerciseSchema = z.object({
  exerciseId: z.uuid(),
  sets: z.array(workoutSetSchema).max(30),
}).strict();

export const createWorkoutSchema = z.object({
  name: z.string().trim().min(1).max(100),
  exercises: z.array(workoutExerciseSchema).max(40),
}).strict();

export const updateWorkoutSchema = createWorkoutSchema;

export type CreateWorkoutInput = z.infer<typeof createWorkoutSchema>;
