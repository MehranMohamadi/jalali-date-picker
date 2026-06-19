<script setup lang="ts">
const date = ref<string | null>(null)
const range = ref<{ start: string | null; end: string | null }>({ start: null, end: null })
</script>

<template>
  <main dir="rtl" class="mx-auto max-w-2xl space-y-8 p-8 font-sans">
    <h1 class="text-2xl font-bold text-slate-800">تقویم جلالی مینیمال</h1>
    <JalaliDatePicker v-model="date" placeholder="انتخاب تاریخ" />
    <JalaliRangeDatePicker v-model="range" placeholder="انتخاب بازه تاریخ" />
    <pre class="text-left text-sm" dir="ltr">{{ { date, range } }}</pre>
  </main>
</template>
