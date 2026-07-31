import { computed, onMounted, reactive, ref, watch } from 'vue'
import { parseJalaliInput, toJalali } from '../../src/utils/jalali'
import {
  meals,
  nutritionWeek,
  workouts,
  type Exercise,
  type WorkoutDay,
} from '../data/fitnessPlan'

export interface FitnessProfile {
  gender: 'male'
  age: number
  height: number
  startWeight: number
  startWaist: number
  goalWeightMin: number
  goalWeightMax: number
  goalWaist: number
  calorieMin: number
  calorieMax: number
  proteinMin: number
  proteinMax: number
  goal: string
}

export interface DailyNutritionRecord {
  date: string
  planWeekday?: number
  completedMealIds: string[]
  tasks: Record<string, boolean>
  waterMl: number
}

export interface ExerciseLog {
  exerciseId: string
  weight: number
  reps: number
  completedSets: number
  notes: string
}

export interface WorkoutSession {
  id: string
  date: string
  workoutId: string
  exercises: ExerciseLog[]
}

export interface CardioLog {
  id: string
  date: string
  duration: number
  type: string
  completed: boolean
}

export interface ProgressEntry {
  id: string
  date: string
  week: number
  weight: number
  waist: number
  arm: number
  performance: string
  averageCalories: number
  averageProtein: number
  notes: string
}

interface WorkoutStore {
  sessions: WorkoutSession[]
  cardio: CardioLog[]
}

const PROFILE_STORAGE_KEY = 'fitness-profile-v1'
const MEALS_STORAGE_KEY = 'fitness-meals-v1'
const WORKOUTS_STORAGE_KEY = 'fitness-workouts-v1'
const PROGRESS_STORAGE_KEY = 'fitness-progress-v1'

const defaultProfile: FitnessProfile = {
  gender: 'male',
  age: 26,
  height: 172,
  startWeight: 79,
  startWaist: 93,
  goalWeightMin: 74,
  goalWeightMax: 75,
  goalWaist: 85,
  calorieMin: 2100,
  calorieMax: 2200,
  proteinMin: 140,
  proteinMax: 150,
  goal: '‏کاهش چربی با حفظ قدرت و حجم عضله',
}

const profile = ref<FitnessProfile>({ ...defaultProfile })
const nutritionRecords = ref<DailyNutritionRecord[]>([])
const workoutSessions = ref<WorkoutSession[]>([])
const cardioLogs = ref<CardioLog[]>([])
const progressEntries = ref<ProgressEntry[]>([])
const activeTab = ref<'today' | 'nutrition' | 'workout' | 'cardio' | 'progress'>('today')
const openWorkoutId = ref(workouts[0].id)
const isFitnessReady = ref(false)

function getTodayJalali(): string {
  const date = toJalali(new Date())
  return `${date.year}/${String(date.month).padStart(2, '0')}/${String(date.day).padStart(2, '0')}`
}

function toPersianNumber(value: string | number): string {
  return String(value).replace(/\d/g, (digit) => '۰۱۲۳۴۵۶۷۸۹'[Number(digit)])
}

function clampPercent(value: number): number {
  return Math.min(100, Math.max(0, Math.round(value)))
}

const todayKey = computed(getTodayJalali)
const todayWeekday = computed(() => new Date().getDay())
const todayWorkout = computed(() => workouts.find((day) => day.weekday === todayWeekday.value))

function createDailyRecord(date: string): DailyNutritionRecord {
  return {
    date,
    completedMealIds: [],
    tasks: {
      workout: false,
      meals: false,
      calories: false,
      protein: false,
      cardio: false,
      recovery: false,
      water: false,
    },
    waterMl: 0,
  }
}

const todayRecord = computed(() => {
  let record = nutritionRecords.value.find((item) => item.date === todayKey.value)
  if (!record) {
    record = createDailyRecord(todayKey.value)
    nutritionRecords.value.push(record)
  }
  return record
})

const todayNutritionPlan = computed(() => {
  if (todayRecord.value.planWeekday === undefined) return null
  return nutritionWeek.find((day) => day.weekday === todayRecord.value.planWeekday) ?? null
})

const todayMeals = computed(() =>
  (todayNutritionPlan.value?.mealIds ?? [])
    .map((id) => meals.find((meal) => meal.id === id))
    .filter((meal): meal is (typeof meals)[number] => Boolean(meal)),
)

const caloriesConsumed = computed(() =>
  todayMeals.value
    .filter((meal) => todayRecord.value.completedMealIds.includes(meal.id))
    .reduce((sum, meal) => sum + meal.calories, 0),
)

const proteinConsumed = computed(() =>
  todayMeals.value
    .filter((meal) => todayRecord.value.completedMealIds.includes(meal.id))
    .reduce((sum, meal) => sum + meal.protein, 0),
)

const dailyCompletion = computed(() => {
  const taskIds = todayWorkout.value
    ? ['workout', 'meals', 'calories', 'protein', 'cardio', 'water']
    : ['recovery', 'meals', 'calories', 'protein', 'water']
  const taskValues = taskIds.map((taskId) => Boolean(todayRecord.value.tasks[taskId]))
  const completed = taskValues.filter(Boolean).length
  return clampPercent((completed / taskValues.length) * 100)
})

const latestProgress = computed(() => progressEntries.value[0])
const currentWeight = computed(() => latestProgress.value?.weight || profile.value.startWeight)
const currentWaist = computed(() => latestProgress.value?.waist || profile.value.startWaist)
const weightProgress = computed(() => {
  const goal = (profile.value.goalWeightMin + profile.value.goalWeightMax) / 2
  return clampPercent(((profile.value.startWeight - currentWeight.value) / (profile.value.startWeight - goal)) * 100)
})
const waistProgress = computed(() =>
  clampPercent(((profile.value.startWaist - currentWaist.value) / (profile.value.startWaist - profile.value.goalWaist)) * 100),
)
const overallProgress = computed(() => Math.round((weightProgress.value + waistProgress.value) / 2))

function toggleMeal(mealId: string): void {
  const ids = todayRecord.value.completedMealIds
  const index = ids.indexOf(mealId)
  if (index >= 0) ids.splice(index, 1)
  else ids.push(mealId)
  todayRecord.value.tasks.meals = todayMeals.value.every((meal) => ids.includes(meal.id))
  todayRecord.value.tasks.calories = caloriesConsumed.value >= profile.value.calorieMin
  todayRecord.value.tasks.protein = proteinConsumed.value >= profile.value.proteinMin
}

function selectNutritionPlan(weekday: number): void {
  const plan = nutritionWeek.find((day) => day.weekday === Number(weekday))
  if (!plan || todayRecord.value.planWeekday === plan.weekday) return
  todayRecord.value.planWeekday = plan.weekday
  todayRecord.value.completedMealIds = []
  todayRecord.value.tasks.meals = false
  todayRecord.value.tasks.calories = false
  todayRecord.value.tasks.protein = false
}

function toggleDailyTask(taskId: string): void {
  todayRecord.value.tasks[taskId] = !todayRecord.value.tasks[taskId]
}

function setWater(value: number): void {
  todayRecord.value.waterMl = Math.max(0, Number(value) || 0)
  todayRecord.value.tasks.water = todayRecord.value.waterMl >= 2500
}

function getLatestExerciseLog(workoutId: string, exerciseId: string): ExerciseLog | undefined {
  return workoutSessions.value
    .filter((session) => session.workoutId === workoutId)
    .flatMap((session) => session.exercises)
    .find((log) => log.exerciseId === exerciseId)
}

function shouldIncreaseWeight(exercise: Exercise, log: ExerciseLog): boolean {
  return log.completedSets >= exercise.sets && log.reps >= exercise.maxReps
}

function saveWorkout(workout: WorkoutDay, logs: ExerciseLog[]): void {
  const completedLogs = logs
    .filter((log) => log.completedSets > 0 || log.weight > 0 || log.reps > 0 || log.notes.trim())
    .map((log) => ({ ...log, weight: Number(log.weight) || 0, reps: Number(log.reps) || 0, completedSets: Number(log.completedSets) || 0 }))
  if (!completedLogs.length) return
  workoutSessions.value.unshift({
    id: `${Date.now()}-${workout.id}`,
    date: todayKey.value,
    workoutId: workout.id,
    exercises: completedLogs,
  })
  if (workout.id === todayWorkout.value?.id) todayRecord.value.tasks.workout = true
}

function updateWorkoutSession(id: string, updates: Pick<WorkoutSession, 'date' | 'exercises'>): boolean {
  const session = workoutSessions.value.find((item) => item.id === id)
  if (!session) return false
  const parsedDate = parseJalaliInput(updates.date)
  if (!parsedDate) return false
  const exercises = updates.exercises
    .filter((log) => log.completedSets > 0 || log.weight > 0 || log.reps > 0 || log.notes.trim())
    .map((log) => ({
      exerciseId: log.exerciseId,
      weight: Math.max(0, Number(log.weight) || 0),
      reps: Math.max(0, Number(log.reps) || 0),
      completedSets: Math.max(0, Number(log.completedSets) || 0),
      notes: log.notes.trim(),
    }))
  if (!exercises.length) return false
  session.date = `${parsedDate.year}/${String(parsedDate.month).padStart(2, '0')}/${String(parsedDate.day).padStart(2, '0')}`
  session.exercises = exercises
  return true
}

function removeWorkoutSession(id: string): void {
  workoutSessions.value = workoutSessions.value.filter((session) => session.id !== id)
}

function addCardio(log: Omit<CardioLog, 'id' | 'date'>): void {
  cardioLogs.value.unshift({
    id: `${Date.now()}-cardio`,
    date: todayKey.value,
    duration: Math.max(0, Number(log.duration) || 0),
    type: log.type.trim() || '‏تردمیل شیبدار',
    completed: log.completed,
  })
  if (log.completed) todayRecord.value.tasks.cardio = true
}

function addProgress(entry: Omit<ProgressEntry, 'id' | 'date'>): void {
  progressEntries.value.unshift({
    id: `${Date.now()}-progress`,
    date: todayKey.value,
    week: Math.max(1, Number(entry.week) || 1),
    weight: Math.max(0, Number(entry.weight) || 0),
    waist: Math.max(0, Number(entry.waist) || 0),
    arm: Math.max(0, Number(entry.arm) || 0),
    performance: entry.performance.trim(),
    averageCalories: Math.max(0, Number(entry.averageCalories) || 0),
    averageProtein: Math.max(0, Number(entry.averageProtein) || 0),
    notes: entry.notes.trim(),
  })
}

function removeProgress(id: string): void {
  progressEntries.value = progressEntries.value.filter((entry) => entry.id !== id)
}

function restoreArray<T>(key: string): T[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) ?? '[]')
    return Array.isArray(parsed) ? parsed : []
  } catch {
    localStorage.removeItem(key)
    return []
  }
}

function startFitnessPlan(): void {
  if (isFitnessReady.value) return
  onMounted(() => {
    try {
      const savedProfile = JSON.parse(localStorage.getItem(PROFILE_STORAGE_KEY) ?? 'null')
      if (savedProfile && typeof savedProfile === 'object') profile.value = { ...defaultProfile, ...savedProfile }
    } catch {
      localStorage.removeItem(PROFILE_STORAGE_KEY)
    }

    nutritionRecords.value = restoreArray<DailyNutritionRecord>(MEALS_STORAGE_KEY)
    progressEntries.value = restoreArray<ProgressEntry>(PROGRESS_STORAGE_KEY)
    try {
      const workoutStore = JSON.parse(localStorage.getItem(WORKOUTS_STORAGE_KEY) ?? 'null') as WorkoutStore | null
      workoutSessions.value = Array.isArray(workoutStore?.sessions) ? workoutStore.sessions : []
      cardioLogs.value = Array.isArray(workoutStore?.cardio) ? workoutStore.cardio : []
    } catch {
      localStorage.removeItem(WORKOUTS_STORAGE_KEY)
    }
    isFitnessReady.value = true
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile.value))
    localStorage.setItem(MEALS_STORAGE_KEY, JSON.stringify(nutritionRecords.value))
    localStorage.setItem(WORKOUTS_STORAGE_KEY, JSON.stringify({ sessions: workoutSessions.value, cardio: cardioLogs.value }))
    localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(progressEntries.value))
  })
}

watch(profile, (value) => {
  if (isFitnessReady.value) localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(value))
}, { deep: true })

watch(nutritionRecords, (value) => {
  if (isFitnessReady.value) localStorage.setItem(MEALS_STORAGE_KEY, JSON.stringify(value))
}, { deep: true })

watch([workoutSessions, cardioLogs], () => {
  if (isFitnessReady.value) {
    localStorage.setItem(WORKOUTS_STORAGE_KEY, JSON.stringify({ sessions: workoutSessions.value, cardio: cardioLogs.value }))
  }
}, { deep: true })

watch(progressEntries, (value) => {
  if (isFitnessReady.value) localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(value))
}, { deep: true })

export function useFitnessPlan() {
  startFitnessPlan()
  return {
    profile,
    meals,
    nutritionWeek,
    workouts,
    activeTab,
    openWorkoutId,
    todayKey,
    todayNutritionPlan,
    todayWorkout,
    todayMeals,
    todayRecord,
    caloriesConsumed,
    proteinConsumed,
    dailyCompletion,
    workoutSessions,
    cardioLogs,
    progressEntries,
    latestProgress,
    currentWeight,
    currentWaist,
    weightProgress,
    waistProgress,
    overallProgress,
    toggleMeal,
    selectNutritionPlan,
    toggleDailyTask,
    setWater,
    getLatestExerciseLog,
    shouldIncreaseWeight,
    saveWorkout,
    updateWorkoutSession,
    removeWorkoutSession,
    addCardio,
    addProgress,
    removeProgress,
    toPersianNumber,
  }
}
