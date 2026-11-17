<script setup lang="ts">
const props = defineProps<{
  points: Array<{ label: string; value: number }>
  label: string
}>()
const { amountsHidden } = usePrivacy()
const { formatMoney } = useBudgetyar()
const bars = computed(() => {
  const maximum = Math.max(0, ...props.points.map((point) => point.value))
  return props.points.map((point, index) => ({
    ...point,
    x: 10 + index * 340 / props.points.length,
    width: Math.max(1, 340 / props.points.length - (props.points.length > 12 ? 3 : 7)),
    height: maximum > 0 ? point.value / maximum * 100 : 0,
    recent: index >= Math.floor(props.points.length * .6),
    showLabel: props.points.length <= 12 || index === 0 || (index + 1) % 5 === 0,
  }))
})
const hasData = computed(() => props.points.some((point) => point.value > 0))
</script>

<template>
  <p v-if="amountsHidden" class="analytics-chart-empty">‏مبلغ‌ها پنهان هستند.</p>
  <svg v-else-if="hasData" class="analytics-bar-chart" viewBox="0 0 360 140" role="img" :aria-label="label">
    <line x1="10" x2="350" y1="112" y2="112" />
    <g v-for="(bar, index) in bars" :key="`${index}-${bar.label}`">
      <rect :x="bar.x" :y="112 - bar.height" :width="bar.width" :height="bar.height" rx="3" :class="{ recent: bar.recent }">
        <title>{{ bar.label }} · {{ formatMoney(bar.value) }}</title>
      </rect>
      <text v-if="bar.showLabel" :x="bar.x + bar.width / 2" y="132" text-anchor="middle">{{ bar.label }}</text>
    </g>
  </svg>
  <p v-else class="analytics-chart-empty">‏هزینه‌ای در این بازه ثبت نشده است.</p>
</template>

<style scoped>
.analytics-bar-chart { display: block; max-height: 200px; width: 100%; }
.analytics-bar-chart line { stroke: var(--line); stroke-width: 1; }
.analytics-bar-chart rect { fill: color-mix(in srgb, var(--muted) 55%, var(--panel)); }
.analytics-bar-chart rect.recent { fill: var(--primary); }
.analytics-bar-chart text { fill: var(--muted); font-family: inherit; font-size: 9px; }
.analytics-chart-empty { color: var(--muted); font-size: .75rem; line-height: 1.8; margin: 16px 0; min-height: 70px; }
</style>
