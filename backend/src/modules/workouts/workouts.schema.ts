
import { z } from "zod";

const MAX_EXERCISES = 30;
const MAX_SETS_PER_EXERCISE = 20;
const MAX_TOTAL_SETS = 300;

const workoutSetSchema = z.object({
  id: z.uuid().optional(),
  weightKg: z.number()
    .finite()
    .min(0)
    .max(1000)
    .nullable(),

  reps: z.number()
    .int()
    .min(0)
    .max(200)
    .nullable(),

  rpe: z.number()
    .finite()
    .min(1)
    .max(10)
    .nullable()
    .optional(),

  completed: z.boolean(),
}).strict();

const workoutExerciseSchema = z.object({
  exerciseId: z.uuid(),

  sets: z.array(workoutSetSchema)
    .min(1)
    .max(MAX_SETS_PER_EXERCISE),
}).strict();

export const createWorkoutSchema = z.object({
  name: z.string()
    .trim()
    .min(1)
    .max(80),

  exercises: z.array(workoutExerciseSchema)
    .min(1)
    .max(MAX_EXERCISES),
}).strict().superRefine((data, ctx) => {
  // Limite globale du nombre de séries.
  const totalSets = data.exercises.reduce(
    (total, exercise) => total + exercise.sets.length,
    0,
  );

  if (totalSets > MAX_TOTAL_SETS) {
    ctx.addIssue({
      code: "custom",
      path: ["exercises"],
      message: `Une séance ne peut pas dépasser ${MAX_TOTAL_SETS} séries.`,
    });
  }

  // Éviter les doublons du même exercice.
  const exerciseIds = new Set<string>();

  for (const [index, exercise] of data.exercises.entries()) {
    if (exerciseIds.has(exercise.exerciseId)) {
      ctx.addIssue({
        code: "custom",
        path: ["exercises", index, "exerciseId"],
        message: "Cet exercice est déjà présent dans la séance.",
      });
    }

    exerciseIds.add(exercise.exerciseId);
  }
});

export const updateWorkoutSchema = createWorkoutSchema;

export type CreateWorkoutInput = z.infer<typeof createWorkoutSchema>;
