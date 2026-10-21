
import {
  PrismaClient,
  MuscleGroup,
  Equipment,
} from "@prisma/client";

const prisma = new PrismaClient();

const exercises = [
  // Pectoraux
  ["Développé couché", MuscleGroup.CHEST, Equipment.BARBELL],
  ["Développé incliné", MuscleGroup.CHEST, Equipment.BARBELL],
  ["Développé couché haltères", MuscleGroup.CHEST, Equipment.DUMBBELL],
  ["Développé incliné haltères", MuscleGroup.CHEST, Equipment.DUMBBELL],
  ["Écartés à la poulie", MuscleGroup.CHEST, Equipment.CABLE],
  ["Pec deck", MuscleGroup.CHEST, Equipment.MACHINE],
  ["Pompes", MuscleGroup.CHEST, Equipment.BODYWEIGHT],

  // Dos
  ["Tractions", MuscleGroup.BACK, Equipment.BODYWEIGHT],
  ["Tirage vertical", MuscleGroup.BACK, Equipment.MACHINE],
  ["Rowing barre", MuscleGroup.BACK, Equipment.BARBELL],
  ["Rowing haltère", MuscleGroup.BACK, Equipment.DUMBBELL],
  ["Rowing assis poulie", MuscleGroup.BACK, Equipment.CABLE],
  ["Tirage horizontal", MuscleGroup.BACK, Equipment.MACHINE],
  ["Pull-over poulie", MuscleGroup.BACK, Equipment.CABLE],

  // Épaules
  ["Développé militaire", MuscleGroup.SHOULDERS, Equipment.BARBELL],
  ["Développé épaules haltères", MuscleGroup.SHOULDERS, Equipment.DUMBBELL],
  ["Élévations latérales", MuscleGroup.SHOULDERS, Equipment.DUMBBELL],
  ["Élévations latérales poulie", MuscleGroup.SHOULDERS, Equipment.CABLE],
  ["Oiseau haltères", MuscleGroup.SHOULDERS, Equipment.DUMBBELL],
  ["Reverse pec deck", MuscleGroup.SHOULDERS, Equipment.MACHINE],
  ["Face pull", MuscleGroup.SHOULDERS, Equipment.CABLE],

  // Biceps
  ["Curl barre", MuscleGroup.BICEPS, Equipment.BARBELL],
  ["Curl haltères", MuscleGroup.BICEPS, Equipment.DUMBBELL],
  ["Curl incliné", MuscleGroup.BICEPS, Equipment.DUMBBELL],
  ["Curl marteau", MuscleGroup.BICEPS, Equipment.DUMBBELL],
  ["Curl pupitre", MuscleGroup.BICEPS, Equipment.MACHINE],
  ["Curl poulie", MuscleGroup.BICEPS, Equipment.CABLE],

  // Triceps
  ["Extension triceps poulie", MuscleGroup.TRICEPS, Equipment.CABLE],
  ["Extension triceps corde", MuscleGroup.TRICEPS, Equipment.CABLE],
  ["Barre au front", MuscleGroup.TRICEPS, Equipment.BARBELL],
  ["Extension triceps au-dessus de la tête", MuscleGroup.TRICEPS, Equipment.DUMBBELL],
  ["Dips", MuscleGroup.TRICEPS, Equipment.BODYWEIGHT],

  // Jambes
  ["Squat", MuscleGroup.QUADS, Equipment.BARBELL],
  ["Presse à cuisses", MuscleGroup.QUADS, Equipment.MACHINE],
  ["Hack squat", MuscleGroup.QUADS, Equipment.MACHINE],
  ["Leg extension", MuscleGroup.QUADS, Equipment.MACHINE],
  ["Fentes haltères", MuscleGroup.QUADS, Equipment.DUMBBELL],
  ["Soulevé de terre roumain", MuscleGroup.HAMSTRINGS, Equipment.BARBELL],
  ["Leg curl assis", MuscleGroup.HAMSTRINGS, Equipment.MACHINE],
  ["Leg curl allongé", MuscleGroup.HAMSTRINGS, Equipment.MACHINE],
  ["Hip thrust", MuscleGroup.GLUTES, Equipment.BARBELL],
  ["Mollets debout", MuscleGroup.CALVES, Equipment.MACHINE],
  ["Mollets assis", MuscleGroup.CALVES, Equipment.MACHINE],

  // Abdominaux
  ["Crunch", MuscleGroup.ABS, Equipment.BODYWEIGHT],
  ["Crunch poulie", MuscleGroup.ABS, Equipment.CABLE],
  ["Relevés de jambes", MuscleGroup.ABS, Equipment.BODYWEIGHT],
  ["Gainage", MuscleGroup.ABS, Equipment.BODYWEIGHT],

  // Full body
  ["Soulevé de terre", MuscleGroup.FULL_BODY, Equipment.BARBELL],
  ["Burpees", MuscleGroup.FULL_BODY, Equipment.BODYWEIGHT],
] as const;

async function main() {
  for (const [name, muscleGroup, equipment] of exercises) {
    const existing = await prisma.exercise.findFirst({
      where: {
        name,
        equipment,
        createdById: null,
      },
    });

    if (!existing) {
      await prisma.exercise.create({
        data: {
          name,
          muscleGroup,
          equipment,
        },
      });
    }
  }

  console.log(`Catalogue initialisé : ${exercises.length} exercices.`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
