<script setup lang="ts">
import { Check } from 'lucide-vue-next'
import { DEFAULT_AVATARS, type AvatarOption } from '../composables/useAuth'

const props = withDefaults(
  defineProps<{
    modelValue?: string
    title?: string
    showPreview?: boolean
  }>(),
  {
    modelValue: '/avatars/avatar-1.svg',
    title: '\u200Fانتخاب آواتار',
    showPreview: false,
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
    <div v-if="title" class="avatar-selector-head">
      <span class="avatar-title">{{ title }}</span>
    </div>

    <!-- Active Preview (Optional) -->
    <div v-if="showPreview" class="avatar-preview-box">
      <div class="avatar-preview-ring">
        <img :src="selected.src" alt="‏آواتار انتخابی" class="avatar-preview-img" width="56" height="56" />
      </div>
    </div>

    <!-- Clean Avatars Grid (Pure icons, no names or descriptions) -->
    <div class="avatar-grid" role="radiogroup" aria-label="‏انتخاب آواتار">
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
          <img :src="item.src" alt="‏آواتار" class="avatar-img" width="52" height="52" loading="lazy" />
          <span v-if="modelValue === item.src" class="avatar-check-badge">
            <Check :size="11" stroke-width="3" />
          </span>
        </div>
      </button>
    </div>
  </div>
</template>

<style scoped>
.avatar-selector {
  display: flex;
  flex-direction: column;
  gap: 10px;
  background: rgba(15, 23, 42, 0.45);
  border: 1px solid var(--line, rgba(148, 163, 184, 0.16));
  border-radius: 14px;
  padding: 14px;
  margin: 8px 0;
}

.avatar-selector-head {
  display: flex;
  align-items: center;
}

.avatar-title {
  font-size: 0.88rem;
  font-weight: 700;
  color: var(--text, #e8eef6);
}

.avatar-preview-box {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 6px 0;
}

.avatar-preview-ring {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  padding: 2px;
  background: linear-gradient(135deg, var(--primary, #2aa89a), #38bdf8);
  box-shadow: 0 0 14px rgba(42, 168, 154, 0.25);
}

.avatar-preview-img {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  display: block;
  background: #0f172a;
}

.avatar-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(52px, 1fr));
  gap: 8px;
  justify-items: center;
}

.avatar-option {
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  padding: 4px;
  border-radius: 50%;
  cursor: pointer;
  transition: transform 0.18s ease;
}

.avatar-option:hover {
  transform: translateY(-2px);
}

.avatar-img-wrap {
  position: relative;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  transition: all 0.2s ease;
}

.avatar-option:hover .avatar-img-wrap {
  box-shadow: 0 0 0 2px rgba(42, 168, 154, 0.4);
}

.avatar-option.active .avatar-img-wrap {
  box-shadow: 0 0 0 2.5px var(--primary, #2aa89a), 0 0 12px rgba(42, 168, 154, 0.4);
  transform: scale(1.05);
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
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--primary, #2aa89a);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid #0f172a;
}
</style>
