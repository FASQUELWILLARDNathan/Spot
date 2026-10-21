
import { prisma } from '../../lib/prisma.js'

interface Performance {
  weightKg: number
  reps: number
  performedAt: Date
  workoutId: string
  workoutName: string
}

interface PersonalRecord {
  exerciseId: string
  exerciseName: string
  muscleGroup: string
  equipment: string

  totalSets: number

  maxWeight: Performance
  maxVolume: Performance & {
    volumeKg: number
  }

  estimatedOneRepMax:
    | (Performance & { estimatedKg: number })
    | null
}

function round(value: number): number {
  return Math.round(value * 100) / 100
}

export async function getPersonalRecords(
  userId: string,
): Promise<PersonalRecord[]> {
  const workouts = await prisma.workout.findMany({
    where: { userId },
    select: {
      id: true,
      name: true,
      startedAt: true,
      exercises: {
        select: {
          exerciseId: true,
          exercise: {
            select: {
              name: true,
              muscleGroup: true,
              equipment: true,
            },
          },
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
  })

  const records = new Map<string, PersonalRecord>()

  for (const workout of workouts) {
    for (const workoutExercise of workout.exercises) {
      const {
        exerciseId,
        exercise,
        sets,
      } = workoutExercise

      for (const set of sets) {
        if (set.weightKg === null || set.reps === null) {
          continue
        }

        const weightKg = set.weightKg.toNumber()
        const reps = set.reps

        if (
          !Number.isFinite(weightKg) ||
          weightKg <= 0 ||
          !Number.isInteger(reps) ||
          reps <= 0
        ) {
          continue
        }

        const performance: Performance = {
          weightKg,
          reps,
          performedAt: workout.startedAt,
          workoutId: workout.id,
          workoutName: workout.name,
        }

        const volumeKg = round(weightKg * reps)

        const estimatedKg =
          reps <= 12
            ? round(weightKg * (1 + reps / 30))
            : null

        let record = records.get(exerciseId)

        if (!record) {
          record = {
            exerciseId,
            exerciseName: exercise.name,
            muscleGroup: exercise.muscleGroup,
            equipment: exercise.equipment,
            totalSets: 0,
            maxWeight: performance,
            maxVolume: {
              ...performance,
              volumeKg,
            },
            estimatedOneRepMax:
              estimatedKg === null
                ? null
                : {
                    ...performance,
                    estimatedKg,
                  },
          }

          records.set(exerciseId, record)
        }

        record.totalSets += 1

        if (weightKg > record.maxWeight.weightKg) {
          record.maxWeight = performance
        }

        if (volumeKg > record.maxVolume.volumeKg) {
          record.maxVolume = {
            ...performance,
            volumeKg,
          }
        }

        if (
          estimatedKg !== null &&
          (
            record.estimatedOneRepMax === null ||
            estimatedKg >
              record.estimatedOneRepMax.estimatedKg
          )
        ) {
          record.estimatedOneRepMax = {
            ...performance,
            estimatedKg,
          }
        }
      }
    }
  }

  return [...records.values()].sort((a, b) =>
    a.exerciseName.localeCompare(b.exerciseName, 'fr'),
  )
}

export async function checkPersonalRecord(
  userId: string,
  exerciseId: string,
  weightKg: number,
  reps: number,
) {
  const records = await getPersonalRecords(userId);

  const previous = records.find(
    (record) => record.exerciseId === exerciseId,
  );

  const estimatedKg =
    reps <= 12
      ? Math.round(weightKg * (1 + reps / 30) * 100) / 100
      : null;

  const volumeKg = Math.round(weightKg * reps * 100) / 100;

  return {
    isNewRecord:
      !previous ||
      weightKg > previous.maxWeight.weightKg ||
      volumeKg > previous.maxVolume.volumeKg ||
      (
        estimatedKg !== null &&
        (
          previous.estimatedOneRepMax === null ||
          estimatedKg > previous.estimatedOneRepMax.estimatedKg
        )
      ),

    records: {
      maxWeight:
        !previous ||
        weightKg > previous.maxWeight.weightKg,

      maxVolume:
        !previous ||
        volumeKg > previous.maxVolume.volumeKg,

      estimatedOneRepMax:
        estimatedKg !== null &&
        (
          !previous ||
          previous.estimatedOneRepMax === null ||
          estimatedKg > previous.estimatedOneRepMax.estimatedKg
        ),
    },

    previous: previous ?? null,
    current: {
      weightKg,
      reps,
      volumeKg,
      estimatedOneRepMax: estimatedKg,
    },
  };
}
