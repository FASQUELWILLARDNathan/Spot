import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { requireAuth } from "../../middlewares/requireAuth.js";
import { expireWorkouts } from "../workouts/workouts-limits.js";
import { workoutCreationLimiter } from "../workouts/workouts-rate-limit.js";
import type { Response } from "express";

export const groupWorkoutsRouter = Router();
groupWorkoutsRouter.use(requireAuth);

const blockSchema = z.object({
  targetSets: z.number().int().min(1).max(20),
  targetRepsMin: z.number().int().min(1).max(100).nullable().optional(),
  targetRepsMax: z.number().int().min(1).max(100).nullable().optional(),
  restSeconds: z.number().int().min(0).max(3600).nullable().optional(),
}).strict();

const exerciseSchema = blockSchema.extend({
  exerciseId: z.string().uuid(),
  setBlocks: z.array(blockSchema).min(1).max(20).optional(),
}).partial({ targetSets: true });

const workoutSchema = z.object({
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().max(300).nullable().optional(),
  exercises: z.array(exerciseSchema).max(40),
}).strict().superRefine((data, ctx) => {
  let totalSets = 0;
  data.exercises.forEach((exercise, exerciseIndex) => {
    const blocks = exercise.setBlocks ?? [exercise];
    if (!exercise.setBlocks && exercise.targetSets == null) {
      ctx.addIssue({
        code: "custom",
        path: ["exercises", exerciseIndex, "targetSets"],
        message: "Indique targetSets ou setBlocks.",
      });
    }
    blocks.forEach((block, blockIndex) => {
      totalSets += block.targetSets ?? 0;
      if (
        block.targetRepsMin != null &&
        block.targetRepsMax != null &&
        block.targetRepsMin > block.targetRepsMax
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["exercises", exerciseIndex, ...(exercise.setBlocks ? ["setBlocks", blockIndex] : []), "targetRepsMax"],
          message: "Le maximum doit être supérieur ou égal au minimum.",
        });
      }
    });
  });
  if (totalSets > 400) {
    ctx.addIssue({
      code: "custom",
      path: ["exercises"],
      message: "Un programme ne peut pas dépasser 400 séries.",
    });
  }
});

type WorkoutInput = z.infer<typeof workoutSchema>;
type ExerciseInput = WorkoutInput["exercises"][number];

function normalizedBlocks(exercise: ExerciseInput) {
  return exercise.setBlocks ?? [{
    targetSets: exercise.targetSets!,
    targetRepsMin: exercise.targetRepsMin ?? null,
    targetRepsMax: exercise.targetRepsMax ?? null,
    restSeconds: exercise.restSeconds ?? null,
  }];
}

function exerciseCreateData(exercise: ExerciseInput, position: number) {
  const blocks = normalizedBlocks(exercise);
  const first = blocks[0]!;
  return {
    position,
    // Champs historiques conservés pour les anciens clients.
    targetSets: blocks.reduce((sum, block) => sum + block.targetSets, 0),
    targetRepsMin: first.targetRepsMin ?? null,
    targetRepsMax: first.targetRepsMax ?? null,
    restSeconds: first.restSeconds ?? null,
    exercise: { connect: { id: exercise.exerciseId } },
    setBlocks: {
      create: blocks.map((block, blockPosition) => ({
        position: blockPosition,
        targetSets: block.targetSets,
        targetRepsMin: block.targetRepsMin ?? null,
        targetRepsMax: block.targetRepsMax ?? null,
        restSeconds: block.restSeconds ?? null,
      })),
    },
  };
}

const groupWorkoutInclude = {
  exercises: {
    orderBy: { position: "asc" as const },
    include: {
      exercise: true,
      setBlocks: { orderBy: { position: "asc" as const } },
    },
  },
};

async function isMember(groupId: string, userId: string) {
  return prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId } },
    select: { id: true },
  });
}

function currentUserId(res: Response): string {
  return res.locals.user.id as string;
}

async function canUseExercises(exercises: ExerciseInput[], userId: string) {
  const exerciseIds = [...new Set(exercises.map((e) => e.exerciseId))];
  if (exerciseIds.length === 0) return true;
  const count = await prisma.exercise.count({
    where: {
      id: { in: exerciseIds },
      OR: [
        { createdById: null },
        { createdById: userId },
        {
          groupWorkoutExercises: {
            some: {
              groupWorkout: {
                group: { members: { some: { userId } } },
              },
            },
          },
        },
      ],
    },
  });
  return count === exerciseIds.length;
}

// GET /api/groups/:groupId/workouts
// Réponse : tableau brut (compatibilité avec le frontend existant).
groupWorkoutsRouter.get("/:groupId/workouts", async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const userId = currentUserId(res);
    if (!(await isMember(groupId, userId))) {
      return res.status(404).json({ error: "Groupe introuvable." });
    }
    const workouts = await prisma.groupWorkout.findMany({
      where: { groupId },
      include: groupWorkoutInclude,
      orderBy: { createdAt: "asc" },
    });
    return res.json(workouts);
  } catch (error) {
    next(error);
  }
});

// POST /api/groups/:groupId/workouts
groupWorkoutsRouter.post("/:groupId/workouts", async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const userId = currentUserId(res);
    if (!(await isMember(groupId, userId))) {
      return res.status(404).json({ error: "Groupe introuvable." });
    }
    const parsed = workoutSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Données invalides.", details: parsed.error.flatten() });
    }
    const { name, description, exercises } = parsed.data;
    if (!(await canUseExercises(exercises, userId))) {
      return res.status(400).json({ error: "Un ou plusieurs exercices sont introuvables ou inaccessibles." });
    }
    const workout = await prisma.groupWorkout.create({
      data: {
        groupId,
        name,
        description: description ?? null,
        exercises: { create: exercises.map(exerciseCreateData) },
      },
      include: groupWorkoutInclude,
    });
    return res.status(201).json(workout);
  } catch (error) {
    next(error);
  }
});

// GET /api/groups/:groupId/workouts/:workoutId
groupWorkoutsRouter.get("/:groupId/workouts/:workoutId", async (req, res, next) => {
  try {
    const { groupId, workoutId } = req.params;
    const userId = currentUserId(res);
    if (!(await isMember(groupId, userId))) {
      return res.status(404).json({ error: "Groupe introuvable." });
    }
    const workout = await prisma.groupWorkout.findFirst({
      where: { id: workoutId, groupId },
      include: groupWorkoutInclude,
    });
    if (!workout) return res.status(404).json({ error: "Séance introuvable." });
    return res.json(workout);
  } catch (error) {
    next(error);
  }
});

// PUT /api/groups/:groupId/workouts/:workoutId
// Remplace les exercices et leurs blocs en une transaction.
groupWorkoutsRouter.put("/:groupId/workouts/:workoutId", async (req, res, next) => {
  try {
    const { groupId, workoutId } = req.params;
    const userId = currentUserId(res);
    if (!(await isMember(groupId, userId))) {
      return res.status(404).json({ error: "Groupe introuvable." });
    }
    const parsed = workoutSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Données invalides.", details: parsed.error.flatten() });
    }
    const existing = await prisma.groupWorkout.findFirst({
      where: { id: workoutId, groupId }, select: { id: true },
    });
    if (!existing) return res.status(404).json({ error: "Séance introuvable." });
    const { name, description, exercises } = parsed.data;
    if (!(await canUseExercises(exercises, userId))) {
      return res.status(400).json({ error: "Un ou plusieurs exercices sont introuvables ou inaccessibles." });
    }
    const workout = await prisma.$transaction(async (tx) => {
      // Les blocs sont supprimés par CASCADE avec leurs exercices parents.
      await tx.groupWorkoutExercise.deleteMany({ where: { groupWorkoutId: workoutId } });
      return tx.groupWorkout.update({
        where: { id: workoutId },
        data: {
          name,
          description: description ?? null,
          exercises: { create: exercises.map(exerciseCreateData) },
        },
        include: groupWorkoutInclude,
      });
    });
    return res.json(workout);
  } catch (error) {
    next(error);
  }
});

// POST /api/groups/:groupId/workouts/:workoutId/start
// Chaque membre reçoit sa propre séance, sans charges ni répétitions préremplies.
groupWorkoutsRouter.post(
  "/:groupId/workouts/:workoutId/start",
  workoutCreationLimiter,
  async (req, res, next) => {
    try {
      const groupId = req.params.groupId;
      const workoutId = req.params.workoutId;
      const userId = currentUserId(res);

      if (typeof groupId !== "string" || typeof workoutId !== "string") {
        return res.status(400).json({
          error: "Identifiant invalide.",
        });
      }

      if (!(await isMember(groupId, userId))) {
        return res.status(404).json({
          error: "Groupe introuvable.",
        });
      }

      const template = await prisma.groupWorkout.findFirst({
        where: {
          id: workoutId,
          groupId,
        },
        include: {
          exercises: {
            orderBy: { position: "asc" },
            include: {
              setBlocks: {
                orderBy: { position: "asc" },
              },
            },
          },
        },
      });

      if (!template) {
        return res.status(404).json({
          error: "Programme introuvable.",
        });
      }

      if (template.exercises.length === 0) {
        return res.status(400).json({
          error: "Ce programme ne contient aucun exercice.",
        });
      }

      await expireWorkouts(userId);

      const activeWorkout = await prisma.workout.findFirst({
        where: {
          userId,
          endedAt: null,
        },
        select: { id: true },
      });

      if (activeWorkout) {
        return res.status(409).json({
          error: "Tu as déjà une séance en cours.",
          workoutId: activeWorkout.id,
        });
      }

      const workout = await prisma.workout.create({
        data: {
          userId,
          name: template.name,
          groupWorkoutId: template.id,
          exercises: {
            create: template.exercises.map((exercise, position) => {
              const blocks = exercise.setBlocks.length > 0
                ? exercise.setBlocks
                : [{
                    position: 0,
                    targetSets: exercise.targetSets,
                    targetRepsMin: exercise.targetRepsMin,
                    targetRepsMax: exercise.targetRepsMax,
                    restSeconds: exercise.restSeconds,
                    }];

                const sets = blocks.flatMap((block, blockPosition) =>
                Array.from({ length: block.targetSets }, () => ({
                    targetRepsMin: block.targetRepsMin,
                    targetRepsMax: block.targetRepsMax,
                    restSeconds: block.restSeconds,
                    targetBlockPosition: blockPosition,
                })),
                );

              return {
                exerciseId: exercise.exerciseId,
                position,
                sets: {
                    create: sets.map((set, setPosition) => ({
                        position: setPosition,
                        weightKg: null,
                        reps: null,
                        rpe: null,
                        completed: false,
                        ...set,
                    })),
                },
              };
            }),
          },
        },
        include: {
          exercises: {
            orderBy: { position: "asc" },
            include: {
              exercise: true,
              sets: {
                orderBy: { position: "asc" },
              },
            },
          },
        },
      });

      return res.status(201).json({ workout });
    } catch (error) {
      next(error);
    }
  },
);

// DELETE /api/groups/:groupId/workouts/:workoutId
groupWorkoutsRouter.delete("/:groupId/workouts/:workoutId", async (req, res, next) => {
  try {
    const { groupId, workoutId } = req.params;
    const userId = currentUserId(res);
    if (!(await isMember(groupId, userId))) {
      return res.status(404).json({ error: "Groupe introuvable." });
    }
    const deleted = await prisma.groupWorkout.deleteMany({
      where: { id: workoutId, groupId },
    });
    if (deleted.count === 0) return res.status(404).json({ error: "Séance introuvable." });
    return res.status(204).send();
  } catch (error) {
    next(error);
  }
});
