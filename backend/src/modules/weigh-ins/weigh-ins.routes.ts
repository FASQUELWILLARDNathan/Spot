
import { Router } from "express";
import { prisma } from "../../lib/prisma.js";
import { requireAuth } from "../../middlewares/requireAuth.js";
import {
  createWeighInSchema,
  updateWeighInSchema,
} from "./weigh-ins.schema.js";

function removeUndefined<T extends object>(obj: T) {
  return Object.fromEntries(
    Object.entries(obj).filter(([, value]) => value !== undefined),
  ) as {
    [K in keyof T]: Exclude<T[K], undefined>;
  };
}

export const weighInsRouter = Router();

weighInsRouter.use(requireAuth);

// Ajouter une pesée
weighInsRouter.post("/", async (req, res, next) => {
  try {
    const parsed = createWeighInSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        error: "Données de pesée invalides",
        details: parsed.error.flatten(),
      });
      return;
    }

    const userId = res.locals.user.id as string;
    const { measuredAt, ...rawMeasurements } = parsed.data;
    const measurements = removeUndefined(rawMeasurements);

    const weighIn = await prisma.weighIn.create({
      data: {
        userId,
        ...measurements,
        ...(measuredAt
          ? { measuredAt: new Date(measuredAt) }
          : {}),
      },
    });

    res.status(201).json({ weighIn });
  } catch (error) {
    next(error);
  }
});

// Récupérer ses pesées
weighInsRouter.get("/", async (_req, res, next) => {
  try {
    const userId = res.locals.user.id as string;

    const weighIns = await prisma.weighIn.findMany({
      where: { userId },
      orderBy: [
        { measuredAt: "desc" },
        { createdAt: "desc" },
      ],
      take: 100,
    });

    res.json({ weighIns });
  } catch (error) {
    next(error);
  }
});

// Modifier une pesée
weighInsRouter.patch("/:id", async (req, res, next) => {
  try {
    const parsed = updateWeighInSchema.safeParse(req.body);

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

    const { measuredAt, ...rawMeasurements } = parsed.data;
    const measurements = removeUndefined(rawMeasurements);

    const result = await prisma.weighIn.updateMany({
      where: { id, userId },
      data: {
        ...measurements,
        ...(measuredAt
          ? { measuredAt: new Date(measuredAt) }
          : {}),
      },
    });

    if (result.count === 0) {
      res.status(404).json({ error: "Pesée introuvable" });
      return;
    }

    const weighIn = await prisma.weighIn.findFirst({
      where: { id, userId },
    });

    res.json({ weighIn });
  } catch (error) {
    next(error);
  }
});

// Supprimer une pesée
weighInsRouter.delete("/:id", async (req, res, next) => {
  try {
    const userId = res.locals.user.id as string;
    const id = req.params.id;

    if (typeof id !== "string") {
      res.status(400).json({ error: "Identifiant invalide" });
      return;
    }

    const result = await prisma.weighIn.deleteMany({
      where: { id, userId },
    });

    if (result.count === 0) {
      res.status(404).json({ error: "Pesée introuvable" });
      return;
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});
