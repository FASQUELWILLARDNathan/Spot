
import { prisma } from "../../lib/prisma.js";

export async function getExerciseProgress(
  userId: string,
  exerciseId: string,
) {
  // Exercice du catalogue ou exercice personnel.
  const exercise = await prisma.exercise.findFirst({
    where: {
      id: exerciseId,
      OR: [
        { createdById: null },
        { createdById: userId },
      ],
    },
    select: {
      id: true,
      name: true,
      muscleGroup: true,
      equipment: true,
    },
  });

  if (!exercise) return null;

  const workouts = await prisma.workout.findMany({
    where: {
      userId,
      exercises: {
        some: { exerciseId },
      },
    },
    orderBy: [
      { startedAt: "asc" },
      { id: "asc" },
    ],
    select: {
      id: true,
      name: true,
      startedAt: true,
      endedAt: true,
      exercises: {
        where: { exerciseId },
        select: {
          sets: {
            where: {
              completed: true,
              weightKg: { gt: 0 },
              reps: { gt: 0 },
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

  const history = workouts.flatMap((workout) => {
    const sets = workout.exercises.flatMap(
      (item) => item.sets,
    );

    if (sets.length === 0) return [];

    let maxWeightKg = 0;
    let totalVolumeKg = 0;
    let estimatedOneRepMaxKg = 0;
    let totalReps = 0;
    let hasEstimatedOneRepMax = false;

    for (const set of sets) {
      const weight = set.weightKg?.toNumber() ?? 0;
      const reps = set.reps ?? 0;

      maxWeightKg = Math.max(maxWeightKg, weight);
      totalVolumeKg += weight * reps;
      totalReps += reps;

      // Formule d'Epley, limitée à 12 répétitions.
      if (reps <= 12) {
        const estimated = weight * (1 + reps / 30);

        estimatedOneRepMaxKg = Math.max(
          estimatedOneRepMaxKg,
          estimated,
        );

        hasEstimatedOneRepMax = true;
      }
    }

    const round = (value: number) =>
      Math.round(value * 100) / 100;

    return [{
      workoutId: workout.id,
      workoutName: workout.name,
      date: workout.startedAt.toISOString(),
      endedAt: workout.endedAt?.toISOString() ?? null,
      totalSets: sets.length,
      totalReps,
      maxWeightKg: round(maxWeightKg),
      totalVolumeKg: round(totalVolumeKg),
      estimatedOneRepMaxKg: hasEstimatedOneRepMax
        ? round(estimatedOneRepMaxKg)
        : null,
    }];
  });

  return {
    exercise,
    history,
    summary: {
      sessions: history.length,
      totalSets: history.reduce(
        (sum, item) => sum + item.totalSets,
        0,
      ),
      personalBestWeightKg: Math.max(
        0,
        ...history.map((item) => item.maxWeightKg),
      ),
      personalBestEstimatedOneRepMaxKg: Math.max(
        0,
        ...history.map(
          (item) => item.estimatedOneRepMaxKg ?? 0,
        ),
      ),
    },
  };
}
