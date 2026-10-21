
import { getPersonalRecords } from "./records.service.js";

type RecordsSnapshot = Awaited<
  ReturnType<typeof getPersonalRecords>
>;

export interface NewPersonalRecord {
  exerciseId: string;
  exerciseName: string;
  type: "MAX_WEIGHT" | "MAX_VOLUME" | "ESTIMATED_1RM";
  previousValue: number | null;
  newValue: number;
}

export function detectNewRecords(
  before: RecordsSnapshot,
  after: RecordsSnapshot,
): NewPersonalRecord[] {
  const previousByExercise = new Map(
    before.map((record) => [record.exerciseId, record]),
  );

  const events: NewPersonalRecord[] = [];

  for (const current of after) {
    const previous = previousByExercise.get(current.exerciseId);

    const checks: {
      type: NewPersonalRecord["type"];
      oldValue: number | null;
      newValue: number | null;
    }[] = [
      {
        type: "MAX_WEIGHT",
        oldValue: previous?.maxWeight.weightKg ?? null,
        newValue: current.maxWeight.weightKg,
      },
      {
        type: "MAX_VOLUME",
        oldValue: previous?.maxVolume.volumeKg ?? null,
        newValue: current.maxVolume.volumeKg,
      },
      {
        type: "ESTIMATED_1RM",
        oldValue:
          previous?.estimatedOneRepMax?.estimatedKg ?? null,
        newValue:
          current.estimatedOneRepMax?.estimatedKg ?? null,
      },
    ];

    for (const check of checks) {
      if (check.newValue === null) continue;

      if (
        check.oldValue !== null &&
        check.newValue <= check.oldValue
      ) {
        continue;
      }

      events.push({
        exerciseId: current.exerciseId,
        exerciseName: current.exerciseName,
        type: check.type,
        previousValue: check.oldValue,
        newValue: check.newValue,
      });
    }
  }

  return events;
}
