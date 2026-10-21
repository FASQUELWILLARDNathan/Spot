CREATE UNIQUE INDEX "Workout_one_active_per_user"
ON "Workout" ("userId")
WHERE "endedAt" IS NULL;