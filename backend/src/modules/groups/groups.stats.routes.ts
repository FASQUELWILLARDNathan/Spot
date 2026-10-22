
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { requireAuth } from "../../middlewares/requireAuth.js";

export const groupStatsRouter = Router();
groupStatsRouter.use(requireAuth);

const MAX_MEMBERS = 20;
const HISTORY_DAYS = 365;

function round(value: number, digits = 2) {
  return Number(value.toFixed(digits));
}

function getCutoff(days: number) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}


async function getAuthorizedGroup(groupId: string, userId: string) {
  return prisma.group.findFirst({
    where: {
      id: groupId,
      members: {
        some: { userId },
      },
    },
    select: {
      id: true,
      name: true,
      members: {
        take: MAX_MEMBERS,
        orderBy: {
          joinedAt: "asc",
        },
        select: {
          userId: true,
          user: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
              profile: {
                select: {
                  shareBodyStatsWithGroups: true,
                },
              },
            },
          },
        },
      },
    },
  });
}


groupStatsRouter.get("/:id/stats", async (req, res, next) => {
  try {
    const parsedId = z.uuid().safeParse(req.params.id);

    if (!parsedId.success) {
      res.status(400).json({ error: "Identifiant invalide" });
      return;
    }

    const userId = res.locals.user.id as string;
    const group = await getAuthorizedGroup(parsedId.data, userId);

    if (!group) {
      res.status(404).json({ error: "Groupe introuvable" });
      return;
    }

    const memberIds = group.members.map((member) => member.userId);

    const allowedBodyUserIds = group.members
    .filter(
        member =>
        member.user.profile?.shareBodyStatsWithGroups === true,
    )
    .map(member => member.userId);
    const cutoff = getCutoff(HISTORY_DAYS);

    const [weighIns, workouts] = await Promise.all([
      prisma.weighIn.findMany({
        where: {
          userId: { in: allowedBodyUserIds },
          measuredAt: { gte: cutoff },
        },
        select: {
          userId: true,
          weightKg: true,
          bodyFatPct: true,
          muscleMassKg: true,
          bodyWaterPct: true,
          measuredAt: true,
        },
        orderBy: { measuredAt: "asc" },
        take: 10000,
      }),

      prisma.workout.findMany({
        where: {
            userId: { in: memberIds },
            endedAt: { not: null, gte: cutoff },
        },
        select: {
          id: true,
          userId: true,
          startedAt: true,
          endedAt: true,
          exercises: {
            select: {
              sets: {
                where: { completed: true },
                select: {
                  weightKg: true,
                  reps: true,
                },
              },
            },
          },
        },
        orderBy: { endedAt: "desc" },
        take: 5000,
      }),
    ]);

    const members = group.members.map(({ user }) => {
        const { profile, ...publicUser } = user;

        const ownWeighIns = weighIns.filter(
            (item) => item.userId === user.id,
        );

      const ownWorkouts = workouts.filter(
        (item) => item.userId === user.id,
      );

      const firstWeight = ownWeighIns[0];
      const lastWeight = ownWeighIns.at(-1);

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

          return (
            total +
            Math.max(
              0,
              (workout.endedAt.getTime() -
                workout.startedAt.getTime()) /
                60000,
            )
          );
        },
        0,
      );

      return {
        user: publicUser,
        body: {
          latestWeightKg: lastWeight
            ? Number(lastWeight.weightKg)
            : null,
          weightChangeKg:
            firstWeight && lastWeight
              ? round(
                  Number(lastWeight.weightKg) -
                    Number(firstWeight.weightKg),
                )
              : null,
          latestBodyFatPct:
            lastWeight?.bodyFatPct == null
                ? null
                : Number(lastWeight.bodyFatPct),
          latestMuscleMassKg:
            lastWeight?.muscleMassKg == null
                ? null
                : Number(lastWeight.muscleMassKg),
          latestBodyWaterPct:
            lastWeight?.bodyWaterPct == null
                ? null
                : Number(lastWeight.bodyWaterPct),
          history: ownWeighIns.map((item) => ({
            date: item.measuredAt.toISOString(),
            weightKg: Number(item.weightKg),
            bodyFatPct:
              item.bodyFatPct === null
                ? null
                : Number(item.bodyFatPct),
            muscleMassKg:
              item.muscleMassKg === null
                ? null
                : Number(item.muscleMassKg),
          })),
        },
        training: {
          workoutCount: ownWorkouts.length,
          totalVolumeKg: round(totalVolumeKg),
          totalDurationMinutes: Math.round(totalDurationMinutes),
        },
      };
    });

    res.json({
      group: {
        id: group.id,
        name: group.name,
      },
      periodDays: HISTORY_DAYS,
      members,
    });
  } catch (error) {
    next(error);
  }
});

groupStatsRouter.get("/:id/records", async (req, res, next) => {
  try {
    const parsedId = z.uuid().safeParse(req.params.id);

    if (!parsedId.success) {
      res.status(400).json({ error: "Identifiant invalide" });
      return;
    }

    const userId = res.locals.user.id as string;
    const group = await getAuthorizedGroup(parsedId.data, userId);

    if (!group) {
      res.status(404).json({ error: "Groupe introuvable" });
      return;
    }

    const memberIds = group.members.map((member) => member.userId);

    const sets = await prisma.workoutSet.findMany({
      where: {
        completed: true,
        weightKg: { gt: 0 },
        reps: { gt: 0 },
        workoutExercise: {
          workout: {
            userId: { in: memberIds },
            endedAt: { not: null },
          },
        },
      },
      select: {
        weightKg: true,
        reps: true,
        workoutExercise: {
          select: {
            exercise: {
              select: {
                id: true,
                name: true,
              },
            },
            workout: {
              select: {
                userId: true,
                endedAt: true,
              },
            },
          },
        },
      },
      take: 50000,
    });

    type RecordEntry = {
      userId: string;
      username: string;
      exerciseId: string;
      exerciseName: string;
      weightKg: number;
      reps: number;
      estimatedOneRepMaxKg: number;
      performedAt: string | null;
    };

    const usernames = new Map(
      group.members.map((member) => [
        member.user.id,
        member.user.username,
      ]),
    );

    const bestByExerciseAndUser = new Map<string, RecordEntry>();

    for (const set of sets) {
      const exercise = set.workoutExercise.exercise;
      const workout = set.workoutExercise.workout;
      const weightKg = Number(set.weightKg);
      const reps = Number(set.reps);

      // Formule d'Epley, limitée à 10 répétitions
      const estimatedOneRepMaxKg =
        reps === 1
          ? weightKg
          : round(weightKg * (1 + Math.min(reps, 10) / 30));

      const key = `${exercise.id}:${workout.userId}`;

      const entry: RecordEntry = {
        userId: workout.userId,
        username: usernames.get(workout.userId) ?? "Utilisateur",
        exerciseId: exercise.id,
        exerciseName: exercise.name,
        weightKg,
        reps,
        estimatedOneRepMaxKg,
        performedAt: workout.endedAt?.toISOString() ?? null,
      };

      const previous = bestByExerciseAndUser.get(key);

      if (
        !previous ||
        entry.estimatedOneRepMaxKg >
          previous.estimatedOneRepMaxKg
      ) {
        bestByExerciseAndUser.set(key, entry);
      }
    }

    const exerciseMap = new Map<
      string,
      {
        exerciseId: string;
        exerciseName: string;
        leaderboard: RecordEntry[];
      }
    >();

    for (const record of bestByExerciseAndUser.values()) {
      let exercise = exerciseMap.get(record.exerciseId);

      if (!exercise) {
        exercise = {
          exerciseId: record.exerciseId,
          exerciseName: record.exerciseName,
          leaderboard: [],
        };

        exerciseMap.set(record.exerciseId, exercise);
      }

      exercise.leaderboard.push(record);
    }

    const exercises = [...exerciseMap.values()]
      .map((exercise) => ({
        ...exercise,
        leaderboard: exercise.leaderboard.sort(
          (a, b) =>
            b.estimatedOneRepMaxKg -
            a.estimatedOneRepMaxKg,
        ),
      }))
      .sort((a, b) =>
        a.exerciseName.localeCompare(b.exerciseName, "fr"),
      );

    res.json({ exercises });
  } catch (error) {
    next(error);
  }
});
