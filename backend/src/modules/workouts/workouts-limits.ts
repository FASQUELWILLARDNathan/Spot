
import { prisma } from "../../lib/prisma.js";

export const MAX_WORKOUT_DURATION_MS = 3 * 60 * 60 * 1000;

export function getWorkoutDeadline(startedAt: Date): Date {
  return new Date(startedAt.getTime() + MAX_WORKOUT_DURATION_MS);
}

export function isWorkoutExpired(startedAt: Date): boolean {
  return Date.now() >= getWorkoutDeadline(startedAt).getTime();
}

/**
 * Ferme les séances expirées en enregistrant leur véritable
 * heure limite : startedAt + 3 heures.
 *
 * Une seule requête SQL, aucun timer serveur.
 */
export async function expireWorkouts(userId: string): Promise<void> {
  await prisma.$executeRaw`
    UPDATE "Workout"
    SET "endedAt" = "startedAt" + INTERVAL '3 hours'
    WHERE "userId" = ${userId}
      AND "endedAt" IS NULL
      AND "startedAt" <= NOW() - INTERVAL '3 hours'
  `;
}
