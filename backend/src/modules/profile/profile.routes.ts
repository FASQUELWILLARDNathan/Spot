
import { Router } from "express";
import { prisma } from "../../lib/prisma.js";
import { requireAuth } from "../../middlewares/requireAuth.js";
import { updateProfileSchema } from "./profile.schema.js";

export const profileRouter = Router();

profileRouter.use(requireAuth);

profileRouter.patch("/", async (req, res, next) => {
  try {
    const parsed = updateProfileSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        error: "Données du profil invalides",
        details: parsed.error.flatten(),
      });
      return;
    }

    const userId = res.locals.user.id as string;

    const profile = await prisma.userProfile.upsert({
      where: { userId },
      update: parsed.data,
      create: {
        userId,
        ...parsed.data,
      },
    });

    res.json({ profile });
  } catch (error) {
    next(error);
  }
});
