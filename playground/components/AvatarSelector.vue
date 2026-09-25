<script setup lang="ts">
import { Check, Sparkles } from 'lucide-vue-next'
import { DEFAULT_AVATARS, type AvatarOption } from '../composables/useAuth'

const props = withDefaults(
  defineProps<{
    modelValue?: string
    title?: string
    subtitle?: string
    showPreview?: boolean
  }>(),
  {
    modelValue: '/avatars/avatar-1.svg',
    title: '\u200Fانتخاب آواتار',
    subtitle: '\u200Fیک تصویر نمایه برای حساب خود انتخاب کنید',
    showPreview: true,
  },
)

const emit = defineEmits<{
  'update:modelValue': [src: string]
  change: [avatar: AvatarOption]
}>()

const selected = computed(() => {
  return DEFAULT_AVATARS.find((a) => a.src === props.modelValue) || DEFAULT_AVATARS[0]
})

function selectAvatar(avatar: AvatarOption) {
  emit('update:modelValue', avatar.src)
  emit('change', avatar)
}
</script>

<template>
  <div class="avatar-selector" dir="rtl">
    <div v-if="title || subtitle" class="avatar-selector-head">
      <div class="avatar-title-wrap">
        <Sparkles :size="16" class="sparkle-icon" />
        <span class="avatar-title">{{ title }}</span>
      </div>
      <p v-if="subtitle" class="avatar-subtitle">{{ subtitle }}</p>
    </div>

    <!-- Active Preview Preview (Optional) -->
    <div v-if="showPreview" class="avatar-preview-box">
      <div class="avatar-preview-ring">
        <img :src="selected.src" :alt="selected.title" class="avatar-preview-img" width="72" height="72" />
      </div>
      <div class="avatar-preview-info">
        <span class="avatar-preview-label">‏آواتار فعلی:</span>
        <strong class="avatar-preview-name">{{ selected.title }}</strong>
      </div>
    </div>

    <!-- Avatars Grid -->
    <div class="avatar-grid" role="radiogroup" aria-label="‏فهرست آواتارهای پیش‌فرض">
      <button
        v-for="item in DEFAULT_AVATARS"
        :key="item.id"
        type="button"
        role="radio"
        :aria-checked="modelValue === item.src"
        class="avatar-option"
        :class="{ active: modelValue === item.src }"
        @click="selectAvatar(item)"
      >
        <div class="avatar-img-wrap">
          <img :src="item.src" :alt="item.title" class="avatar-img" width="56" height="56" loading="lazy" />
          <span v-if="modelValue === item.src" class="avatar-check-badge">
            <Check :size="12" stroke-width="3" />
          </span>
        </div>
        <span class="avatar-name">{{ item.title }}</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.avatar-selector {
  display: flex;
  flex-direction: column;
  gap: 12px;
  background: rgba(15, 23, 42, 0.45);
  border: 1px solid var(--line, rgba(148, 163, 184, 0.16));
  border-radius: 16px;
  padding: 16px;
  margin: 10px 0;
}

.avatar-selector-head {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.avatar-title-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.92rem;
  font-weight: 700;
  color: var(--text, #e8eef6);
}

.sparkle-icon {
  color: var(--primary, #2aa89a);
}

.avatar-subtitle {
  margin: 0;
  font-size: 0.78rem;
  color: var(--muted, #91a0b4);
}

.avatar-preview-box {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 10px 14px;
  background: rgba(2, 6, 23, 0.35);
  border: 1px solid rgba(42, 168, 154, 0.25);
  border-radius: 14px;
}

.avatar-preview-ring {
  position: relative;
  width: 58px;
  height: 58px;
  border-radius: 50%;
  padding: 2px;
  background: linear-gradient(135deg, var(--primary, #2aa89a), #38bdf8);
  box-shadow: 0 0 16px rgba(42, 168, 154, 0.25);
}

.avatar-preview-img {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  display: block;
  background: #0f172a;
}

.avatar-preview-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.avatar-preview-label {
  font-size: 0.75rem;
  color: var(--muted, #91a0b4);
}

.avatar-preview-name {
  font-size: 0.95rem;
  color: var(--text, #e8eef6);
}

.avatar-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
}

@media (max-width: 480px) {
  .avatar-grid {
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
  }
}

.avatar-option {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 12px;
  padding: 8px 4px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.avatar-option:hover {
  background: rgba(148, 163, 184, 0.08);
  transform: translateY(-2px);
}

.avatar-option.active {
  background: rgba(42, 168, 154, 0.12);
  border-color: rgba(42, 168, 154, 0.4);
}

.avatar-img-wrap {
  position: relative;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  transition: transform 0.2s ease;
}

.avatar-option:hover .avatar-img-wrap {
  transform: scale(1.06);
}

.avatar-option.active .avatar-img-wrap {
  box-shadow: 0 0 0 2px var(--primary, #2aa89a), 0 0 12px rgba(42, 168, 154, 0.35);
}

.avatar-img {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  display: block;
}

.avatar-check-badge {
  position: absolute;
  bottom: -2px;
  left: -2px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--primary, #2aa89a);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid #0f172a;
}

.avatar-name {
  font-size: 0.72rem;
  color: var(--muted, #91a0b4);
  text-align: center;
  line-height: 1.2;
}

.avatar-option.active .avatar-name {
  color: var(--text, #e8eef6);
  font-weight: 700;
}
</style>
