<script setup lang="ts">
import {
  Activity,
  Apple,
  Check,
  ChevronDown,
  Dumbbell,
  Droplets,
  Flame,
  HeartPulse,
  Pencil,
  Plus,
  Scale,
  Save,
  ShoppingBasket,
  Target,
  Trash2,
  Utensils,
  X,
} from 'lucide-vue-next'
import { Chart, registerables, type ChartConfiguration } from 'chart.js'
import { mealTiming, shoppingList, type WorkoutDay } from '../data/fitnessPlan'
import type { ExerciseLog, WorkoutSession } from '../composables/useFitnessPlan'

Chart.register(...registerables)

const fitness = useFitnessPlan()
const {
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
} = fitness

const tabs = [
  { id: 'today' as const, label: '‏امروز', icon: Activity },
  { id: 'nutrition' as const, label: '‏تغذیه', icon: Apple },
  { id: 'workout' as const, label: '‏تمرین', icon: Dumbbell },
  { id: 'cardio' as const, label: '‏هوازی', icon: HeartPulse },
  { id: 'progress' as const, label: '‏پیشرفت', icon: Scale },
]

const todayCalendarDay = computed(() => nutritionWeek.find((day) => day.weekday === new Date().getDay()) ?? nutritionWeek[0])

const selectedMealPlanWeekday = computed({
  get: () => todayRecord.value.planWeekday === undefined ? '' : String(todayRecord.value.planWeekday),
  set: (value: string) => {
    if (value !== '') selectNutritionPlan(Number(value))
  },
})

const dailyTasks = computed(() => {
  const nutritionTasks = [
    {
      id: 'meals',
      label: '‏وعده‌های برنامه',
      detail: todayNutritionPlan.value ? `‏${todayMeals.value.length} وعده انتخاب شده` : '‏ابتدا برنامه غذایی را انتخاب کن',
      icon: Utensils,
    },
    { id: 'calories', label: '‏هدف کالری', detail: `‏${profile.value.calorieMin} تا ${profile.value.calorieMax} کیلوکالری`, icon: Flame },
    { id: 'protein', label: '‏هدف پروتئین', detail: `‏${profile.value.proteinMin} تا ${profile.value.proteinMax} گرم`, icon: Target },
  ]
  const waterTask = { id: 'water', label: '‏آب روزانه', detail: '‏۲٫۵ تا ۳ لیتر', icon: Droplets }

  if (todayWorkout.value) {
    return [
      { id: 'workout', label: `‏تمرین ${todayWorkout.value.title}`, detail: todayWorkout.value.targetMuscles, icon: Dumbbell },
      ...nutritionTasks,
      { id: 'cardio', label: '‏هوازی پس از تمرین', detail: '‏۱۵ دقیقه با شدت سبک تا متوسط', icon: HeartPulse },
      waterTask,
    ]
  }

  return [
    { id: 'recovery', label: '‏پیاده‌روی و ریکاوری', detail: '‏روز بدون تمرین مقاومتی؛ قدم و خواب کافی', icon: Activity },
    ...nutritionTasks,
    waterTask,
  ]
})

function isDailyTaskDisabled(taskId: string): boolean {
  return !todayNutritionPlan.value && ['meals', 'calories', 'protein'].includes(taskId)
}

const mealGroups = computed(() => [
  { id: 'breakfast', title: '‏صبحانه‌ها', items: meals.filter((meal) => meal.slot === 'breakfast') },
  { id: 'lunch', title: '‏ناهارها', items: meals.filter((meal) => meal.slot === 'lunch') },
  { id: 'dinner', title: '‏شام‌ها', items: meals.filter((meal) => meal.slot === 'dinner') },
  { id: 'snack', title: '‏میان‌وعده‌ها', items: meals.filter((meal) => meal.slot === 'snack') },
])

const workoutDrafts = reactive<Record<string, ExerciseLog[]>>(
  Object.fromEntries(workouts.map((workout) => [
    workout.id,
    workout.exercises.map((exercise) => ({
      exerciseId: exercise.id,
      weight: 0,
      reps: 0,
      completedSets: 0,
      notes: '',
    })),
  ])),
)

const cardioForm = reactive({
  duration: 15,
  type: '‏تردمیل شیبدار',
  completed: false,
})

const progressForm = reactive({
  week: 1,
  weight: 79,
  waist: 93,
  arm: 0,
  performance: '',
  averageCalories: 2150,
  averageProtein: 145,
  notes: '',
})

const progressCanvas = ref<HTMLCanvasElement | null>(null)
const workoutHistoryCanvas = ref<HTMLCanvasElement | null>(null)
const statusMessage = ref('')
const openHistorySessionId = ref('')
const editingSessionId = ref('')
const sessionEditDraft = reactive<{ date: string; exercises: ExerciseLog[] }>({
  date: '',
  exercises: [],
})
let progressChart: Chart<'line'> | null = null
let workoutHistoryChart: Chart<'bar'> | null = null

const workoutChartEntries = computed(() => [...workoutSessions.value].slice(0, 12).reverse())
const workoutHistoryStats = computed(() => {
  const counts = workoutSessions.value.map((session) => session.exercises.length)
  const total = counts.reduce((sum, count) => sum + count, 0)
  return {
    average: counts.length ? Math.round((total / counts.length) * 10) / 10 : 0,
    maximum: counts.length ? Math.max(...counts) : 0,
    sessions: counts.length,
  }
})

function showStatus(message: string): void {
  statusMessage.value = message
  window.setTimeout(() => {
    if (statusMessage.value === message) statusMessage.value = ''
  }, 2400)
}

function mealNames(ids: string[]): string {
  return ids
    .map((id) => meals.find((meal) => meal.id === id)?.name.replace('‏', ''))
    .filter(Boolean)
    .join('، ')
}

function getDraft(workoutId: string, exerciseId: string): ExerciseLog {
  return workoutDrafts[workoutId].find((log) => log.exerciseId === exerciseId)!
}

function hydrateWorkoutDrafts(): void {
  workouts.forEach((workout) => {
    workout.exercises.forEach((exercise) => {
      const latest = getLatestExerciseLog(workout.id, exercise.id)
      const draft = getDraft(workout.id, exercise.id)
      if (latest && !draft.weight && !draft.reps && !draft.completedSets && !draft.notes) {
        Object.assign(draft, { ...latest, completedSets: 0 })
      }
    })
  })
}

function submitWorkout(workout: WorkoutDay): void {
  const logs = workoutDrafts[workout.id].map((log) => ({ ...log }))
  if (!logs.some((log) => log.completedSets || log.weight || log.reps || log.notes.trim())) {
    showStatus('‏برای ثبت جلسه، حداقل یک حرکت را وارد کن.')
    return
  }
  saveWorkout(workout, logs)
  workoutDrafts[workout.id].forEach((log) => {
    log.completedSets = 0
    log.notes = ''
  })
  showStatus('‏جلسه تمرین ذخیره شد.')
}

function getWorkoutTitle(workoutId: string): string {
  return workouts.find((workout) => workout.id === workoutId)?.title ?? '‏جلسه تمرین'
}

function getExerciseName(workoutId: string, exerciseId: string): string {
  return workouts
    .find((workout) => workout.id === workoutId)
    ?.exercises.find((exercise) => exercise.id === exerciseId)?.name ?? '‏حرکت ثبت‌شده'
}

function getExerciseTarget(workoutId: string, exerciseId: string): string {
  const exercise = workouts
    .find((workout) => workout.id === workoutId)
    ?.exercises.find((item) => item.id === exerciseId)
  return exercise ? `‏هدف ${toPersianNumber(exercise.sets)} ست × ${toPersianNumber(exercise.reps)}` : ''
}

function getSessionTotalSets(session: WorkoutSession): number {
  return session.exercises.reduce((sum, exercise) => sum + exercise.completedSets, 0)
}

function startEditingSession(session: WorkoutSession): void {
  openHistorySessionId.value = session.id
  editingSessionId.value = session.id
  sessionEditDraft.date = session.date
  sessionEditDraft.exercises = session.exercises.map((exercise) => ({ ...exercise }))
}

function cancelEditingSession(): void {
  editingSessionId.value = ''
  sessionEditDraft.date = ''
  sessionEditDraft.exercises = []
}

function submitSessionEdit(session: WorkoutSession): void {
  if (!sessionEditDraft.exercises.some((exercise) => exercise.completedSets || exercise.weight || exercise.reps || exercise.notes.trim())) {
    showStatus('‏حداقل یک حرکت باید در جلسه باقی بماند.')
    return
  }
  const updated = updateWorkoutSession(session.id, {
    date: sessionEditDraft.date,
    exercises: sessionEditDraft.exercises.map((exercise) => ({ ...exercise })),
  })
  if (!updated) {
    showStatus('‏تاریخ جلسه را به‌صورت معتبر وارد کن.')
    return
  }
  cancelEditingSession()
  showStatus('‏تغییرات جلسه ذخیره شد.')
}

function deleteWorkoutSession(session: WorkoutSession): void {
  if (!window.confirm(`جلسه ${getWorkoutTitle(session.workoutId).replace('‏', '')} در تاریخ ${session.date} حذف شود؟`)) return
  removeWorkoutSession(session.id)
  if (openHistorySessionId.value === session.id) openHistorySessionId.value = ''
  if (editingSessionId.value === session.id) cancelEditingSession()
  showStatus('‏جلسه از تاریخچه حذف شد.')
}

function submitCardio(): void {
  if (cardioForm.duration <= 0) {
    showStatus('‏مدت هوازی را وارد کن.')
    return
  }
  addCardio({ ...cardioForm })
  cardioForm.completed = false
  showStatus('‏هوازی امروز ثبت شد.')
}

function submitProgress(): void {
  if (!progressForm.weight || !progressForm.waist) {
    showStatus('‏وزن و دور شکم را وارد کن.')
    return
  }
  addProgress({ ...progressForm })
  progressForm.week += 1
  progressForm.notes = ''
  progressForm.performance = ''
  showStatus('‏گزارش هفتگی ثبت شد.')
}

function progressWidth(value: number, target: number): string {
  return `${Math.min(100, Math.round((value / target) * 100))}%`
}

function updateWaterFromEvent(event: Event): void {
  setWater(Number((event.target as HTMLInputElement).value))
}

function renderProgressChart(): void {
  progressChart?.destroy()
  progressChart = null
  if (!progressCanvas.value || activeTab.value !== 'progress' || !progressEntries.value.length) return
  const entries = [...progressEntries.value].reverse()
  const config: ChartConfiguration<'line'> = {
    type: 'line',
    data: {
      labels: entries.map((entry) => `‏هفته ${toPersianNumber(entry.week)}`),
      datasets: [
        {
          label: '‏وزن (کیلوگرم)',
          data: entries.map((entry) => entry.weight),
          borderColor: '#5eead4',
          backgroundColor: 'rgba(94, 234, 212, .12)',
          tension: 0.3,
          pointRadius: 3,
        },
        {
          label: '‏دور شکم (سانتی‌متر)',
          data: entries.map((entry) => entry.waist),
          borderColor: '#93c5fd',
          backgroundColor: 'rgba(147, 197, 253, .1)',
          tension: 0.3,
          pointRadius: 3,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { intersect: false, mode: 'index' },
      plugins: {
        legend: {
          position: 'bottom',
          labels: { color: '#bac6d5', boxWidth: 10, font: { family: 'Vazirmatn Variable' } },
        },
      },
      scales: {
        x: { ticks: { color: '#91a0b4' }, grid: { color: 'rgba(148, 163, 184, .08)' } },
        y: { ticks: { color: '#91a0b4' }, grid: { color: 'rgba(148, 163, 184, .08)' } },
      },
    },
  }
  progressChart = new Chart(progressCanvas.value, config)
}

function renderWorkoutHistoryChart(): void {
  workoutHistoryChart?.destroy()
  workoutHistoryChart = null
  if (!workoutHistoryCanvas.value || activeTab.value !== 'workout' || !workoutChartEntries.value.length) return
  const entries = workoutChartEntries.value
  const config: ChartConfiguration<'bar'> = {
    type: 'bar',
    data: {
      labels: entries.map((session) => toPersianNumber(session.date)),
      datasets: [
        {
          label: '‏تعداد حرکات ثبت‌شده',
          data: entries.map((session) => session.exercises.length),
          backgroundColor: 'rgba(45, 212, 191, .72)',
          borderColor: '#5eead4',
          borderWidth: 1,
          borderRadius: 7,
          borderSkipped: false,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: { color: '#bac6d5', boxWidth: 10, font: { family: 'Vazirmatn Variable' } },
        },
        tooltip: {
          callbacks: {
            afterLabel: (context) => `‏${getWorkoutTitle(entries[context.dataIndex]?.workoutId ?? '')}`,
          },
        },
      },
      scales: {
        x: {
          ticks: { color: '#91a0b4', maxRotation: 45, minRotation: 0 },
          grid: { display: false },
        },
        y: {
          beginAtZero: true,
          ticks: { color: '#91a0b4', precision: 0, stepSize: 1 },
          grid: { color: 'rgba(148, 163, 184, .08)' },
          title: { display: true, text: '‏تعداد حرکت', color: '#91a0b4' },
        },
      },
    },
  }
  workoutHistoryChart = new Chart(workoutHistoryCanvas.value, config)
}

watch(workoutSessions, () => {
  hydrateWorkoutDrafts()
  nextTick(renderWorkoutHistoryChart)
}, { deep: true })
watch([activeTab, progressEntries], () => nextTick(() => {
  renderProgressChart()
  renderWorkoutHistoryChart()
}), { deep: true })
onMounted(() => nextTick(() => {
  hydrateWorkoutDrafts()
  renderProgressChart()
  renderWorkoutHistoryChart()
}))
onBeforeUnmount(() => {
  progressChart?.destroy()
  workoutHistoryChart?.destroy()
})
</script>

<template>
  <section class="fitness-page">
    <header class="glass-panel fitness-header">
      <div>
        <span class="eyebrow">‏برنامه شخصی ۸ هفته‌ای</span>
        <h1>‏تناسب اندام</h1>
        <p>‏کات ملایم، ثبت تمرین و پایش تغذیه با تمرکز بر حفظ عضله</p>
      </div>
      <span class="fitness-date">‏امروز {{ toPersianNumber(todayKey) }}</span>
    </header>

    <article class="glass-panel fitness-profile">
      <div class="fitness-profile-main">
        <div>
          <small>‏پروفایل</small>
          <strong>‏مرد، {{ toPersianNumber(profile.age) }} ساله</strong>
          <span>‏قد {{ toPersianNumber(profile.height) }} سانتی‌متر · هدف: {{ profile.goal }}</span>
        </div>
        <div class="fitness-score">
          <strong>{{ toPersianNumber(overallProgress) }}٪</strong>
          <small>‏پیشرفت فعلی</small>
        </div>
      </div>
      <div class="fitness-profile-stats">
        <span><small>‏وزن فعلی</small><b>{{ toPersianNumber(currentWeight) }} کیلو</b></span>
        <span><small>‏دور شکم</small><b>{{ toPersianNumber(currentWaist) }} سانتی‌متر</b></span>
        <span><small>‏وزن هدف</small><b>‏۷۴ تا ۷۵ کیلو</b></span>
        <span><small>‏دور شکم هدف</small><b>‏کمتر از ۸۵</b></span>
      </div>
      <div class="fitness-goal-bars">
        <div>
          <span><small>‏مسیر وزن</small><b>{{ toPersianNumber(weightProgress) }}٪</b></span>
          <div class="progress"><i :style="{ width: `${weightProgress}%` }" /></div>
        </div>
        <div>
          <span><small>‏مسیر دور شکم</small><b>{{ toPersianNumber(waistProgress) }}٪</b></span>
          <div class="progress"><i :style="{ width: `${waistProgress}%` }" /></div>
        </div>
      </div>
    </article>

    <nav class="glass-panel fitness-tabs" aria-label="‏بخش‌های برنامه تناسب اندام">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        type="button"
        :class="{ active: activeTab === tab.id }"
        @click="activeTab = tab.id"
      >
        <component :is="tab.icon" :size="17" aria-hidden="true" />
        <span>{{ tab.label }}</span>
      </button>
    </nav>

    <p v-if="statusMessage" class="fitness-status" role="status"><Check :size="16" />{{ statusMessage }}</p>

    <div v-if="activeTab === 'today'" class="fitness-section-stack">
      <article class="glass-panel fitness-card">
        <div class="section-title compact">
          <div>
            <h2>‏امروز؛ {{ todayCalendarDay.label }}</h2>
            <p>‏{{ todayWorkout ? todayWorkout.title : 'روز استراحت و ریکاوری' }} · تکمیل {{ toPersianNumber(dailyCompletion) }}٪</p>
          </div>
          <strong class="fitness-completion">{{ toPersianNumber(dailyCompletion) }}٪</strong>
        </div>
        <div class="progress fitness-master-progress"><i :style="{ width: `${dailyCompletion}%` }" /></div>
        <div class="fitness-task-grid">
          <label
            v-for="task in dailyTasks"
            :key="task.id"
            class="fitness-task"
            :class="{ completed: todayRecord.tasks[task.id], disabled: isDailyTaskDisabled(task.id) }"
          >
            <input
              type="checkbox"
              :checked="todayRecord.tasks[task.id]"
              :disabled="isDailyTaskDisabled(task.id)"
              @change="toggleDailyTask(task.id)"
            />
            <component :is="task.icon" :size="18" aria-hidden="true" />
            <span><b>{{ task.label }}</b><small>{{ task.detail }}</small></span>
          </label>
        </div>
        <label class="fitness-water-input">
          <Droplets :size="18" aria-hidden="true" />
          <span>‏آب نوشیده‌شده</span>
          <input
            :value="todayRecord.waterMl"
            type="number"
            min="0"
            step="250"
            inputmode="numeric"
            @input="updateWaterFromEvent"
          />
          <small>‏میلی‌لیتر</small>
        </label>
      </article>

      <article class="glass-panel fitness-card">
        <div class="section-title compact">
          <div><h2>‏وعده‌های امروز</h2><p>‏ابتدا یکی از برنامه‌های روزانه را انتخاب کن؛ سپس وعده‌های همان برنامه را ثبت کن.</p></div>
        </div>
        <label class="fitness-meal-plan-picker">
          <span><Utensils :size="17" /> ‏برنامه غذایی این تاریخ</span>
          <BudgetyarSelect v-model="selectedMealPlanWeekday">
            <option value="" disabled>‏انتخاب برنامه غذایی...</option>
            <option v-for="day in nutritionWeek" :key="day.weekday" :value="String(day.weekday)">
              {{ day.label }} · {{ day.activity }}
            </option>
          </BudgetyarSelect>
          <small v-if="todayNutritionPlan">‏انتخاب فعلی: {{ todayNutritionPlan.label }}، {{ todayNutritionPlan.activity }}</small>
          <small v-else>‏تا قبل از انتخاب برنامه، چک‌باکس‌های تغذیه در پیشرفت روزانه غیرفعال هستند.</small>
        </label>

        <template v-if="todayNutritionPlan">
          <div class="fitness-macro-grid fitness-selected-plan-macros">
            <div>
              <span><small>‏کالری</small><b>{{ toPersianNumber(caloriesConsumed) }} / {{ toPersianNumber(profile.calorieMin) }}</b></span>
              <div class="progress"><i :style="{ width: progressWidth(caloriesConsumed, profile.calorieMin) }" /></div>
            </div>
            <div>
              <span><small>‏پروتئین</small><b>{{ toPersianNumber(proteinConsumed) }} / {{ toPersianNumber(profile.proteinMin) }} گرم</b></span>
              <div class="progress"><i :style="{ width: progressWidth(proteinConsumed, profile.proteinMin) }" /></div>
            </div>
          </div>
          <div class="fitness-meal-list">
            <label v-for="meal in todayMeals" :key="meal.id" class="fitness-meal" :class="{ completed: todayRecord.completedMealIds.includes(meal.id) }">
              <input
                type="checkbox"
                :checked="todayRecord.completedMealIds.includes(meal.id)"
                @change="toggleMeal(meal.id)"
              />
              <span><b>{{ meal.name }}</b><small>{{ meal.amount }}</small></span>
              <em>{{ toPersianNumber(meal.calories) }} kcal · {{ toPersianNumber(meal.protein) }}g</em>
            </label>
          </div>
        </template>
        <div v-else class="fitness-meal-plan-empty">
          <Utensils :size="24" />
          <strong>‏هنوز برنامه‌ای برای امروز انتخاب نشده است.</strong>
          <small>‏از فهرست بالا یک برنامه انتخاب کن تا وعده‌ها و چک‌باکس‌ها نمایش داده شوند.</small>
        </div>
      </article>
    </div>

    <div v-else-if="activeTab === 'nutrition'" class="fitness-section-stack">
      <article class="glass-panel fitness-card">
        <div class="section-title compact">
          <div><h2>‏هدف تغذیه روزانه</h2><p>‏کات آهسته با حفظ قدرت؛ میانگین هفتگی مهم‌تر از یک روز است.</p></div>
        </div>
        <div class="fitness-target-strip">
          <span><Flame :size="18" /><small>‏کالری</small><b>‏۲۱۰۰–۲۲۰۰</b></span>
          <span><Target :size="18" /><small>‏پروتئین</small><b>‏۱۴۰–۱۵۰ گرم</b></span>
          <span><Droplets :size="18" /><small>‏آب</small><b>‏۲٫۵–۳ لیتر</b></span>
          <span><Apple :size="18" /><small>‏فیبر</small><b>‏۲۵–۳۵ گرم</b></span>
        </div>
      </article>

      <article class="glass-panel fitness-card">
        <div class="section-title compact"><div><h2>‏قبل و بعد تمرین</h2><p>‏اولویت با مجموع پروتئین روزانه است.</p></div></div>
        <div class="fitness-info-grid">
          <div v-for="item in mealTiming" :key="item.title"><strong>{{ item.title }}</strong><p>{{ item.text }}</p></div>
        </div>
      </article>

      <article class="glass-panel fitness-card">
        <div class="section-title compact"><div><h2>‏برنامه غذایی ۷ روزه</h2><p>‏گزینه‌های هم‌کالری قابل جابه‌جایی‌اند.</p></div></div>
        <div class="fitness-week-grid">
          <details v-for="day in nutritionWeek" :key="day.weekday" :open="day.weekday === new Date().getDay()">
            <summary><span><b>{{ day.label }}</b><small>{{ day.activity }}</small></span><ChevronDown :size="17" /></summary>
            <p>{{ mealNames(day.mealIds) }}</p>
            <small v-if="day.note">{{ day.note }}</small>
          </details>
        </div>
      </article>

      <article class="glass-panel fitness-card">
        <div class="section-title compact"><div><h2>‏وعده‌ها و جایگزین‌ها</h2><p>‏اعداد تقریبی‌اند؛ روغن، سس و آجیل را اندازه‌گیری کن.</p></div></div>
        <div class="fitness-alternative-groups">
          <details v-for="group in mealGroups" :key="group.id">
            <summary><b>{{ group.title }}</b><span>{{ toPersianNumber(group.items.length) }} گزینه</span><ChevronDown :size="17" /></summary>
            <div class="fitness-alternative-list">
              <article v-for="meal in group.items" :key="meal.id">
                <div><strong>{{ meal.name }}</strong><small>{{ meal.amount }}</small></div>
                <span>{{ toPersianNumber(meal.calories) }} kcal<br />{{ toPersianNumber(meal.protein) }}g</span>
              </article>
            </div>
          </details>
        </div>
      </article>

      <article class="glass-panel fitness-card">
        <div class="section-title compact"><div><h2><ShoppingBasket :size="19" /> ‏فهرست خرید هفتگی</h2><p>‏برای دو نوبت آماده‌سازی غذا در هفته.</p></div></div>
        <div class="fitness-shopping-grid">
          <div v-for="group in shoppingList" :key="group.title">
            <strong>{{ group.title }}</strong>
            <ul><li v-for="item in group.items" :key="item">{{ item }}</li></ul>
          </div>
        </div>
      </article>
    </div>

    <div v-else-if="activeTab === 'workout'" class="fitness-section-stack">
      <article class="glass-panel fitness-card">
        <div class="section-title compact">
          <div><h2>‏برنامه ۴ روزه تمرین</h2><p>‏بیشتر ست‌ها را با ۱ تا ۳ تکرار ذخیره و فرم صحیح اجرا کن.</p></div>
        </div>
        <div class="fitness-overload">
          <span><Dumbbell :size="18" /><b>‏دمبل</b><small>‏افزایش ۲٫۵ کیلو برای هر دست</small></span>
          <span><Activity :size="18" /><b>‏دستگاه</b><small>‏افزایش ۵ کیلو</small></span>
          <span><Target :size="18" /><b>‏بازبینی</b><small>‏هر ۲ تا ۳ هفته</small></span>
        </div>
      </article>

      <article v-for="workout in workouts" :key="workout.id" class="glass-panel fitness-workout">
        <button class="fitness-workout-head" type="button" @click="openWorkoutId = openWorkoutId === workout.id ? '' : workout.id">
          <span><small>{{ workout.label }}</small><strong>{{ workout.title }}</strong><em>{{ workout.targetMuscles }}</em></span>
          <ChevronDown :size="20" :class="{ rotated: openWorkoutId === workout.id }" />
        </button>
        <div v-if="openWorkoutId === workout.id" class="fitness-workout-body">
          <p class="fitness-workout-note">{{ workout.note }}</p>
          <div class="fitness-exercise-list">
            <article v-for="exercise in workout.exercises" :key="exercise.id" class="fitness-exercise">
              <div class="fitness-exercise-head">
                <span><strong>{{ exercise.name }}</strong><small>{{ toPersianNumber(exercise.sets) }} ست × {{ toPersianNumber(exercise.reps) }} · استراحت {{ toPersianNumber(exercise.rest) }}</small></span>
                <p>{{ exercise.note }}</p>
              </div>
              <div class="fitness-log-grid">
                <label><span>‏وزنه (کیلو)</span><input v-model.number="getDraft(workout.id, exercise.id).weight" type="number" min="0" step="0.5" inputmode="decimal" /></label>
                <label><span>‏تکرار</span><input v-model.number="getDraft(workout.id, exercise.id).reps" type="number" min="0" inputmode="numeric" /></label>
                <label><span>‏ست کامل</span><input v-model.number="getDraft(workout.id, exercise.id).completedSets" type="number" min="0" :max="exercise.sets" inputmode="numeric" /></label>
                <label class="fitness-log-note"><span>‏یادداشت</span><input v-model="getDraft(workout.id, exercise.id).notes" type="text" placeholder="‏اختیاری" /></label>
              </div>
              <p v-if="shouldIncreaseWeight(exercise, getDraft(workout.id, exercise.id))" class="fitness-increase">
                <Check :size="15" /> ‏جلسه بعد می‌توانی وزنه را افزایش بدهی.
              </p>
            </article>
          </div>
          <button class="primary-button fitness-save-button" type="button" @click="submitWorkout(workout)">
            <Plus :size="17" /> ‏ثبت جلسه {{ workout.title }}
          </button>
        </div>
      </article>

      <article v-if="workoutSessions.length" class="glass-panel fitness-card">
        <div class="section-title compact">
          <div>
            <h2>‏روند تعداد حرکات باشگاه</h2>
            <p>‏تعداد حرکات ثبت‌شده در ۱۲ جلسه اخیر؛ با ویرایش تاریخچه خودکار به‌روز می‌شود.</p>
          </div>
        </div>
        <div class="fitness-workout-chart-stats">
          <span><small>‏تعداد جلسات</small><b>{{ toPersianNumber(workoutHistoryStats.sessions) }}</b></span>
          <span><small>‏میانگین حرکت در جلسه</small><b>{{ toPersianNumber(workoutHistoryStats.average) }}</b></span>
          <span><small>‏بیشترین حرکت</small><b>{{ toPersianNumber(workoutHistoryStats.maximum) }}</b></span>
        </div>
        <div class="fitness-workout-history-chart">
          <canvas ref="workoutHistoryCanvas" />
        </div>
      </article>

      <article v-if="workoutSessions.length" class="glass-panel fitness-card">
        <div class="section-title compact">
          <div>
            <h2>‏تاریخچه جلسات</h2>
            <p>‏برای دیدن جزئیات، ویرایش یا حذف، هر جلسه را باز کن.</p>
          </div>
          <span class="fitness-history-count">{{ toPersianNumber(workoutSessions.length) }} جلسه</span>
        </div>
        <div class="fitness-session-history">
          <article v-for="session in workoutSessions" :key="session.id" class="fitness-session-card">
            <button
              class="fitness-session-summary"
              type="button"
              :aria-expanded="openHistorySessionId === session.id"
              @click="openHistorySessionId = openHistorySessionId === session.id ? '' : session.id"
            >
              <span>
                <b>{{ getWorkoutTitle(session.workoutId) }}</b>
                <small>
                  {{ toPersianNumber(session.date) }} ·
                  {{ toPersianNumber(session.exercises.length) }} حرکت ·
                  {{ toPersianNumber(getSessionTotalSets(session)) }} ست کامل
                </small>
              </span>
              <ChevronDown :size="18" :class="{ rotated: openHistorySessionId === session.id }" />
            </button>

            <div v-if="openHistorySessionId === session.id" class="fitness-session-details">
              <template v-if="editingSessionId === session.id">
                <label class="fitness-session-date">
                  <span>‏تاریخ جلسه</span>
                  <input v-model="sessionEditDraft.date" type="text" inputmode="numeric" placeholder="‏۱۴۰۵/۰۵/۰۹" />
                </label>
                <div class="fitness-session-exercises">
                  <article v-for="exercise in sessionEditDraft.exercises" :key="exercise.exerciseId" class="fitness-session-exercise editing">
                    <div class="fitness-session-exercise-head">
                      <span>
                        <strong>{{ getExerciseName(session.workoutId, exercise.exerciseId) }}</strong>
                        <small>{{ getExerciseTarget(session.workoutId, exercise.exerciseId) }}</small>
                      </span>
                    </div>
                    <div class="fitness-log-grid">
                      <label><span>‏وزنه (کیلو)</span><input v-model.number="exercise.weight" type="number" min="0" step="0.5" inputmode="decimal" /></label>
                      <label><span>‏تکرار</span><input v-model.number="exercise.reps" type="number" min="0" inputmode="numeric" /></label>
                      <label><span>‏ست کامل</span><input v-model.number="exercise.completedSets" type="number" min="0" inputmode="numeric" /></label>
                      <label class="fitness-log-note"><span>‏یادداشت</span><input v-model="exercise.notes" type="text" placeholder="‏اختیاری" /></label>
                    </div>
                  </article>
                </div>
                <div class="fitness-session-actions">
                  <button class="primary-button" type="button" @click="submitSessionEdit(session)">
                    <Save :size="16" /> ‏ذخیره تغییرات
                  </button>
                  <button class="soft-button" type="button" @click="cancelEditingSession">
                    <X :size="16" /> ‏انصراف
                  </button>
                </div>
              </template>

              <template v-else>
                <div class="fitness-session-exercises">
                  <article v-for="exercise in session.exercises" :key="exercise.exerciseId" class="fitness-session-exercise">
                    <div class="fitness-session-exercise-head">
                      <span>
                        <strong>{{ getExerciseName(session.workoutId, exercise.exerciseId) }}</strong>
                        <small>{{ getExerciseTarget(session.workoutId, exercise.exerciseId) }}</small>
                      </span>
                    </div>
                    <div class="fitness-session-values">
                      <span><small>‏وزنه</small><b>{{ toPersianNumber(exercise.weight) }} کیلو</b></span>
                      <span><small>‏تکرار</small><b>{{ toPersianNumber(exercise.reps) }}</b></span>
                      <span><small>‏ست کامل</small><b>{{ toPersianNumber(exercise.completedSets) }}</b></span>
                    </div>
                    <p v-if="exercise.notes" class="fitness-session-note">‏{{ exercise.notes }}</p>
                  </article>
                </div>
                <div class="fitness-session-actions">
                  <button class="soft-button" type="button" @click="startEditingSession(session)">
                    <Pencil :size="16" /> ‏ویرایش جلسه
                  </button>
                  <button class="soft-button fitness-delete-session" type="button" @click="deleteWorkoutSession(session)">
                    <Trash2 :size="16" /> ‏حذف جلسه
                  </button>
                </div>
              </template>
            </div>
          </article>
        </div>
      </article>
    </div>

    <div v-else-if="activeTab === 'cardio'" class="fitness-section-stack">
      <article class="glass-panel fitness-card">
        <div class="section-title compact">
          <div><h2>‏ثبت هوازی</h2><p>‏پیشنهاد شروع: ۱۵ دقیقه بعد از تمرین؛ شدت قابل گفت‌وگوی کوتاه.</p></div>
        </div>
        <form class="fitness-cardio-form" @submit.prevent="submitCardio">
          <label><span>‏مدت (دقیقه)</span><input v-model.number="cardioForm.duration" type="number" min="1" inputmode="numeric" /></label>
          <label>
            <span>‏نوع</span>
            <select v-model="cardioForm.type">
              <option>‏تردمیل شیبدار</option>
              <option>‏دوچرخه ثابت</option>
              <option>‏الپتیکال</option>
              <option>‏پیاده‌روی</option>
            </select>
          </label>
          <label class="fitness-check"><input v-model="cardioForm.completed" type="checkbox" /><span>‏انجام شد</span></label>
          <button class="primary-button" type="submit"><Plus :size="17" /> ‏ثبت هوازی</button>
        </form>
      </article>

      <article class="glass-panel fitness-card">
        <div class="section-title compact"><div><h2>‏روند ۸ هفته‌ای</h2><p>‏افزایش تدریجی بدون آسیب به تمرین مقاومتی</p></div></div>
        <div class="fitness-cardio-phases">
          <span><b>‏هفته ۱–۲</b><small>‏۲ نوبت، ۱۵–۲۰ دقیقه · ۷۰۰۰ قدم</small></span>
          <span><b>‏هفته ۳–۵</b><small>‏۲ تا ۳ نوبت، ۲۰–۲۵ دقیقه · ۸۰۰۰ قدم</small></span>
          <span><b>‏هفته ۶–۸</b><small>‏۳ نوبت، ۲۰–۳۰ دقیقه در صورت نیاز · ۹۰۰۰ قدم</small></span>
        </div>
      </article>

      <article v-if="cardioLogs.length" class="glass-panel fitness-card">
        <div class="section-title compact"><div><h2>‏تاریخچه هوازی</h2></div></div>
        <div class="fitness-history-list">
          <span v-for="log in cardioLogs.slice(0, 10)" :key="log.id">
            <b>{{ log.type }}</b>
            <small>{{ toPersianNumber(log.date) }} · {{ toPersianNumber(log.duration) }} دقیقه · {{ log.completed ? 'انجام شد' : 'ناتمام' }}</small>
          </span>
        </div>
      </article>
    </div>

    <div v-else class="fitness-section-stack">
      <article class="glass-panel fitness-card">
        <div class="section-title compact">
          <div><h2>‏ثبت هفتگی پیشرفت</h2><p>‏وزن را از میانگین چند صبح و دور شکم را در شرایط ثابت ثبت کن.</p></div>
        </div>
        <form class="fitness-progress-form" @submit.prevent="submitProgress">
          <label><span>‏هفته</span><input v-model.number="progressForm.week" type="number" min="1" max="52" /></label>
          <label><span>‏وزن (کیلو)</span><input v-model.number="progressForm.weight" type="number" min="30" step="0.1" inputmode="decimal" required /></label>
          <label><span>‏دور شکم (سانتی‌متر)</span><input v-model.number="progressForm.waist" type="number" min="40" step="0.1" inputmode="decimal" required /></label>
          <label><span>‏دور بازو (سانتی‌متر)</span><input v-model.number="progressForm.arm" type="number" min="0" step="0.1" inputmode="decimal" /></label>
          <label><span>‏میانگین کالری</span><input v-model.number="progressForm.averageCalories" type="number" min="0" inputmode="numeric" /></label>
          <label><span>‏میانگین پروتئین</span><input v-model.number="progressForm.averageProtein" type="number" min="0" inputmode="numeric" /></label>
          <label class="fitness-wide-field"><span>‏عملکرد تمرین</span><input v-model="progressForm.performance" placeholder="‏مثلاً قدرت ثابت بود" /></label>
          <label class="fitness-wide-field"><span>‏یادداشت</span><textarea v-model="progressForm.notes" rows="2" placeholder="‏خواب، گرسنگی، انرژی یا نکته مهم هفته" /></label>
          <button class="primary-button" type="submit"><Plus :size="17" /> ‏ثبت هفته</button>
        </form>
      </article>

      <article v-if="progressEntries.length" class="glass-panel fitness-card">
        <div class="section-title compact"><div><h2>‏نمودار تغییرات</h2><p>‏وزن و دور شکم در هفته‌های ثبت‌شده</p></div></div>
        <div class="fitness-progress-chart"><canvas ref="progressCanvas" /></div>
      </article>

      <article v-if="progressEntries.length" class="glass-panel fitness-card">
        <div class="section-title compact"><div><h2>‏سوابق هفتگی</h2></div></div>
        <div class="fitness-progress-history">
          <article v-for="entry in progressEntries" :key="entry.id">
            <div><strong>‏هفته {{ toPersianNumber(entry.week) }}</strong><small>{{ toPersianNumber(entry.date) }}</small></div>
            <span>‏وزن <b>{{ toPersianNumber(entry.weight) }}</b></span>
            <span>‏شکم <b>{{ toPersianNumber(entry.waist) }}</b></span>
            <span>‏بازو <b>{{ toPersianNumber(entry.arm || '—') }}</b></span>
            <span>‏کالری <b>{{ toPersianNumber(entry.averageCalories || '—') }}</b></span>
            <span>‏پروتئین <b>{{ toPersianNumber(entry.averageProtein || '—') }}</b></span>
            <p v-if="entry.performance || entry.notes">{{ entry.performance }} {{ entry.notes }}</p>
            <button class="soft-button" type="button" @click="removeProgress(entry.id)">‏حذف</button>
          </article>
        </div>
      </article>

      <article v-else class="glass-panel fitness-card fitness-empty">
        <Scale :size="28" />
        <strong>‏هنوز گزارشی ثبت نشده است.</strong>
        <small>‏اولین اندازه‌گیری هفتگی را با فرم بالا ثبت کن.</small>
      </article>
    </div>
  </section>
</template>
