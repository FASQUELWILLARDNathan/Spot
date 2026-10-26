-- AlterTable
ALTER TABLE "Workout" ADD COLUMN     "groupWorkoutId" TEXT;

-- CreateTable
CREATE TABLE "GroupWorkout" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" VARCHAR(300),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GroupWorkout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GroupWorkoutExercise" (
    "id" TEXT NOT NULL,
    "groupWorkoutId" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "targetSets" INTEGER NOT NULL,
    "targetRepsMin" INTEGER,
    "targetRepsMax" INTEGER,
    "restSeconds" INTEGER,

    CONSTRAINT "GroupWorkoutExercise_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GroupWorkout_groupId_idx" ON "GroupWorkout"("groupId");

-- CreateIndex
CREATE INDEX "GroupWorkoutExercise_groupWorkoutId_position_idx" ON "GroupWorkoutExercise"("groupWorkoutId", "position");

-- CreateIndex
CREATE INDEX "Workout_groupWorkoutId_idx" ON "Workout"("groupWorkoutId");

-- AddForeignKey
ALTER TABLE "Workout" ADD CONSTRAINT "Workout_groupWorkoutId_fkey" FOREIGN KEY ("groupWorkoutId") REFERENCES "GroupWorkout"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupWorkout" ADD CONSTRAINT "GroupWorkout_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupWorkoutExercise" ADD CONSTRAINT "GroupWorkoutExercise_groupWorkoutId_fkey" FOREIGN KEY ("groupWorkoutId") REFERENCES "GroupWorkout"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupWorkoutExercise" ADD CONSTRAINT "GroupWorkoutExercise_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
