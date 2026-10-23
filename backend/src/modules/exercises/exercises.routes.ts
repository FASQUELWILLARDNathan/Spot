
import { Router } from "express";
import { z } from "zod";
import { Equipment, MuscleGroup } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { requireAuth } from "../../middlewares/requireAuth.js";

export const exercisesRouter = Router();

exercisesRouter.use(requireAuth);

const createExerciseSchema = z.object({
  name: z.string().trim().min(2).max(100),
  muscleGroup: z.nativeEnum(MuscleGroup),
  equipment: z.nativeEnum(Equipment),
}).strict();

// Catalogue + exercices personnels
// Liste des exercices disponibles
exercisesRouter.get("/", async (req, res, next) => {
  try {
    const userId = res.locals.user.id as string;
    const search =
      typeof req.query.search === "string"
        ? req.query.search.trim().slice(0, 100)
        : "";

    const exercises = await prisma.exercise.findMany({
      where: {
        OR: [
          { createdById: null },
          { createdById: userId },
        ],
        ...(search
          ? {
              name: {
                contains: search,
                mode: "insensitive" as const,
              },
            }
          : {}),
      },
      orderBy: { name: "asc" },
      take: 100,
      select: {
        id: true,
        name: true,
        muscleGroup: true,
        equipment: true,
        targetMuscle: true,
        imageUrl: true,
        animationUrl: true,
      },
    });

    res.json({ exercises });
  } catch (error) {
    next(error);
  }
});

// Fiche détaillée
exercisesRouter.get("/:id", async (req, res, next) => {
  try {
    const userId = res.locals.user.id as string;
    const id = req.params.id;

    if (typeof id !== "string") {
      res.status(400).json({ error: "Identifiant invalide" });
      return;
    }

    const exercise = await prisma.exercise.findFirst({
      where: {
        id,
        OR: [
          { createdById: null },
          { createdById: userId },
        ],
      },
    });

    if (!exercise) {
      res.status(404).json({ error: "Exercice introuvable" });
      return;
    }

    res.json({ exercise });
  } catch (error) {
    next(error);
  }
});

// Exercice personnalisé
exercisesRouter.post("/", async (req, res, next) => {
  try {
    const parsed = createExerciseSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        error: "Données de l'exercice invalides",
        details: parsed.error.flatten(),
      });
      return;
    }

    const userId = res.locals.user.id as string;

    const existing = await prisma.exercise.findFirst({
      where: {
        name: {
          equals: parsed.data.name,
          mode: "insensitive",
        },
        equipment: parsed.data.equipment,
        OR: [
          { createdById: null },
          { createdById: userId },
        ],
      },
    });

    if (existing) {
      res.status(409).json({
        error: "Cet exercice existe déjà dans ton catalogue",
      });
      return;
    }

    const exercise = await prisma.exercise.create({
      data: {
        ...parsed.data,
        createdById: userId,
      },
    });

    res.status(201).json({ exercise });
  } catch (error) {
    next(error);
  }
});
