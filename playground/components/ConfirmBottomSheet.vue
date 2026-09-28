<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import {
  AlertOctagon,
  AlertTriangle,
  HelpCircle,
  RefreshCw,
  Trash2,
  X,
} from 'lucide-vue-next'

const {
  isOpen,
  state,
  registerUi,
  unregisterUi,
  onConfirm,
  onCancel,
} = useConfirm()

onMounted(() => {
  registerUi()
  if (typeof window !== 'undefined') {
    window.addEventListener('keydown', handleKeyDown)
  }
})

onBeforeUnmount(() => {
  unregisterUi()
  if (typeof window !== 'undefined') {
    window.removeEventListener('keydown', handleKeyDown)
  }
})

const confirmBtnRef = ref<HTMLButtonElement | null>(null)
const sheetRef = ref<HTMLDivElement | null>(null)

// Touch drag-to-dismiss support
const touchStartY = ref(0)
const touchCurrentY = ref(0)
const isDragging = ref(false)

const dragOffset = computed(() => {
  if (!isDragging.value) return 0
  const diff = touchCurrentY.value - touchStartY.value
  return diff > 0 ? diff : 0
})

function onTouchStart(e: TouchEvent) {
  if (!e.touches[0]) return
  touchStartY.value = e.touches[0].clientY
  touchCurrentY.value = e.touches[0].clientY
  isDragging.value = true
}

function onTouchMove(e: TouchEvent) {
  if (!isDragging.value || !e.touches[0]) return
  touchCurrentY.value = e.touches[0].clientY
}

function onTouchEnd() {
  if (!isDragging.value) return
  isDragging.value = false
  if (dragOffset.value > 85) {
    onCancel()
  }
}

watch(isOpen, (open) => {
  if (open) {
    nextTick(() => {
      confirmBtnRef.value?.focus()
    })
  }
})

function handleKeyDown(e: KeyboardEvent) {
  if (!isOpen.value) return
  if (e.key === 'Escape') {
    e.preventDefault()
    onCancel()
  } else if (e.key === 'Enter' && (e.target as HTMLElement)?.tagName !== 'BUTTON') {
    e.preventDefault()
    onConfirm()
  }
}

const iconComponent = computed(() => {
  if (state.value.icon === 'trash') return Trash2
  if (state.value.icon === 'refresh') return RefreshCw
  if (state.value.icon === 'info' || state.value.icon === 'question') return HelpCircle
  if (state.value.icon === 'warning') return AlertTriangle

  switch (state.value.tone) {
    case 'danger':
      return Trash2
    case 'warning':
      return AlertTriangle
    case 'info':
    case 'primary':
      return HelpCircle
    default:
      return AlertOctagon
  }
})
</script>

<template>
  <Teleport to="body">
    <Transition name="confirm-sheet">
      <div
        v-if="isOpen"
        class="confirm-sheet-backdrop"
        role="presentation"
        @click.self="onCancel"
      >
        <div
          ref="sheetRef"
          dir="rtl"
          class="confirm-sheet-panel"
          :class="`tone-${state.tone}`"
          :style="isDragging ? { transform: `translateY(${dragOffset}px)`, transition: 'none' } : undefined"
          role="alertdialog"
          aria-modal="true"
          :aria-labelledby="'confirm-dialog-title'"
          :aria-describedby="'confirm-dialog-desc'"
        >
          <!-- Drag Handle for Mobile -->
          <div
            class="confirm-sheet-handle-zone"
            @touchstart="onTouchStart"
            @touchmove="onTouchMove"
            @touchend="onTouchEnd"
          >
            <div class="confirm-sheet-handle" />
          </div>

          <button
            type="button"
            class="confirm-sheet-close"
            aria-label="‏بستن"
            @click="onCancel"
          >
            <X :size="18" aria-hidden="true" />
          </button>

          <div class="confirm-sheet-content">
            <div class="confirm-sheet-icon-wrapper" :class="`icon-${state.tone}`">
              <component :is="iconComponent" :size="28" aria-hidden="true" />
            </div>

            <div class="confirm-sheet-text">
              <h3 id="confirm-dialog-title" class="confirm-sheet-title">
                {{ state.title }}
              </h3>
              <p id="confirm-dialog-desc" class="confirm-sheet-desc">
                {{ state.message }}
              </p>
            </div>
          </div>

          <div class="confirm-sheet-actions">
            <button
              ref="confirmBtnRef"
              type="button"
              class="confirm-sheet-btn confirm-sheet-btn-action"
              :class="`btn-${state.tone}`"
              @click="onConfirm"
            >
              {{ state.confirmText }}
            </button>
            <button
              type="button"
              class="confirm-sheet-btn confirm-sheet-btn-cancel"
              @click="onCancel"
            >
              {{ state.cancelText }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.confirm-sheet-backdrop {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: rgba(2, 6, 23, 0.72);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: 0;
  overscroll-behavior: contain;
}

@media (min-width: 641px) {
  .confirm-sheet-backdrop {
    align-items: center;
    padding: 24px;
  }
}

.confirm-sheet-panel {
  position: relative;
  width: 100%;
  max-width: 460px;
  background: linear-gradient(165deg, rgba(17, 24, 39, 0.96), rgba(11, 17, 30, 0.98));
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 28px 28px 0 0;
  box-shadow: 0 -12px 40px rgba(0, 0, 0, 0.6), 0 0 24px rgba(0, 0, 0, 0.4);
  padding: 12px 20px 24px;
  box-sizing: border-box;
  color: #f1f5f9;
  font-family: inherit;
  user-select: none;
  touch-action: pan-y;
  transition: transform 0.22s cubic-bezier(0.16, 1, 0.3, 1);
}

@media (min-width: 641px) {
  .confirm-sheet-panel {
    border-radius: 24px;
    padding: 24px 24px 22px;
    box-shadow: 0 24px 50px rgba(0, 0, 0, 0.65), 0 0 0 1px rgba(255, 255, 255, 0.08);
  }
}

/* Grab handle */
.confirm-sheet-handle-zone {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 24px;
  margin-bottom: 4px;
  cursor: grab;
}

.confirm-sheet-handle {
  width: 44px;
  height: 5px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.22);
  transition: background 0.2s;
}

.confirm-sheet-handle-zone:active .confirm-sheet-handle {
  background: rgba(255, 255, 255, 0.4);
}

@media (min-width: 641px) {
  .confirm-sheet-handle-zone {
    display: none;
  }
}

/* Close icon */
.confirm-sheet-close {
  position: absolute;
  top: 16px;
  left: 16px;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.04);
  color: #94a3b8;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
}

.confirm-sheet-close:hover {
  background: rgba(255, 255, 255, 0.12);
  color: #f8fafc;
}

/* Content layout */
.confirm-sheet-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 14px;
  margin-top: 6px;
  margin-bottom: 20px;
}

@media (min-width: 641px) {
  .confirm-sheet-content {
    flex-direction: row;
    align-items: flex-start;
    text-align: right;
    gap: 16px;
    margin-top: 0;
  }
}

/* Glowing Icon Badge */
.confirm-sheet-icon-wrapper {
  flex-shrink: 0;
  width: 56px;
  height: 56px;
  border-radius: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.2s ease;
}

.icon-danger {
  background: radial-gradient(circle, rgba(239, 68, 68, 0.25) 0%, rgba(220, 38, 38, 0.1) 100%);
  color: #f87171;
  border: 1px solid rgba(239, 68, 68, 0.35);
  box-shadow: 0 0 20px rgba(239, 68, 68, 0.2);
}

.icon-warning {
  background: radial-gradient(circle, rgba(245, 158, 11, 0.25) 0%, rgba(217, 119, 6, 0.1) 100%);
  color: #fbbf24;
  border: 1px solid rgba(245, 158, 11, 0.35);
  box-shadow: 0 0 20px rgba(245, 158, 11, 0.2);
}

.icon-primary,
.icon-info {
  background: radial-gradient(circle, rgba(20, 184, 166, 0.25) 0%, rgba(13, 148, 136, 0.1) 100%);
  color: #2dd4bf;
  border: 1px solid rgba(20, 184, 166, 0.35);
  box-shadow: 0 0 20px rgba(20, 184, 166, 0.2);
}

/* Typography */
.confirm-sheet-text {
  flex: 1;
}

.confirm-sheet-title {
  margin: 0 0 6px 0;
  font-size: 1.15rem;
  font-weight: 700;
  color: #f8fafc;
  line-height: 1.4;
}

.confirm-sheet-desc {
  margin: 0;
  font-size: 0.92rem;
  line-height: 1.6;
  color: #cbd5e1;
  word-break: break-word;
}

/* Action Buttons */
.confirm-sheet-actions {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-top: 12px;
}

.confirm-sheet-btn {
  flex: 1;
  height: 44px;
  border-radius: 12px;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s cubic-bezier(0.2, 0.8, 0.2, 1);
  outline: none;
  font-family: inherit;
}

.confirm-sheet-btn:active {
  transform: scale(0.98);
}

/* Cancel Button */
.confirm-sheet-btn-cancel {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: #cbd5e1;
}

.confirm-sheet-btn-cancel:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #ffffff;
  border-color: rgba(255, 255, 255, 0.2);
}

/* Action Buttons By Tone */
.btn-danger {
  background: linear-gradient(135deg, #ef4444, #dc2626);
  border: 1px solid rgba(248, 113, 113, 0.4);
  color: #ffffff;
  box-shadow: 0 4px 14px rgba(220, 38, 38, 0.35);
}

.btn-danger:hover {
  background: linear-gradient(135deg, #dc2626, #b91c1c);
  box-shadow: 0 6px 18px rgba(220, 38, 38, 0.5);
}

.btn-warning {
  background: linear-gradient(135deg, #f59e0b, #d97706);
  border: 1px solid rgba(251, 191, 36, 0.4);
  color: #ffffff;
  box-shadow: 0 4px 14px rgba(217, 119, 6, 0.35);
}

.btn-warning:hover {
  background: linear-gradient(135deg, #d97706, #b45309);
  box-shadow: 0 6px 18px rgba(217, 119, 6, 0.5);
}

.btn-primary,
.btn-info {
  background: linear-gradient(135deg, #0d9488, #0f766e);
  border: 1px solid rgba(45, 212, 191, 0.4);
  color: #ffffff;
  box-shadow: 0 4px 14px rgba(13, 148, 136, 0.35);
}

.btn-primary:hover,
.btn-info:hover {
  background: linear-gradient(135deg, #0f766e, #115e59);
  box-shadow: 0 6px 18px rgba(13, 148, 136, 0.5);
}

/* Light Mode Overrides */
:global(body.budgetyar-light) .confirm-sheet-backdrop {
  background: rgba(15, 23, 42, 0.45);
}

:global(body.budgetyar-light) .confirm-sheet-panel {
  background: linear-gradient(165deg, #ffffff, #f8fafc);
  border-color: rgba(0, 0, 0, 0.1);
  color: #1e293b;
  box-shadow: 0 -12px 36px rgba(0, 0, 0, 0.15);
}

:global(body.budgetyar-light) .confirm-sheet-handle {
  background: rgba(0, 0, 0, 0.18);
}

:global(body.budgetyar-light) .confirm-sheet-title {
  color: #0f172a;
}

:global(body.budgetyar-light) .confirm-sheet-desc {
  color: #475569;
}

:global(body.budgetyar-light) .confirm-sheet-close {
  border-color: rgba(0, 0, 0, 0.08);
  background: rgba(0, 0, 0, 0.04);
  color: #64748b;
}

:global(body.budgetyar-light) .confirm-sheet-close:hover {
  background: rgba(0, 0, 0, 0.08);
  color: #0f172a;
}

:global(body.budgetyar-light) .confirm-sheet-btn-cancel {
  background: rgba(0, 0, 0, 0.04);
  border-color: rgba(0, 0, 0, 0.12);
  color: #334155;
}

:global(body.budgetyar-light) .confirm-sheet-btn-cancel:hover {
  background: rgba(0, 0, 0, 0.08);
  color: #0f172a;
}

/* Transitions */
.confirm-sheet-enter-active,
.confirm-sheet-leave-active {
  transition: opacity 0.22s ease;
}

.confirm-sheet-enter-active .confirm-sheet-panel,
.confirm-sheet-leave-active .confirm-sheet-panel {
  transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.22s ease;
}

.confirm-sheet-enter-from,
.confirm-sheet-leave-to {
  opacity: 0;
}

/* Mobile slide up */
@media (max-width: 640px) {
  .confirm-sheet-enter-from .confirm-sheet-panel,
  .confirm-sheet-leave-to .confirm-sheet-panel {
    transform: translateY(100%);
  }
}

/* Desktop scale / slight slide */
@media (min-width: 641px) {
  .confirm-sheet-enter-from .confirm-sheet-panel,
  .confirm-sheet-leave-to .confirm-sheet-panel {
    transform: scale(0.94) translateY(12px);
    opacity: 0;
  }
}
</style>
