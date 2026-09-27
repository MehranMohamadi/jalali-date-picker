<script setup lang="ts">
import { Check, ImagePlus } from 'lucide-vue-next'
import { DEFAULT_AVATARS, type AvatarOption } from '../composables/useAuth'
import { avatarCrop } from '../utils/avatarCrop'

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
  return DEFAULT_AVATARS.find((a) => a.src === props.modelValue)
    || { id: 'custom', title: '\u200Fعکس شخصی', src: props.modelValue }
})

const fileInput = ref<HTMLInputElement | null>(null)
const cropCanvas = ref<HTMLCanvasElement | null>(null)
const cropOpen = ref(false)
const loading = ref(false)
const imageError = ref('')
const zoom = ref(1)
const horizontal = ref(50)
const vertical = ref(50)
let cropImage: HTMLImageElement | null = null
let imageUrl = ''
let selectionRevision = 0

function cancelCrop() {
  selectionRevision++
  cropOpen.value = false
  loading.value = false
  cropImage = null
  if (imageUrl) URL.revokeObjectURL(imageUrl)
  imageUrl = ''
}

function drawCrop() {
  if (!cropImage || !cropCanvas.value) return
  const context = cropCanvas.value.getContext('2d')
  if (!context) throw new Error('Canvas unavailable')
  const { x, y, size } = avatarCrop(cropImage.naturalWidth, cropImage.naturalHeight, zoom.value, horizontal.value, vertical.value)
  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, 256, 256)
  context.drawImage(cropImage, x, y, size, size, 0, 0, 256, 256)
}

async function choosePhoto(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  cancelCrop()
  imageError.value = ''
  if (!/^image\/(jpeg|png|webp|gif|avif)$/.test(file.type) || file.size > 10 * 1024 * 1024) {
    imageError.value = '\u200Fعکس JPG، PNG یا WebP با حجم حداکثر ۱۰ مگابایت انتخاب کنید.'
    return
  }
  loading.value = true
  const revision = selectionRevision
  const image = new Image()
  imageUrl = URL.createObjectURL(file)
  try {
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve()
      image.onerror = () => reject(new Error('Invalid image'))
      image.src = imageUrl
    })
    if (revision !== selectionRevision) return
    cropImage = image
    zoom.value = 1
    horizontal.value = 50
    vertical.value = 50
    cropOpen.value = true
    await nextTick()
    drawCrop()
  } catch {
    if (revision !== selectionRevision) return
    cancelCrop()
    imageError.value = '\u200Fاین عکس قابل باز شدن نیست. عکس دیگری انتخاب کنید.'
  } finally {
    if (revision === selectionRevision) loading.value = false
  }
}

function saveCrop() {
  try {
    drawCrop()
    if (!cropCanvas.value || !cropImage) return
    const src = cropCanvas.value.toDataURL('image/jpeg', 0.85)
    emit('update:modelValue', src)
    emit('change', { id: 'custom', title: '\u200Fعکس شخصی', src })
    cancelCrop()
  } catch {
    imageError.value = '\u200Fآماده‌سازی عکس انجام نشد. دوباره تلاش کنید.'
  }
}

watch([zoom, horizontal, vertical], () => {
  if (cropOpen.value) drawCrop()
})
onBeforeUnmount(cancelCrop)

function selectAvatar(avatar: AvatarOption) {
  cancelCrop()
  imageError.value = ''
  emit('update:modelValue', avatar.src)
  emit('change', avatar)
}
</script>

<template>
  <div class="avatar-selector" dir="rtl">
    <div v-if="title" class="avatar-selector-head">
      <span class="avatar-title">{{ title }}</span>
    </div>

    <input ref="fileInput" class="avatar-file-input" type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif" aria-label="‏انتخاب عکس از گالری" @change="choosePhoto" />
    <button type="button" class="avatar-gallery-button" :disabled="loading" @click="fileInput?.click()">
      <ImagePlus :size="18" aria-hidden="true" />
      <span>{{ loading ? '\u200Fدر حال آماده‌سازی عکس…' : '\u200Fانتخاب از گالری' }}</span>
    </button>
    <p v-if="imageError" class="avatar-image-error" role="alert">{{ imageError }}</p>
    <div v-if="cropOpen" class="avatar-crop" @keydown.esc.stop="cancelCrop">
      <span class="avatar-title">‏برش عکس</span>
      <canvas ref="cropCanvas" class="avatar-crop-preview" width="256" height="256" role="img" aria-label="‏پیش‌نمایش برش آواتار" />
      <label class="avatar-crop-control">‏بزرگ‌نمایی<input v-model.number="zoom" type="range" min="1" max="4" step="0.01" /></label>
      <label class="avatar-crop-control">‏جابه‌جایی افقی<input v-model.number="horizontal" type="range" min="0" max="100" step="1" /></label>
      <label class="avatar-crop-control">‏جابه‌جایی عمودی<input v-model.number="vertical" type="range" min="0" max="100" step="1" /></label>
      <div class="avatar-crop-actions">
        <button type="button" class="avatar-gallery-button" @click="saveCrop">‏تأیید برش</button>
        <button type="button" class="avatar-gallery-button" @click="cancelCrop">‏انصراف</button>
      </div>
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

.avatar-file-input { display: none; }
.avatar-gallery-button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 42px;
  padding: 8px 12px;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: var(--panel-soft);
  color: var(--text);
  cursor: pointer;
}
.avatar-gallery-button:disabled { opacity: 0.6; cursor: wait; }
.avatar-image-error { margin: 0; color: var(--danger, #f87171); font-size: 0.85rem; }
.avatar-crop { display: flex; flex-direction: column; gap: 12px; min-width: 0; }
.avatar-crop-preview {
  display: block;
  width: min(100%, 256px);
  height: auto;
  aspect-ratio: 1;
  align-self: center;
  border-radius: 50%;
  border: 2px solid var(--primary);
}
.avatar-crop-control { display: flex; flex-direction: column; gap: 6px; font-size: 0.85rem; }
.avatar-crop-control input { width: 100%; margin: 0; direction: ltr; accent-color: var(--primary); }
.avatar-crop-actions { display: flex; gap: 8px; }
.avatar-crop-actions button { flex: 1; }

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
