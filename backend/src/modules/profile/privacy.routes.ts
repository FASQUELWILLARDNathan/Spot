
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { requireAuth } from "../../middlewares/requireAuth.js";

export const privacyRouter = Router();

privacyRouter.use(requireAuth);

const privacySchema = z.object({
  shareBodyStatsWithGroups: z.boolean(),
}).strict();

// Récupérer mes préférences
privacyRouter.get("/", async (_req, res, next) => {
  try {
    const userId = res.locals.user.id as string;

    const profile = await prisma.userProfile.findUnique({
      where: { userId },
      select: { shareBodyStatsWithGroups: true },
    });

    res.json({
      shareBodyStatsWithGroups:
        profile?.shareBodyStatsWithGroups ?? false,
    });
  } catch (error) {
    next(error);
  }
});

// Modifier mes préférences
privacyRouter.patch("/", async (req, res, next) => {
  try {
    const parsed = privacySchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({ error: "Données invalides" });
      return;
    }

    const userId = res.locals.user.id as string;

    const profile = await prisma.userProfile.upsert({
      where: { userId },
      create: {
        userId,
        shareBodyStatsWithGroups:
          parsed.data.shareBodyStatsWithGroups,
      },
      update: {
        shareBodyStatsWithGroups:
          parsed.data.shareBodyStatsWithGroups,
      },
      select: {
        shareBodyStatsWithGroups: true,
      },
    });

    res.json(profile);
  } catch (error) {
    next(error);
  }
});
