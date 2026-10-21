-- CreateTable
CREATE TABLE "WeighIn" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "weightKg" DECIMAL(6,2) NOT NULL,
    "bodyFatPct" DECIMAL(5,2),
    "muscleMassKg" DECIMAL(6,2),
    "bodyWaterPct" DECIMAL(5,2),
    "measuredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WeighIn_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WeighIn_userId_measuredAt_idx" ON "WeighIn"("userId", "measuredAt");

-- AddForeignKey
ALTER TABLE "WeighIn" ADD CONSTRAINT "WeighIn_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
