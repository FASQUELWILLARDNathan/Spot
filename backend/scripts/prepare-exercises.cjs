
const fs = require('node:fs')
const path = require('node:path')

const root = path.resolve(__dirname, '..')
const source = path.join(root, 'data', 'exercises.json')
const destination = path.resolve(
  root,
  '../frontend/public/exercises/catalog.json'
)

const exercises = JSON.parse(fs.readFileSync(source, 'utf8'))

const catalog = exercises.map((exercise) => ({
  datasetId: exercise.id,
  name: exercise.name,
  descriptionFr: exercise.instructions?.fr ?? null,
  instructionSteps: exercise.instruction_steps?.fr ?? [],
  animationUrl: exercise.gif_url
    ? `/${exercise.gif_url}`
    : null,
  imageUrl: exercise.image
    ? `/${exercise.image}`
    : null,
  targetMuscle: exercise.target ?? null,
  secondaryMuscles: exercise.secondary_muscles ?? [],
  equipment: exercise.equipment ?? 'other',
}))

fs.mkdirSync(path.dirname(destination), { recursive: true })
fs.writeFileSync(
  destination,
  JSON.stringify(catalog),
  'utf8'
)

console.log(`${catalog.length} exercices préparés pour Spot`)
