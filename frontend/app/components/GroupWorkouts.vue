<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { Dumbbell, Plus, Pencil, Trash2, Play, X, RefreshCw, ArrowUp, ArrowDown } from 'lucide-vue-next'

const props = defineProps<{ groupId: string }>()
const emit = defineEmits<{ (event: 'started', workoutId: string): void }>()
const apiBase = String(useRuntimeConfig().public.apiBase || '/api').replace(/\/$/, '')

type Exercise = { id: string; name: string; muscleGroup?: string; equipment?: string }
type SetBlock = { targetSets: number; targetRepsMin: number | null; targetRepsMax: number | null; restSeconds: number | null }
type SharedExercise = { id: string; exerciseId: string; targetSets: number; targetRepsMin: number | null; targetRepsMax: number | null; restSeconds: number | null; setBlocks?: (SetBlock & { id?: string; position?: number })[]; exercise: Exercise }
type SharedWorkout = { id: string; name: string; description: string | null; exercises: SharedExercise[] }
type ExerciseForm = { key: number; exerciseId: string; setBlocks: (SetBlock & { key: number })[] }

const workouts = ref<SharedWorkout[]>([])
const catalog = ref<Exercise[]>([])
const loading = ref(false)
const saving = ref(false)
const startingId = ref<string | null>(null)
const deletingId = ref<string | null>(null)
const error = ref('')
const formError = ref('')
const catalogError = ref('')
const showEditor = ref(false)
const editingId = ref<string | null>(null)
const name = ref('')
const description = ref('')
const exerciseRows = ref<ExerciseForm[]>([])
const search = ref('')
const expandedId = ref<string | null>(null)
let nextKey = 0
const key = () => ++nextKey
const filteredCatalog = computed(() => catalog.value.filter(exercise => exercise.name.toLocaleLowerCase('fr').includes(search.value.toLocaleLowerCase('fr'))))

function errorText(cause: unknown, fallback: string) {
  const err = cause as { data?: { error?: string }; message?: string }
  return err.data?.error || fallback
}
function defaultBlock(): SetBlock & { key: number } {
  return { key: key(), targetSets: 3, targetRepsMin: 8, targetRepsMax: 12, restSeconds: 90 }
}
function blocksFor(item: SharedExercise): SetBlock[] {
  if (item.setBlocks?.length) return [...item.setBlocks].sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
  return [{ targetSets: item.targetSets, targetRepsMin: item.targetRepsMin, targetRepsMax: item.targetRepsMax, restSeconds: item.restSeconds }]
}
function totalSets(blocks: SetBlock[]) { return blocks.reduce((sum, block) => sum + (Number(block.targetSets) || 0), 0) }
function repsText(block: SetBlock) {
  if (block.targetRepsMin == null && block.targetRepsMax == null) return 'reps libres'
  if (block.targetRepsMin == null) return `≤ ${block.targetRepsMax} reps`
  if (block.targetRepsMax == null || block.targetRepsMin === block.targetRepsMax) return `${block.targetRepsMin} reps`
  return `${block.targetRepsMin}–${block.targetRepsMax} reps`
}
async function loadWorkouts() {
  loading.value = true
  error.value = ''
  try {
    workouts.value = await $fetch<SharedWorkout[]>(`${apiBase}/groups/${props.groupId}/workouts`, { credentials: 'include' })
  } catch (cause) { error.value = errorText(cause, 'Impossible de charger les séances du groupe.') }
  finally { loading.value = false }
}
async function loadCatalog() {
  catalogError.value = ''
  try {
    const result = await $fetch<Exercise[] | { exercises: Exercise[] }>(`${apiBase}/exercises`, { credentials: 'include' })
    catalog.value = Array.isArray(result) ? result : result.exercises
  } catch (cause) { catalogError.value = errorText(cause, "Impossible de charger le catalogue d'exercices.") }
}
function openCreate() {
  editingId.value = null
  name.value = ''
  description.value = ''
  exerciseRows.value = []
  formError.value = ''
  search.value = ''
  showEditor.value = true
  void loadCatalog()
}
function openEdit(workout: SharedWorkout) {
  editingId.value = workout.id
  name.value = workout.name
  description.value = workout.description ?? ''
  exerciseRows.value = workout.exercises.map(item => ({
    key: key(), exerciseId: item.exerciseId,
    setBlocks: blocksFor(item).map(block => ({ ...block, key: key() })),
  }))
  formError.value = ''
  search.value = ''
  showEditor.value = true
  void loadCatalog()
}
function addExercise(id: string) {
  if (!id || exerciseRows.value.length >= 40) return
  exerciseRows.value.push({ key: key(), exerciseId: id, setBlocks: [defaultBlock()] })
  search.value = ''
}
function addBlock(row: ExerciseForm) { row.setBlocks.push(defaultBlock()) }
function moveBlock(row: ExerciseForm, index: number, delta: number) {
  const other = index + delta
  if (other < 0 || other >= row.setBlocks.length) return
  const [block] = row.setBlocks.splice(index, 1)
  if (block) row.setBlocks.splice(other, 0, block)
}
function exerciseName(id: string) {
  return catalog.value.find(exercise => exercise.id === id)?.name
    ?? workouts.value.flatMap(workout => workout.exercises).find(item => item.exerciseId === id)?.exercise.name
    ?? 'Exercice'
}
function optionalNumber(value: number | null): number | null {
  return value === null || String(value) === '' ? null : Number(value)
}
async function save() {
  if (saving.value) return
  formError.value = ''
  if (!name.value.trim()) { formError.value = 'Donne un nom à la séance.'; return }
  let total = 0
  for (const [i, row] of exerciseRows.value.entries()) {
    if (!row.setBlocks.length) { formError.value = `Ajoute un bloc à l’exercice ${i + 1}.`; return }
    for (const [j, block] of row.setBlocks.entries()) {
      const sets = Number(block.targetSets)
      const min = optionalNumber(block.targetRepsMin)
      const max = optionalNumber(block.targetRepsMax)
      const rest = optionalNumber(block.restSeconds)
      if (!Number.isInteger(sets) || sets < 1 || sets > 20) { formError.value = `Exercice ${i + 1}, bloc ${j + 1} : entre 1 et 20 séries.`; return }
      if ((min !== null && (!Number.isInteger(min) || min < 1 || min > 100)) || (max !== null && (!Number.isInteger(max) || max < 1 || max > 100)) || (min !== null && max !== null && min > max)) { formError.value = `Exercice ${i + 1}, bloc ${j + 1} : répétitions invalides.`; return }
      if (rest !== null && (!Number.isInteger(rest) || rest < 0 || rest > 3600)) { formError.value = `Exercice ${i + 1}, bloc ${j + 1} : repos invalide.`; return }
      total += sets
    }
  }
  if (total > 400) { formError.value = 'Maximum 400 séries par programme.'; return }
  saving.value = true
  try {
    const url = `${apiBase}/groups/${props.groupId}/workouts${editingId.value ? `/${editingId.value}` : ''}`
    await $fetch(url, {
      method: editingId.value ? 'PUT' : 'POST', credentials: 'include',
      body: {
        name: name.value.trim(), description: description.value.trim() || null,
        exercises: exerciseRows.value.map(row => ({
          exerciseId: row.exerciseId,
          setBlocks: row.setBlocks.map(block => ({
            targetSets: Number(block.targetSets),
            targetRepsMin: optionalNumber(block.targetRepsMin),
            targetRepsMax: optionalNumber(block.targetRepsMax),
            restSeconds: optionalNumber(block.restSeconds),
          })),
        })),
      },
    })
    showEditor.value = false
    await loadWorkouts()
  } catch (cause) { formError.value = errorText(cause, 'Impossible de sauvegarder cette séance.') }
  finally { saving.value = false }
}
async function remove(workout: SharedWorkout) {
  if (deletingId.value || !confirm(`Supprimer définitivement « ${workout.name} » du groupe ?`)) return
  deletingId.value = workout.id
  error.value = ''
  try {
    await $fetch(`${apiBase}/groups/${props.groupId}/workouts/${workout.id}`, { method: 'DELETE', credentials: 'include' })
    await loadWorkouts()
  } catch (cause) { error.value = errorText(cause, 'Impossible de supprimer cette séance.') }
  finally { deletingId.value = null }
}
async function start(workout: SharedWorkout) {
  if (startingId.value) return
  startingId.value = workout.id
  error.value = ''
  try {
    const result = await $fetch<{ workout: { id: string } }>(`${apiBase}/groups/${props.groupId}/workouts/${workout.id}/start`, { method: 'POST', credentials: 'include' })
    emit('started', result.workout.id)
  } catch (cause) { error.value = errorText(cause, 'Impossible de démarrer la séance.') }
  finally { startingId.value = null }
}
watch(() => props.groupId, () => { showEditor.value = false; void loadWorkouts() })
onMounted(() => { void loadWorkouts() })
</script>

<template>
  <section class="space-y-5">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 class="flex items-center gap-2 text-xl font-bold"><Dumbbell :size="22" class="text-[#C9F36A]" /> Séances communes</h2>
        <p class="mt-1 text-sm text-slate-400">Un programme partagé, des performances personnelles.</p>
      </div>
      <div class="flex gap-2">
        <button type="button" :disabled="loading" aria-label="Actualiser les séances" class="rounded-xl border border-white/10 p-2.5 text-slate-300 hover:bg-white/5 disabled:opacity-50" @click="loadWorkouts"><RefreshCw :size="18" :class="{ 'animate-spin': loading }" /></button>
        <button type="button" class="inline-flex items-center gap-2 rounded-xl bg-[#C9F36A] px-4 py-2.5 text-sm font-bold text-[#111923] hover:brightness-110" @click="openCreate"><Plus :size="18" /> Nouvelle séance</button>
      </div>
    </div>
    <p v-if="error" role="alert" class="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">{{ error }}</p>
    <p v-if="loading" class="py-8 text-center text-sm text-slate-400">Chargement des séances...</p>
    <div v-else-if="workouts.length === 0" class="rounded-2xl border border-dashed border-white/15 bg-[#19232F] px-6 py-12 text-center">
      <Dumbbell :size="36" class="mx-auto mb-3 text-[#C9F36A]" />
      <p class="font-semibold">Aucune séance commune pour le moment</p>
      <p class="mt-2 text-sm text-slate-400">N'importe quel membre peut créer le premier programme du groupe.</p>
    </div>
    <div v-else class="grid gap-4 sm:grid-cols-2">
      <article v-for="workout in workouts" :key="workout.id" class="rounded-2xl border border-white/10 bg-[#19232F] p-5">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <h3 class="truncate text-lg font-bold">{{ workout.name }}</h3>
            <p v-if="workout.description" class="mt-1 text-sm text-slate-400">{{ workout.description }}</p>
            <p class="mt-2 text-xs text-[#C9F36A]">{{ workout.exercises.length }} exercice{{ workout.exercises.length > 1 ? 's' : '' }}</p>
          </div>
          <button type="button" :aria-label="`Modifier ${workout.name}`" class="rounded-lg border border-white/10 p-2 text-slate-300 hover:text-[#C9F36A]" @click="openEdit(workout)"><Pencil :size="17" /></button>
        </div>
        <button type="button" class="mt-4 text-sm font-medium text-slate-300 underline-offset-4 hover:underline" @click="expandedId = expandedId === workout.id ? null : workout.id">{{ expandedId === workout.id ? 'Masquer les exercices' : 'Voir les exercices' }}</button>
        <ul v-if="expandedId === workout.id" class="mt-3 space-y-3 border-t border-white/10 pt-3">
          <li v-for="item in workout.exercises" :key="item.id" class="text-sm">
            <div class="flex items-center justify-between gap-2"><span class="font-medium text-slate-200">{{ item.exercise.name }}</span><span class="text-xs text-[#C9F36A]">{{ totalSets(blocksFor(item)) }} séries</span></div>
            <div v-for="(block, blockIndex) in blocksFor(item)" :key="blockIndex" class="mt-1 flex justify-between gap-2 pl-3 text-xs text-slate-400">
              <span>Bloc {{ blockIndex + 1 }} · {{ block.targetSets }} × {{ repsText(block) }}</span><span>{{ block.restSeconds == null ? 'Repos libre' : `${block.restSeconds} s` }}</span>
            </div>
          </li>
        </ul>
        <div class="mt-5 flex gap-2 border-t border-white/10 pt-4">
          <button type="button" :disabled="!!startingId || !workout.exercises.length" class="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#C9F36A] px-3 py-2.5 text-sm font-bold text-[#111923] disabled:opacity-50" @click="start(workout)"><Play :size="16" /> {{ startingId === workout.id ? 'Démarrage...' : 'Démarrer' }}</button>
          <button type="button" :disabled="!!deletingId" :aria-label="`Supprimer ${workout.name}`" class="rounded-xl border border-red-500/20 px-3 text-red-400 hover:bg-red-500/10 disabled:opacity-50" @click="remove(workout)"><Trash2 :size="17" /></button>
        </div>
      </article>
    </div>

    <div v-if="showEditor" class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" @click.self="!saving && (showEditor = false)">
      <div role="dialog" aria-modal="true" aria-labelledby="shared-workout-title" class="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-white/10 bg-[#19232F] p-5 shadow-2xl sm:p-7">
        <div class="mb-5 flex items-center justify-between"><h2 id="shared-workout-title" class="text-xl font-bold">{{ editingId ? 'Modifier la séance' : 'Nouvelle séance commune' }}</h2><button type="button" :disabled="saving" aria-label="Fermer" @click="showEditor = false"><X :size="22" /></button></div>
        <form class="space-y-5" @submit.prevent="save">
          <div><label for="shared-name" class="mb-2 block text-sm text-slate-300">Nom de la séance</label><input id="shared-name" v-model="name" required maxlength="100" placeholder="Ex : Push Day" class="w-full rounded-xl border border-white/10 bg-[#111923] px-4 py-3 outline-none focus:border-[#C9F36A]" /></div>
          <div><label for="shared-description" class="mb-2 block text-sm text-slate-300">Description (facultatif)</label><textarea id="shared-description" v-model="description" maxlength="300" rows="2" class="w-full rounded-xl border border-white/10 bg-[#111923] px-4 py-3 outline-none focus:border-[#C9F36A]" /></div>
          <div class="space-y-3">
            <h3 class="font-semibold">Exercices ({{ exerciseRows.length }})</h3>
            <div v-for="(row, index) in exerciseRows" :key="row.key" class="rounded-xl border border-white/10 bg-[#111923] p-3">
              <div class="mb-3 flex items-center justify-between gap-2"><span class="font-medium">{{ index + 1 }}. {{ exerciseName(row.exerciseId) }}</span><button type="button" :aria-label="`Retirer ${exerciseName(row.exerciseId)}`" class="text-red-400" @click="exerciseRows.splice(index, 1)"><Trash2 :size="17" /></button></div>
              <div class="space-y-3">
                <div v-for="(block, blockIndex) in row.setBlocks" :key="block.key" class="rounded-xl border border-white/10 bg-[#19232F] p-3">
                  <div class="mb-3 flex items-center justify-between gap-2">
                    <span class="text-sm font-semibold text-[#C9F36A]">Bloc {{ blockIndex + 1 }}</span>
                    <div class="flex items-center gap-1">
                      <button type="button" :disabled="blockIndex === 0" :aria-label="`Monter le bloc ${blockIndex + 1}`" class="rounded-lg p-1.5 text-slate-300 hover:bg-white/10 disabled:opacity-30" @click="moveBlock(row, blockIndex, -1)"><ArrowUp :size="15" /></button>
                      <button type="button" :disabled="blockIndex === row.setBlocks.length - 1" :aria-label="`Descendre le bloc ${blockIndex + 1}`" class="rounded-lg p-1.5 text-slate-300 hover:bg-white/10 disabled:opacity-30" @click="moveBlock(row, blockIndex, 1)"><ArrowDown :size="15" /></button>
                      <button type="button" :disabled="row.setBlocks.length === 1" :aria-label="`Supprimer le bloc ${blockIndex + 1}`" class="rounded-lg p-1.5 text-red-400 hover:bg-red-500/10 disabled:opacity-30" @click="row.setBlocks.splice(blockIndex, 1)"><Trash2 :size="15" /></button>
                    </div>
                  </div>
                  <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <label class="text-xs text-slate-400">Séries<input v-model.number="block.targetSets" type="number" required min="1" max="20" class="mt-1 w-full rounded-lg border border-white/10 bg-[#111923] p-2 text-white" /></label>
                    <label class="text-xs text-slate-400">Reps min<input v-model.number="block.targetRepsMin" type="number" min="1" max="100" class="mt-1 w-full rounded-lg border border-white/10 bg-[#111923] p-2 text-white" /></label>
                    <label class="text-xs text-slate-400">Reps max<input v-model.number="block.targetRepsMax" type="number" min="1" max="100" class="mt-1 w-full rounded-lg border border-white/10 bg-[#111923] p-2 text-white" /></label>
                    <label class="text-xs text-slate-400">Repos (sec)<input v-model.number="block.restSeconds" type="number" min="0" max="3600" class="mt-1 w-full rounded-lg border border-white/10 bg-[#111923] p-2 text-white" /></label>
                  </div>
                </div>
              </div>
              <div class="mt-3 flex flex-wrap items-center justify-between gap-2">
                <button type="button" class="inline-flex items-center gap-1.5 rounded-lg border border-[#C9F36A]/30 px-3 py-2 text-xs font-semibold text-[#C9F36A] hover:bg-[#C9F36A]/10" @click="addBlock(row)"><Plus :size="15" /> Ajouter un bloc de séries</button>
                <span class="text-xs text-slate-400">Total : {{ totalSets(row.setBlocks) }} séries</span>
              </div>
            </div>
            <div class="rounded-xl border border-white/10 p-3"><label for="catalog-search" class="mb-2 block text-sm text-slate-300">Ajouter un exercice</label><input id="catalog-search" v-model="search" placeholder="Rechercher un exercice..." class="mb-2 w-full rounded-lg border border-white/10 bg-[#111923] px-3 py-2 text-sm outline-none focus:border-[#C9F36A]" />
              <p v-if="catalogError" role="alert" class="mb-2 text-xs text-red-400">{{ catalogError }}</p>
              <div class="max-h-36 space-y-1 overflow-y-auto"><button v-for="exercise in filteredCatalog.slice(0, 30)" :key="exercise.id" type="button" :disabled="exerciseRows.length >= 40" class="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm text-slate-200 hover:bg-white/10 disabled:opacity-40" @click="addExercise(exercise.id)"><span>{{ exercise.name }}</span><Plus :size="16" class="text-[#C9F36A]" /></button><p v-if="!filteredCatalog.length && !catalogError" class="py-2 text-xs text-slate-400">Aucun exercice trouvé.</p></div>
            </div>
          </div>
          <p v-if="formError" role="alert" class="text-sm text-red-400">{{ formError }}</p>
          <div class="flex justify-end gap-3"><button type="button" :disabled="saving" class="rounded-xl border border-white/10 px-5 py-3 text-sm font-semibold" @click="showEditor = false">Annuler</button><button type="submit" :disabled="saving" class="rounded-xl bg-[#C9F36A] px-5 py-3 text-sm font-bold text-[#111923] disabled:opacity-50">{{ saving ? 'Enregistrement...' : 'Enregistrer' }}</button></div>
        </form>
      </div>
    </div>
  </section>
</template>
