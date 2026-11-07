<script setup lang="ts">
import { requestCloudApi } from '../composables/cloudApi'

interface Token { id: string, name: string, canWrite: boolean, expiresAt: string }
const { currentUser } = useAuth()
const tokens = ref<Token[]>([])
const secret = ref('')
const name = ref('Codex')
const canWrite = ref(false)
const expiresDays = ref(30)
const busy = ref(false)
const message = ref('')
let revision = 0

async function run(action: string, extra: Record<string, unknown> = {}) {
  const accountRevision = revision
  busy.value = true
  message.value = ''
  try {
    const response = await requestCloudApi('/api/account', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...extra }),
    })
    const result = await response.json() as { tokens?: Token[], token?: Token, secret?: string }
    if (accountRevision !== revision) return
    if (!response.ok) throw new Error()
    if (result.tokens) tokens.value = result.tokens
    if (result.token && result.secret) {
      secret.value = result.secret
      tokens.value.unshift(result.token)
      message.value = '\u200Fکلید فقط همین بار نمایش داده می‌شود؛ آن را کپی کنید.'
    }
    if (action === 'mcp_token_revoke') {
      tokens.value = tokens.value.filter(token => token.id !== extra.tokenId)
      secret.value = ''
      message.value = '\u200Fدسترسی کلید لغو شد.'
    }
  } catch {
    if (accountRevision === revision) message.value = '\u200Fعملیات انجام نشد؛ اتصال حساب و به‌روز بودن سرور را بررسی کنید.'
  } finally {
    if (accountRevision === revision) busy.value = false
  }
}

watch(() => currentUser.value?.id, () => {
  revision++
  secret.value = ''
  tokens.value = []
  message.value = ''
  busy.value = false
  if (currentUser.value) void run('mcp_tokens_list')
}, { immediate: true })
onBeforeUnmount(() => { revision++; secret.value = '' })

async function copySecret() {
  try {
    await navigator.clipboard.writeText(secret.value)
    message.value = '\u200Fکلید کپی شد.'
  } catch {
    message.value = '\u200Fکپی خودکار ممکن نشد؛ کلید را دستی کپی کنید.'
  }
}
</script>

<template>
  <section class="mcp-panel glass-panel">
    <div><h2>‏اتصال به Codex</h2><p>‏خواندن اطلاعات مالی ابری و ویرایش با دسترسی انتخابی.</p></div>
    <NuxtLink v-if="!currentUser" to="/login" class="soft-button">‏ورود به حساب</NuxtLink>
    <template v-else>
      <p>‏ابتدا اطلاعات دستگاه را به فضای ابری ارسال کنید. کلید خواندن، کل JSON مالی را در اختیار ایجنت می‌گذارد؛ با اجازهٔ ویرایش، بودجه‌ها، دسته‌ها و تراکنش‌ها هم تغییر می‌کنند.</p>
      <form class="mcp-form" @submit.prevent="run('mcp_token_create', { tokenName: name, canWrite, expiresDays })">
        <label>‏نام اتصال<input v-model="name" required maxlength="80" :disabled="busy" /></label>
        <label>‏اعتبار<select v-model.number="expiresDays" :disabled="busy"><option :value="7">‏۷ روز</option><option :value="30">‏۳۰ روز</option><option :value="90">‏۹۰ روز</option></select></label>
        <label class="mcp-permission"><input v-model="canWrite" type="checkbox" :disabled="busy" />‏اجازهٔ ویرایش اطلاعات</label>
        <button type="submit" class="primary-button" :disabled="busy || !name.trim()">‏ساخت کلید اتصال</button>
      </form>
      <div v-if="secret" class="mcp-secret">
        <label for="mcp-new-secret">‏کلید اتصال</label>
        <textarea id="mcp-new-secret" :value="secret" readonly dir="ltr" rows="2" spellcheck="false" autocomplete="off" />
        <div class="mcp-actions"><button class="soft-button" type="button" @click="copySecret">‏کپی کلید</button><button class="soft-button" type="button" @click="secret = ''">‏بستن نمایش کلید</button></div>
      </div>
      <p v-if="message" role="status">{{ message }}</p>
      <ul v-if="tokens.length" class="mcp-list">
        <li v-for="token in tokens" :key="token.id">
          <span>{{ token.name }} · {{ token.canWrite ? '‏خواندن و ویرایش' : '‏فقط خواندن' }}<small>‏انقضا: {{ new Intl.DateTimeFormat('fa-IR', { dateStyle: 'medium' }).format(new Date(token.expiresAt)) }}</small></span>
          <button type="button" class="soft-button" :disabled="busy" :aria-label="'\u200Fلغو دسترسی ' + token.name" @click="run('mcp_token_revoke', { tokenId: token.id })">‏لغو دسترسی</button>
        </li>
      </ul>
      <button class="soft-button" type="button" :disabled="busy" @click="run('mcp_tokens_list')">‏تازه‌سازی اتصال‌ها</button>
      <p>‏پس از ویرایش با Codex، «دریافت اطلاعات ابری» را بزنید. اگر دستگاه تغییر ذخیره‌نشده دارد، ابتدا فایل پشتیبان بگیرید.</p>
    </template>
  </section>
</template>

<style scoped>
.mcp-panel { grid-column: 1 / -1; display: grid; gap: 14px; padding: 18px; min-width: 0; }
h2 { font-size: 1rem; margin: 0 0 4px; }
p, small { color: var(--muted); font-size: .82rem; line-height: 1.8; margin: 0; }
.mcp-form { display: flex; align-items: end; flex-wrap: wrap; gap: 12px; }
label { display: grid; gap: 6px; font-size: .85rem; }
input:not([type=checkbox]), select, textarea { background: var(--panel-soft); color: var(--text); border: 1px solid var(--line); border-radius: 8px; padding: 9px; max-width: 100%; min-width: 0; }
.mcp-permission { display: flex; align-items: center; align-self: center; }
.mcp-secret { display: grid; gap: 8px; min-width: 0; }
textarea { width: 100%; overflow-wrap: anywhere; }
.mcp-actions { display: flex; flex-wrap: wrap; gap: 8px; }
.mcp-list { list-style: none; margin: 0; padding: 0; display: grid; gap: 10px; }
li { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; border-top: 1px solid var(--line); padding-top: 10px; }
li span { overflow-wrap: anywhere; min-width: 0; } small { display: block; }
button { min-height: 42px; }
</style>
