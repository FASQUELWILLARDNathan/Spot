
import { Router } from "express";
import { prisma } from "../../lib/prisma.js";
import { requireAuth } from "../../middlewares/requireAuth.js";
import { updateProfileSchema } from "./profile.schema.js";
import { editProfileSchema } from "./profile.schema.js";
import z from "zod";

export const profileRouter = Router();

profileRouter.use(requireAuth);


profileRouter.get("/", async (_req, res, next) => {
  try {
    const userId = res.locals.user.id as string;

    const [user, workoutCount, friendCount, completedSets] =
      await Promise.all([
        prisma.user.findUnique({
          where: { id: userId },
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            createdAt: true,
            profile: {
              select: {
                bio: true,
                heightCm: true,
                startingWeightKg: true,
                goal: true,
                shareBodyStatsWithGroups: true,
              },
            },
          },
        }),
        prisma.workout.count({
          where: {
            userId,
            endedAt: { not: null },
          },
        }),
        prisma.friendship.count({
          where: {
            status: "ACCEPTED",
            OR: [
              { senderId: userId },
              { receiverId: userId },
            ],
          },
        }),
        prisma.workoutSet.findMany({
          where: {
            completed: true,
            workoutExercise: {
              workout: {
                userId,
                endedAt: { not: null },
              },
            },
            weightKg: { gt: 0 },
            reps: { gt: 0 },
          },
          select: {
            weightKg: true,
            reps: true,
            workoutExercise: {
              select: {
                exerciseId: true,
                exercise: {
                  select: { name: true },
                },
              },
            },
          },
        }),
      ]);

    if (!user) {
      res.status(404).json({ error: "Utilisateur introuvable." });
      return;
    }

    const records = new Map<string, {
      exerciseId: string;
      exerciseName: string;
      estimatedOneRepMaxKg: number;
    }>();

    for (const set of completedSets) {
      const exercise = set.workoutExercise;
      const weight = Number(set.weightKg);
      const reps = set.reps ?? 0;

      if (reps < 1 || reps > 10) continue;

      const estimated = weight * (1 + reps / 30);
      const previous = records.get(exercise.exerciseId);

      if (!previous || estimated > previous.estimatedOneRepMaxKg) {
        records.set(exercise.exerciseId, {
          exerciseId: exercise.exerciseId,
          exerciseName: exercise.exercise.name,
          estimatedOneRepMaxKg: Math.round(estimated * 10) / 10,
        });
      }
    }

    res.json({
      user: {
        ...user,
        profile: user.profile
          ? {
              ...user.profile,
              startingWeightKg: user.profile.startingWeightKg == null
                ? null
                : Number(user.profile.startingWeightKg),
            }
          : null,
      },
      stats: {
        workoutCount,
        friendCount,
        recordCount: records.size,
      },
      records: [...records.values()]
        .sort((a, b) => b.estimatedOneRepMaxKg - a.estimatedOneRepMaxKg)
        .slice(0, 5),
    });
  } catch (error) {
    next(error);
  }
});

profileRouter.get("/", async (_req, res, next) => {
  try {
    const userId = res.locals.user.id as string;

    const [user, profile, workoutCount, friendCount] =
      await Promise.all([
        prisma.user.findUnique({
          where: { id: userId },
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
          },
        }),

        prisma.userProfile.findUnique({
          where: { userId },
        }),

        prisma.workout.count({
          where: {
            userId,
            endedAt: { not: null },
          },
        }),

        prisma.friendship.count({
          where: {
            status: "ACCEPTED",
            OR: [
              { requesterId: userId },
              { receiverId: userId },
            ],
          },
        }),
      ]);

    if (!user) {
      res.status(404).json({
        error: "Utilisateur introuvable.",
      });
      return;
    }

    res.json({
      user,
      profile,
      stats: {
        workoutCount,
        friendCount,
      },
    });
  } catch (error) {
    next(error);
  }
});


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

profileRouter.patch("/edit", async (req, res, next) => {
  try {
    const parsed = editProfileSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        error: "Données du profil invalides.",
        details: parsed.error.flatten(),
      });
      return;
    }

    const userId = res.locals.user.id as string;

    
    const { bio, heightCm, startingWeightKg, goal } = parsed.data;

    const profileData = {
      ...(bio !== undefined && { bio }),
      ...(heightCm !== undefined && { heightCm }),
      ...(startingWeightKg !== undefined && { startingWeightKg }),
      ...(goal !== undefined && { goal }),
    };

    const profile = await prisma.userProfile.upsert({
      where: { userId },
      update: profileData,
      create: {
        userId,
        ...profileData,
      },
    });


    res.json({ profile });
  } catch (error) {
    next(error);
  }
});

profileRouter.patch("/privacy", async (req, res, next) => {
  try {
    const parsed = z.object({
      shareBodyStatsWithGroups: z.boolean(),
    }).strict().safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        error: "Préférences de confidentialité invalides.",
      });
      return;
    }

    const userId = res.locals.user.id as string;

    const profile = await prisma.userProfile.upsert({
      where: { userId },
      update: parsed.data,
      create: { userId, ...parsed.data },
    });

    res.json({
      shareBodyStatsWithGroups: profile.shareBodyStatsWithGroups,
    });
  } catch (error) {
    next(error);
  }
});