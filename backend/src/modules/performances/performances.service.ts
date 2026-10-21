
import { prisma } from '../../lib/prisma.js'

export async function getPreviousPerformance(
  userId: string,
  exerciseId: string,
  currentWorkoutId: string,
) {
  const currentWorkout = await prisma.workout.findFirst({
    where: {
      id: currentWorkoutId,
      userId,
    },
    select: {
      id: true,
      startedAt: true,
      createdAt: true,
    },
  })

  if (!currentWorkout) return null

  const previousWorkout = await prisma.workout.findFirst({
    where: {
      userId,
      endedAt: { not: null },
      id: { not: currentWorkout.id },
      OR: [
        { startedAt: { lt: currentWorkout.startedAt } },
        {
          startedAt: currentWorkout.startedAt,
          createdAt: { lt: currentWorkout.createdAt },
        },
      ],
      exercises: {
        some: {
          exerciseId,
          sets: {
            some: {
              completed: true,
              weightKg: { not: null },
              reps: { gt: 0 },
            },
          },
        },
      },
    },
    orderBy: [
      { startedAt: 'desc' },
      { createdAt: 'desc' },
    ],
    select: {
      id: true,
      name: true,
      startedAt: true,
      exercises: {
        where: { exerciseId },
        orderBy: { position: 'asc' },
        select: {
          sets: {
            where: {
              completed: true,
              weightKg: { not: null },
              reps: { gt: 0 },
            },
            orderBy: { position: 'asc' },
            select: {
              weightKg: true,
              reps: true,
              rpe: true,
            },
          },
        },
      },
    },
  })

  if (!previousWorkout) {
    return {
      previousWorkout: null,
    }
  }

  const sets = previousWorkout.exercises.flatMap(
    exercise => exercise.sets.map(set => ({
      weightKg: set.weightKg?.toNumber() ?? null,
      reps: set.reps,
      rpe: set.rpe?.toNumber() ?? null,
    })),
  )

  return {
    previousWorkout: {
      workoutId: previousWorkout.id,
      workoutName: previousWorkout.name,
      date: previousWorkout.startedAt.toISOString(),
      sets,
    },
  }
}
