
import { Router } from "express";
import { prisma } from "../../lib/prisma.js";
import { requireAuth } from "../../middlewares/requireAuth.js";
import {
  createWorkoutSchema,
  updateWorkoutSchema,
  type CreateWorkoutInput,
} from "./workouts.schema.js";
import { getPersonalRecords } from "../records/records.service.js";
import { detectNewRecords } from "../records/records.detector.js";
import {
  expireWorkouts,
  getWorkoutDeadline,
  isWorkoutExpired,
} from "./workouts-limits.js";
import {
  workoutCreationLimiter,
  workoutModificationLimiter,
  workoutDeletionLimiter,
} from "./workouts-rate-limit.js";

export const workoutsRouter = Router();

workoutsRouter.use(requireAuth);

const workoutInclude = {
  exercises: {
    orderBy: { position: "asc" as const },
    include: {
      exercise: true,
      sets: {
        orderBy: { position: "asc" as const },
      },
    },
  },
};

function buildExercises(exercises: CreateWorkoutInput["exercises"]) {
  return {
    create: exercises.map((item, index) => ({
      exerciseId: item.exerciseId,
      position: index,
      sets: {
        create: item.sets.map((set, setIndex) => ({
          position: setIndex,
          weightKg: set.weightKg,
          reps: set.reps,
          rpe: set.rpe ?? null,
          completed: set.completed,
        })),
      },
    })),
  };
}

async function validateExercises(
  userId: string,
  exercises: CreateWorkoutInput["exercises"],
) {
  const ids = [...new Set(exercises.map((item) => item.exerciseId))];

  if (ids.length === 0) return true;

  const count = await prisma.exercise.count({
    where: {
      id: { in: ids },
      OR: [
        { createdById: null },
        { createdById: userId },
      ],
    },
  });

  return count === ids.length;
}

// Créer une séance
workoutsRouter.post(
  "/",
  workoutCreationLimiter,
  async (req, res, next) => {
  try {
    const parsed = createWorkoutSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        error: "Données de séance invalides",
        details: parsed.error.flatten(),
      });
      return;
    }

    const userId = res.locals.user.id as string;

    await expireWorkouts(userId);

    const activeWorkout = await prisma.workout.findFirst({
    where: {
        userId,
        endedAt: null,
    },
    select: { id: true },
    });

    if (activeWorkout) {
    res.status(409).json({
        error: "Tu as déjà une séance en cours.",
        workoutId: activeWorkout.id,
    });
    return;
    }

    if (!await validateExercises(userId, parsed.data.exercises)) {
      res.status(400).json({
        error: "Un ou plusieurs exercices sont indisponibles",
      });
      return;
    }

    const workout = await prisma.workout.create({
      data: {
        userId,
        name: parsed.data.name,
        exercises: buildExercises(parsed.data.exercises),
      },
      include: workoutInclude,
    });

    res.status(201).json({ workout });
  } catch (error) {
    next(error);
  }
});

// Historique des séances
workoutsRouter.get("/", async (_req, res, next) => {
  try {
    const userId = res.locals.user.id as string;
    await expireWorkouts(userId);

    const workouts = await prisma.workout.findMany({
      where: { userId },
      orderBy: { startedAt: "desc" },
      take: 50,
      include: workoutInclude,
    });

    res.json({ workouts });
  } catch (error) {
    next(error);
  }
});

// Détail d'une séance
workoutsRouter.get("/:id", async (req, res, next) => {
  try {
    const userId = res.locals.user.id as string;
    await expireWorkouts(userId);
    const id = req.params.id;

    if (typeof id !== "string") {
      res.status(400).json({ error: "Identifiant invalide" });
      return;
    }

    const workout = await prisma.workout.findFirst({
      where: { id, userId },
      include: workoutInclude,
    });

    if (!workout) {
      res.status(404).json({ error: "Séance introuvable" });
      return;
    }

    res.json({ workout });
  } catch (error) {
    next(error);
  }
});

// Modifier une séance
workoutsRouter.patch(
  "/:id",
  workoutModificationLimiter,
  async (req, res, next) => {
  try {
    const parsed = updateWorkoutSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        error: "Données invalides",
        details: parsed.error.flatten(),
      });
      return;
    }

    const userId = res.locals.user.id as string;
    const id = req.params.id;

    if (typeof id !== "string") {
      res.status(400).json({ error: "Identifiant invalide" });
      return;
    }

    if (!await validateExercises(userId, parsed.data.exercises)) {
      res.status(400).json({
        error: "Un ou plusieurs exercices sont indisponibles",
      });
      return;
    }

    // État des records avant la sauvegarde.
    const recordsBefore = await getPersonalRecords(userId);

    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.workout.findFirst({
        where: { id, userId },
      });

      if (!existing) return null;

      if (existing.endedAt) return "FINISHED" as const;

      
        if (isWorkoutExpired(existing.startedAt)) {
        await tx.workout.updateMany({
            where: {
            id,
            userId,
            endedAt: null,
            },
            data: {
            endedAt: getWorkoutDeadline(existing.startedAt),
            },
        });

        return "EXPIRED" as const;
        }


      await tx.workoutExercise.deleteMany({
        where: { workoutId: id },
      });

      return tx.workout.update({
        where: { id },
        data: {
          name: parsed.data.name,
          exercises: buildExercises(parsed.data.exercises),
        },
        include: workoutInclude,
      });
    });

    if (result === null) {
      res.status(404).json({ error: "Séance introuvable" });
      return;
    }

    if (result === "EXPIRED") {
        res.status(409).json({
            error: "Cette séance a atteint la durée maximale de 3 heures.",
        });
        return;
    }

    if (result === "FINISHED") {
      res.status(409).json({
        error: "Cette séance est déjà terminée",
      });
      return;
    }

    // État des records après la sauvegarde.
    const recordsAfter = await getPersonalRecords(userId);

    const newRecords = detectNewRecords(
        recordsBefore,
        recordsAfter,
    );

    res.json({
    workout: result,
    newRecords,
    });
  } catch (error) {
    next(error);
  }
});

// Terminer une séance
workoutsRouter.post("/:id/finish", async (req, res, next) => {
  try {
    const userId = res.locals.user.id as string;
    await expireWorkouts(userId);
    const id = req.params.id;

    if (typeof id !== "string") {
      res.status(400).json({ error: "Identifiant invalide" });
      return;
    }

    const result = await prisma.workout.updateMany({
      where: {
        id,
        userId,
        endedAt: null,
      },
      data: { endedAt: new Date() },
    });

    if (result.count === 0) {
      res.status(404).json({
        error: "Séance introuvable ou déjà terminée",
      });
      return;
    }

    const workout = await prisma.workout.findFirst({
      where: { id, userId },
      include: workoutInclude,
    });

    res.json({ workout });
  } catch (error) {
    next(error);
  }
});

// Supprimer une séance
workoutsRouter.delete(
  "/:id",
  workoutDeletionLimiter,
  async (req, res, next) => {
  try {
    const userId = res.locals.user.id as string;
    const id = req.params.id;

    if (typeof id !== "string") {
      res.status(400).json({ error: "Identifiant invalide" });
      return;
    }

    const result = await prisma.workout.deleteMany({
      where: { id, userId },
    });

    if (result.count === 0) {
      res.status(404).json({ error: "Séance introuvable" });
      return;
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});
