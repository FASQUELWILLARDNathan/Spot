
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DATA_URL =
  "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/data/exercises.json";

function mapMuscle(value) {
  const key = String(value ?? "").toLowerCase();

  if (key.includes("chest")) return "CHEST";
  if (key.includes("back")) return "BACK";
  if (key.includes("shoulder")) return "SHOULDERS";
  if (key.includes("lower arm")) return "BICEPS";
  if (key.includes("upper arm")) return "BICEPS";
  if (key.includes("upper leg")) return "QUADS";
  if (key.includes("lower leg")) return "CALVES";
  if (key.includes("waist")) return "ABS";

  return "FULL_BODY";
}

function mapEquipment(value) {
  const key = String(value ?? "").toLowerCase();

  if (key.includes("dumbbell")) return "DUMBBELL";
  if (key.includes("barbell") || key.includes("ez bar"))
    return "BARBELL";
  if (key.includes("cable")) return "CABLE";
  if (key.includes("kettlebell")) return "KETTLEBELL";
  if (key.includes("body weight")) return "BODYWEIGHT";
  if (key.includes("machine") || key.includes("smith"))
    return "MACHINE";

  return "OTHER";
}

async function main() {
  const response = await fetch(DATA_URL);

  if (!response.ok) {
    throw new Error(`Téléchargement impossible : ${response.status}`);
  }

  const exercises = await response.json();

  if (!Array.isArray(exercises)) {
    throw new Error("Format de dataset invalide.");
  }

  let imported = 0;

  for (const item of exercises) {
    if (
      typeof item.id !== "string" ||
      typeof item.name !== "string"
    ) {
      continue;
    }

    const instructions =
      typeof item.instructions?.fr === "string"
        ? item.instructions.fr
        : null;

    const steps = Array.isArray(item.instruction_steps?.fr)
      ? item.instruction_steps.fr.filter(
          step => typeof step === "string",
        )
      : [];

    await prisma.exercise.upsert({
      where: { externalId: `gym-dataset:${item.id}` },
      create: {
        externalId: `gym-dataset:${item.id}`,
        name: item.name,
        muscleGroup: mapMuscle(item.category),
        equipment: mapEquipment(item.equipment),
        descriptionFr: instructions,
        instructionSteps: steps,
        targetMuscle: item.target ?? null,
        secondaryMuscles: Array.isArray(item.secondary_muscles)
          ? item.secondary_muscles
          : [],
      },
      update: {
        descriptionFr: instructions,
        instructionSteps: steps,
        targetMuscle: item.target ?? null,
        secondaryMuscles: Array.isArray(item.secondary_muscles)
          ? item.secondary_muscles
          : [],
      },
    });

    imported++;
  }

  console.log(`${imported} exercices importés ou actualisés.`);
}

main()
  .catch(error => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
