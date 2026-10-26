-- CreateTable
CREATE TABLE "GroupWorkoutExerciseSetBlock" (
    "id" TEXT NOT NULL,
    "groupWorkoutExerciseId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "targetSets" INTEGER NOT NULL,
    "targetRepsMin" INTEGER,
    "targetRepsMax" INTEGER,
    "restSeconds" INTEGER,

    CONSTRAINT "GroupWorkoutExerciseSetBlock_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GroupWorkoutExerciseSetBlock_groupWorkoutExerciseId_positio_idx" ON "GroupWorkoutExerciseSetBlock"("groupWorkoutExerciseId", "position");

-- AddForeignKey
ALTER TABLE "GroupWorkoutExerciseSetBlock" ADD CONSTRAINT "GroupWorkoutExerciseSetBlock_groupWorkoutExerciseId_fkey" FOREIGN KEY ("groupWorkoutExerciseId") REFERENCES "GroupWorkoutExercise"("id") ON DELETE CASCADE ON UPDATE CASCADE;
