
import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../../middlewares/requireAuth.js";
import { getExerciseProgress } from "./progress.service.js";

export const progressRouter = Router();

progressRouter.use(requireAuth);

progressRouter.get("/:exerciseId", async (req, res, next) => {
  try {
    const parsed = z.uuid().safeParse(req.params.exerciseId);

    if (!parsed.success) {
      res.status(400).json({
        error: "Identifiant d'exercice invalide",
      });
      return;
    }

    const userId = res.locals.user.id as string;

    const progress = await getExerciseProgress(
      userId,
      parsed.data,
    );

    if (!progress) {
      res.status(404).json({
        error: "Exercice introuvable",
      });
      return;
    }

    res.json(progress);
  } catch (error) {
    next(error);
  }
});
