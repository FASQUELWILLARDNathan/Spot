
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { requireAuth } from "../../middlewares/requireAuth.js";

export const groupLeaderboardRouter = Router();

groupLeaderboardRouter.use(requireAuth);

const paramsSchema = z.object({
  id: z.uuid(),
});

const querySchema = z.object({
  days: z.coerce.number().int().refine(
    value => value === 7 || value === 30,
    "La période doit être de 7 ou 30 jours",
  ).default(7),
});

groupLeaderboardRouter.get(
  "/:id/leaderboard",
  async (req, res, next) => {
    try {
      const params = paramsSchema.safeParse(req.params);
      const query = querySchema.safeParse(req.query);

      if (!params.success || !query.success) {
        res.status(400).json({
          error: "Paramètres invalides",
        });
        return;
      }

      const userId = res.locals.user.id as string;
      const { id } = params.data;
      const { days } = query.data;

      // Seuls les membres peuvent voir le classement.
      const group = await prisma.group.findFirst({
        where: {
          id,
          members: {
            some: { userId },
          },
        },
        select: {
          id: true,
          name: true,
          members: {
            select: {
              userId: true,
              user: {
                select: {
                  id: true,
                  username: true,
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
        },
      });

      if (!group) {
        res.status(404).json({
          error: "Groupe introuvable",
        });
        return;
      }

      const memberIds = group.members.map(
        member => member.userId,
      );

      const now = new Date();
      const cutoff = new Date(
        now.getTime() - days * 24 * 60 * 60 * 1000,
      );

      // On compte uniquement les séances terminées
      // durant la période sélectionnée.
      const workouts = await prisma.workout.findMany({
        where: {
          userId: { in: memberIds },
          endedAt: {
            gte: cutoff,
            lte: now,
          },
        },
        select: {
          userId: true,
          startedAt: true,
          endedAt: true,
          exercises: {
            select: {
              sets: {
                where: {
                  completed: true,
                },
                select: {
                  weightKg: true,
                  reps: true,
                },
              },
            },
          },
        },
      });

      const leaderboard = group.members.map(member => {
        const ownWorkouts = workouts.filter(
          workout => workout.userId === member.userId,
        );

        const workoutCount = ownWorkouts.length;

        const totalVolumeKg = ownWorkouts.reduce(
          (total, workout) =>
            total +
            workout.exercises.reduce(
              (exerciseTotal, exercise) =>
                exerciseTotal +
                exercise.sets.reduce(
                  (setTotal, set) =>
                    setTotal +
                    Number(set.weightKg ?? 0) *
                      Number(set.reps ?? 0),
                  0,
                ),
              0,
            ),
          0,
        );

        const totalDurationMinutes = ownWorkouts.reduce(
          (total, workout) => {
            if (!workout.endedAt) return total;

            const duration =
              (workout.endedAt.getTime() -
                workout.startedAt.getTime()) / 60000;

            return total + Math.max(0, duration);
          },
          0,
        );

        return {
          user: member.user,
          workoutCount,
          totalVolumeKg: Math.round(totalVolumeKg * 100) / 100,
          totalDurationMinutes: Math.round(totalDurationMinutes),
        };
      });

      leaderboard.sort((a, b) =>
        b.workoutCount - a.workoutCount ||
        b.totalVolumeKg - a.totalVolumeKg ||
        a.user.username.localeCompare(b.user.username),
      );

      res.json({
        group: {
          id: group.id,
          name: group.name,
        },
        days,
        leaderboard,
      });
    } catch (error) {
      next(error);
    }
  },
);
