<script setup lang="ts">
import { ArrowLeft, ChevronDown, Cloud, KeyRound, LogIn, LogOut, ShieldCheck, UserRound, UserRoundPlus } from 'lucide-vue-next'

const router = useRouter()
const { pushToast, askConfirm } = useBudgetyar()
const auth = useAuth()
const { billing, refreshBilling } = useBilling()
const {
  currentUser,
  isAuthInitialized,
  activeAvatar,
  setAvatar,
  initAuth,
  login,
  register,
  updateProfile,
  changePassword,
  deleteAccount,
  logout,
} = auth

const tab = ref<'login' | 'signup'>('login')
const username = ref('')
const password = ref('')
const remember = ref(true)
const fullName = ref('')
const confirmPassword = ref('')
const signupAvatar = ref('/avatars/avatar-1.svg')
const editName = ref('')
const oldPassword = ref('')
const newPassword = ref('')
const deletePassword = ref('')
const busy = ref(false)
const message = ref('')
const error = ref('')

onMounted(() => { void initAuth() })
watch(currentUser, user => { if (user) editName.value = user.fullName }, { immediate: true })
watch(currentUser, () => { void refreshBilling() }, { immediate: true })

async function submitAuth() {
  error.value = ''
  message.value = ''
  if (tab.value === 'signup' && password.value !== confirmPassword.value) {
    error.value = '\u200Fتکرار رمز عبور یکسان نیست.'
    return
  }
  busy.value = true
  const result = tab.value === 'login'
    ? await login(username.value, password.value, remember.value)
    : await register(username.value, password.value, fullName.value, signupAvatar.value)
  busy.value = false
  if (!result.success) { error.value = result.message; return }
  password.value = ''
  confirmPassword.value = ''
  pushToast(result.message)
  await router.push('/settings')
}

function handleAvatarChange(src: string) {
  setAvatar(src)
  pushToast('\u200Fآواتار نمایه به‌روزرسانی شد ✨')
}

async function saveName() {
  busy.value = true
  const result = await updateProfile(editName.value)
  busy.value = false
  if (result.success) message.value = result.message
  else error.value = result.message
}

async function savePassword() {
  busy.value = true
  const result = await changePassword(oldPassword.value, newPassword.value)
  busy.value = false
  if (result.success) {
    message.value = result.message
    oldPassword.value = ''
    newPassword.value = ''
  } else error.value = result.message
}

async function signOut() {
  busy.value = true
  const result = await logout()
  busy.value = false
  if (result.success) { message.value = result.message; pushToast(result.message) }
  else error.value = result.message
}

async function removeAccount() {
  const ok = await askConfirm({
    title: '‏حذف حساب کاربری',
    message: '‏حساب و همهٔ داده‌های ابری آن برای همیشه حذف شوند؟ این عملیات غیرقابل بازگشت است.',
    confirmText: '‏حذف حساب کاربری',
    cancelText: '‏انصراف',
    tone: 'danger',
    icon: 'trash',
  })
  if (!ok) return
  busy.value = true
  const result = await deleteAccount(deletePassword.value)
  busy.value = false
  if (result.success) {
    deletePassword.value = ''
    message.value = result.message
    pushToast(result.message)
  } else error.value = result.message
}
</script>

<template>
  <section class="auth-page" dir="rtl">
    <div class="auth-shell">
      <aside class="auth-story">
        <div class="auth-brand">
          <span class="auth-brand-mark"><Cloud :size="25" aria-hidden="true" /></span>
          <span>‏جیب‌طلا <small>‏حساب شخصی</small></span>
        </div>

        <div class="auth-story-copy">
          <span class="auth-eyebrow">‏فضای مالی خودت</span>
          <h1>‏همه‌چیز، زیر حساب خودت.</h1>
          <p>‏با حساب کاربری، داده‌های ابری‌ات به نام خودت نگهداری می‌شوند و از بخش تنظیمات می‌توانی آن‌ها را بارگذاری یا دریافت کنی.</p>
        </div>

        <div class="auth-story-notes">
          <div class="auth-story-note">
            <span><ShieldCheck :size="19" aria-hidden="true" /></span>
            <div><strong>‏حساب جداگانه</strong><small>‏داده‌های ابری هر حساب از حساب‌های دیگر جداست.</small></div>
          </div>
          <div class="auth-story-note">
            <span><Cloud :size="19" aria-hidden="true" /></span>
            <div><strong>‏انتقال با انتخاب تو</strong><small>‏بارگذاری و دریافت داده‌ها را در تنظیمات انجام بده.</small></div>
          </div>
        </div>
      </aside>

      <div class="auth-panel">
        <div v-if="!isAuthInitialized" class="auth-loading" role="status">
          <span class="auth-spinner" aria-hidden="true" />
          <strong>‏در حال بررسی حساب…</strong>
        </div>

        <template v-else-if="currentUser">
          <div class="auth-panel-heading">
            <span class="auth-kicker">‏حساب من</span>
            <h2>‏تنظیمات حساب</h2>
            <p>‏نام، تصویر و رمز عبور حساب خود را مدیریت کن.</p>
          </div>

          <div class="auth-identity">
            <img :src="activeAvatar" :alt="currentUser.fullName" width="64" height="64" />
            <div><strong>{{ currentUser.fullName }} <span v-if="billing?.plan === 'pro'" class="account-pro-badge">PRO</span></strong><span dir="ltr">@{{ currentUser.username }}</span></div>
          </div>

          <NuxtLink to="/settings" class="auth-settings-link">
            <span>‏مدیریت داده‌های ابری در تنظیمات</span>
            <ArrowLeft :size="17" aria-hidden="true" />
          </NuxtLink>

          <details class="auth-avatar-choice">
            <summary><span>‏تغییر تصویر پروفایل</span><ChevronDown :size="17" aria-hidden="true" /></summary>
            <AvatarSelector :model-value="activeAvatar" title="‏انتخاب تصویر" @update:model-value="handleAvatarChange" />
          </details>

          <div class="auth-profile-forms">
            <form class="auth-edit-card" @submit.prevent="saveName">
              <div class="auth-edit-head"><UserRound :size="18" aria-hidden="true" /><h3>‏نام نمایشی</h3></div>
              <label class="auth-field"><span>‏نام جدید</span><input v-model="editName" :placeholder="currentUser.fullName" autocomplete="name" maxlength="80" required /></label>
              <button class="auth-outline-button" type="submit" :disabled="busy">‏ذخیرهٔ نام</button>
            </form>

            <form class="auth-edit-card" @submit.prevent="savePassword">
              <div class="auth-edit-head"><KeyRound :size="18" aria-hidden="true" /><h3>‏تغییر رمز عبور</h3></div>
              <label class="auth-field"><span>‏رمز فعلی</span><input v-model="oldPassword" type="password" autocomplete="current-password" required /></label>
              <label class="auth-field"><span>‏رمز جدید</span><input v-model="newPassword" type="password" autocomplete="new-password" minlength="12" placeholder="‏دست‌کم ۱۲ نویسه" required /></label>
              <button class="auth-outline-button" type="submit" :disabled="busy">‏تغییر رمز</button>
            </form>
          </div>

          <button class="auth-signout" type="button" :disabled="busy" @click="signOut"><LogOut :size="17" aria-hidden="true" />‏خروج از حساب</button>

          <details class="auth-delete">
            <summary>‏حذف حساب و داده‌های ابری <ChevronDown :size="16" aria-hidden="true" /></summary>
            <form @submit.prevent="removeAccount">
              <p>‏این کار برگشت‌پذیر نیست. داده‌های همین دستگاه جداگانه باقی می‌مانند.</p>
              <label class="auth-field"><span>‏رمز عبور برای تأیید</span><input v-model="deletePassword" type="password" autocomplete="current-password" required /></label>
              <button type="submit" :disabled="busy">‏حذف حساب</button>
            </form>
          </details>
        </template>

        <template v-else>
          <div class="auth-panel-heading">
            <span class="auth-kicker">{{ tab === 'login' ? '‏خوش برگشتی' : '‏شروع کن' }}</span>
            <h2>{{ tab === 'login' ? '‏ورود به حساب' : '‏ساخت حساب تازه' }}</h2>
            <p>{{ tab === 'login' ? '‏نام کاربری و رمز عبورت را وارد کن.' : '‏چند قدم کوتاه تا ساخت حساب شخصی‌ات مانده است.' }}</p>
          </div>

          <div class="auth-tabs" role="tablist" aria-label="‏ورود یا ثبت‌نام">
            <button type="button" role="tab" :aria-selected="tab === 'login'" @click="tab = 'login'; error = ''; message = ''">‏ورود</button>
            <button type="button" role="tab" :aria-selected="tab === 'signup'" @click="tab = 'signup'; error = ''; message = ''">‏ثبت‌نام</button>
          </div>

          <form class="auth-form" @submit.prevent="submitAuth">
            <label v-if="tab === 'signup'" class="auth-field">
              <span>‏نام نمایشی <small>‏اختیاری</small></span>
              <input v-model="fullName" autocomplete="name" maxlength="80" placeholder="‏نامی که در برنامه نمایش داده می‌شود" />
            </label>
            <label class="auth-field">
              <span>‏نام کاربری</span>
              <input v-model="username" autocomplete="username" maxlength="40" minlength="3" pattern="[A-Za-z0-9_.-]+" dir="ltr" placeholder="username" required />
            </label>
            <label class="auth-field">
              <span>‏رمز عبور</span>
              <input v-model="password" type="password" :autocomplete="tab === 'signup' ? 'new-password' : 'current-password'" :minlength="tab === 'signup' ? 12 : 1" :placeholder="tab === 'signup' ? '‏دست‌کم ۱۲ نویسه' : '‏رمز عبور'" required />
            </label>
            <label v-if="tab === 'signup'" class="auth-field">
              <span>‏تکرار رمز عبور</span>
              <input v-model="confirmPassword" type="password" autocomplete="new-password" minlength="12" placeholder="‏رمز را دوباره وارد کن" required />
            </label>

            <label v-if="tab === 'login'" class="auth-remember"><input v-model="remember" type="checkbox" /><span>‏مرا به خاطر بسپار</span></label>
            <p v-else class="auth-hint">‏برای حفظ دسترسی به حساب، رمز عبورت را در جای امن نگه دار.</p>

            <details v-if="tab === 'signup'" class="auth-avatar-choice">
              <summary><span><img :src="signupAvatar" alt="" width="30" height="30" />‏انتخاب تصویر پروفایل <small>‏اختیاری</small></span><ChevronDown :size="17" aria-hidden="true" /></summary>
              <AvatarSelector v-model="signupAvatar" title="‏انتخاب تصویر" />
            </details>

            <button class="auth-submit" type="submit" :disabled="busy">
              <LogIn v-if="tab === 'login'" :size="19" aria-hidden="true" /><UserRoundPlus v-else :size="19" aria-hidden="true" />
              <span>{{ busy ? '‏کمی صبر کنید…' : tab === 'login' ? '‏ورود به حساب' : '‏ساخت حساب' }}</span>
              <ArrowLeft :size="18" aria-hidden="true" />
            </button>
          </form>
        </template>

        <p v-if="error" class="auth-feedback auth-feedback--error" role="alert">{{ error }}</p>
        <p v-if="message" class="auth-feedback auth-feedback--success" role="status">{{ message }}</p>
      </div>
    </div>
  </section>
</template>

<style scoped>
.auth-page {
  --auth-border: rgba(148, 163, 184, .18);
  --auth-surface: rgba(10, 21, 38, .94);
  --auth-field: rgba(8, 18, 34, .72);
  --auth-muted: #9eafc5;
  min-width: 0;
  padding: clamp(4px, 2vw, 24px);
}
.auth-shell { display: grid; grid-template-columns: minmax(0, .88fr) minmax(0, 1fr); gap: 18px; max-width: 1080px; margin: 0 auto; align-items: stretch; }
.auth-story, .auth-panel { border: 1px solid var(--auth-border); border-radius: 26px; min-width: 0; }
.auth-story { position: relative; display: flex; flex-direction: column; justify-content: space-between; gap: 38px; min-height: 590px; overflow: hidden; padding: clamp(24px, 3vw, 40px); background: radial-gradient(circle at 18% 82%, rgba(34, 211, 238, .25), transparent 36%), radial-gradient(circle at 85% 16%, rgba(45, 212, 191, .18), transparent 32%), linear-gradient(145deg, #10344a, #0b1e35 58%, #071525); box-shadow: 0 24px 60px rgba(2, 8, 23, .22); }
.auth-story::after { content: ''; position: absolute; width: 320px; height: 320px; left: -118px; top: 34%; border: 1px solid rgba(94, 234, 212, .14); border-radius: 50%; box-shadow: 0 0 0 65px rgba(94, 234, 212, .025), 0 0 0 130px rgba(94, 234, 212, .025); pointer-events: none; }
.auth-brand, .auth-story-copy, .auth-story-notes { position: relative; z-index: 1; }
.auth-brand { display: flex; align-items: center; gap: 11px; color: #f5fbff; font-size: 1.05rem; font-weight: 900; }
.auth-brand span:last-child { display: grid; gap: 1px; }
.auth-brand small { color: #a5d9dc; font-size: .7rem; font-weight: 500; }
.auth-brand-mark { display: grid; place-items: center; width: 44px; height: 44px; color: #ccfbf1; border: 1px solid rgba(94, 234, 212, .28); border-radius: 14px; background: rgba(94, 234, 212, .13); }
.auth-eyebrow, .auth-kicker { color: #5eead4; font-size: .76rem; font-weight: 800; letter-spacing: .02em; }
.auth-story-copy { max-width: 390px; }
.auth-story h1 { margin: 14px 0 16px; color: #fff; font-size: clamp(2rem, 3.2vw, 3.25rem); font-weight: 900; line-height: 1.35; letter-spacing: -.035em; }
.auth-story-copy p { max-width: 34ch; margin: 0; color: #bbd0df; font-size: .94rem; line-height: 2; }
.auth-story-notes { display: grid; gap: 10px; }
.auth-story-note { display: flex; align-items: center; gap: 12px; padding: 13px; border: 1px solid rgba(188, 224, 235, .12); border-radius: 15px; background: rgba(255, 255, 255, .055); backdrop-filter: blur(10px); }
.auth-story-note > span { display: grid; place-items: center; flex: 0 0 36px; height: 36px; color: #99f6e4; border-radius: 11px; background: rgba(94, 234, 212, .12); }
.auth-story-note div { display: grid; gap: 3px; }
.auth-story-note strong { color: #f0fdfa; font-size: .82rem; }
.auth-story-note small { color: #a9c1cf; font-size: .72rem; line-height: 1.55; }
.auth-panel { display: flex; flex-direction: column; justify-content: center; padding: clamp(24px, 3.3vw, 42px); background: var(--auth-surface); box-shadow: 0 24px 60px rgba(2, 8, 23, .2); }
.auth-panel-heading { margin-bottom: 24px; }
.auth-panel-heading h2 { margin: 6px 0 5px; color: var(--text); font-size: clamp(1.55rem, 2vw, 1.95rem); font-weight: 900; line-height: 1.5; }
.auth-panel-heading p { margin: 0; color: var(--auth-muted); font-size: .84rem; line-height: 1.8; }
.auth-tabs { display: grid; grid-template-columns: 1fr 1fr; gap: 5px; margin-bottom: 23px; padding: 5px; border: 1px solid var(--auth-border); border-radius: 14px; background: rgba(255, 255, 255, .035); }
.auth-tabs button { min-height: 42px; border: 0; border-radius: 10px; background: transparent; color: var(--auth-muted); cursor: pointer; font: inherit; font-size: .9rem; font-weight: 700; }
.auth-tabs button[aria-selected='true'] { color: #effffc; background: linear-gradient(135deg, rgba(20, 184, 166, .42), rgba(14, 116, 144, .32)); box-shadow: inset 0 0 0 1px rgba(94, 234, 212, .28), 0 6px 16px rgba(2, 8, 23, .13); }
.auth-form { display: grid; gap: 16px; }
.auth-field { display: grid; gap: 7px; color: var(--text); font-size: .82rem; font-weight: 700; }
.auth-field span small { color: var(--auth-muted); font-size: .72rem; font-weight: 500; }
.auth-field input { width: 100%; min-height: 48px; padding: 11px 14px; border: 1px solid var(--auth-border); border-radius: 12px; outline: 0; background: var(--auth-field); color: var(--text); font: inherit; font-size: .9rem; font-weight: 500; transition: border-color .18s ease, box-shadow .18s ease; }
.auth-field input::placeholder { color: #788ba4; }
.auth-field input:focus { border-color: #2dd4bf; box-shadow: 0 0 0 3px rgba(45, 212, 191, .13); }
.auth-field input[dir='ltr'] { text-align: left; }
.auth-remember { display: inline-flex; align-items: center; gap: 9px; width: fit-content; color: var(--auth-muted); cursor: pointer; font-size: .82rem; }
.auth-remember input { width: 17px; height: 17px; margin: 0; accent-color: #14b8a6; }
.auth-hint { margin: -4px 0 0; color: var(--auth-muted); font-size: .78rem; line-height: 1.8; }
.auth-submit { display: flex; align-items: center; justify-content: center; gap: 10px; width: 100%; min-height: 52px; margin-top: 4px; padding: 10px 17px; border: 0; border-radius: 13px; background: linear-gradient(110deg, #0d9488, #0f766e 60%, #155e75); box-shadow: 0 10px 22px rgba(13, 148, 136, .2); color: #fff; cursor: pointer; font: inherit; font-size: .95rem; font-weight: 800; }
.auth-submit span { flex: 1; }
.auth-submit:disabled, .auth-outline-button:disabled, .auth-signout:disabled, .auth-delete button:disabled { cursor: wait; opacity: .62; }
.auth-submit:hover:not(:disabled) { filter: brightness(1.08); }
.auth-avatar-choice { margin: 2px 0; overflow: hidden; border: 1px solid var(--auth-border); border-radius: 13px; }
.auth-avatar-choice summary, .auth-delete summary { display: flex; align-items: center; justify-content: space-between; gap: 10px; list-style: none; cursor: pointer; }
.auth-avatar-choice summary { min-height: 50px; padding: 8px 12px; color: var(--text); font-size: .82rem; font-weight: 700; }
.auth-avatar-choice summary::-webkit-details-marker, .auth-delete summary::-webkit-details-marker { display: none; }
.auth-avatar-choice summary > span { display: inline-flex; align-items: center; gap: 8px; }
.auth-avatar-choice summary img { flex: 0 0 auto; border-radius: 50%; }
.auth-avatar-choice summary small { color: var(--auth-muted); font-size: .72rem; font-weight: 500; }
.auth-avatar-choice summary > svg, .auth-delete summary > svg { flex: 0 0 auto; transition: transform .18s ease; }
.auth-avatar-choice[open] summary > svg, .auth-delete[open] summary > svg { transform: rotate(180deg); }
.auth-avatar-choice :deep(.avatar-selector) { margin: 0 10px 10px; border-radius: 11px; background: var(--auth-field); }
.auth-loading { display: grid; place-items: center; gap: 15px; min-height: 250px; color: var(--text); }
.auth-spinner { width: 33px; height: 33px; border: 3px solid rgba(94, 234, 212, .22); border-top-color: #5eead4; border-radius: 50%; animation: auth-spin .7s linear infinite; }
@keyframes auth-spin { to { transform: rotate(360deg); } }
.auth-feedback { margin: 16px 0 0; padding: 11px 13px; border-radius: 10px; font-size: .82rem; line-height: 1.7; }
.auth-feedback--error { border: 1px solid rgba(251, 113, 133, .3); background: rgba(190, 18, 60, .11); color: #fda4af; }
.auth-feedback--success { border: 1px solid rgba(74, 222, 128, .3); background: rgba(22, 101, 52, .15); color: #86efac; }
.auth-identity { display: flex; align-items: center; gap: 14px; margin-bottom: 12px; padding: 15px; border: 1px solid rgba(94, 234, 212, .24); border-radius: 16px; background: linear-gradient(110deg, rgba(20, 184, 166, .13), rgba(14, 116, 144, .09)); }
.auth-identity img { width: 64px; height: 64px; flex: 0 0 auto; border: 2px solid rgba(94, 234, 212, .45); border-radius: 50%; background: #0f172a; object-fit: cover; }
.auth-identity div { display: grid; gap: 3px; min-width: 0; }
.auth-identity strong { overflow: hidden; color: var(--text); font-size: 1rem; text-overflow: ellipsis; white-space: nowrap; }
.auth-identity span { color: var(--auth-muted); font-size: .8rem; text-align: right; }
.auth-settings-link { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 14px; padding: 11px 13px; border: 1px solid var(--auth-border); border-radius: 12px; color: #5eead4; font-size: .82rem; font-weight: 700; text-decoration: none; }
.auth-settings-link:hover { border-color: rgba(94, 234, 212, .45); }
.auth-profile-forms { display: grid; gap: 12px; margin-top: 16px; }
.auth-edit-card { display: grid; gap: 13px; padding: 16px; border: 1px solid var(--auth-border); border-radius: 15px; background: rgba(255, 255, 255, .025); }
.auth-edit-head { display: flex; align-items: center; gap: 9px; color: #5eead4; }
.auth-edit-head h3 { margin: 0; color: var(--text); font-size: .91rem; }
.auth-outline-button { min-height: 42px; padding: 9px 14px; border: 1px solid rgba(94, 234, 212, .35); border-radius: 10px; background: rgba(20, 184, 166, .12); color: #99f6e4; cursor: pointer; font: inherit; font-size: .82rem; font-weight: 700; }
.auth-signout { display: flex; align-items: center; justify-content: center; gap: 9px; min-height: 44px; margin-top: 16px; border: 1px solid var(--auth-border); border-radius: 11px; background: transparent; color: var(--text); cursor: pointer; font: inherit; font-size: .84rem; font-weight: 700; }
.auth-delete { margin-top: 18px; border-top: 1px solid var(--auth-border); color: #fda4af; }
.auth-delete summary { padding: 17px 0 5px; font-size: .8rem; font-weight: 700; }
.auth-delete form { display: grid; gap: 12px; padding-top: 12px; }
.auth-delete p { margin: 0; color: var(--auth-muted); font-size: .78rem; line-height: 1.8; }
.auth-delete button { min-height: 42px; border: 0; border-radius: 10px; background: #be123c; color: #fff; cursor: pointer; font: inherit; font-size: .82rem; font-weight: 800; }
body.budgetyar-light .auth-page { --auth-border: rgba(15, 23, 42, .13); --auth-surface: #fff; --auth-field: #f8fafc; --auth-muted: #56677e; }
body.budgetyar-light .auth-tabs { background: #f1f5f9; }
body.budgetyar-light .auth-tabs button[aria-selected='true'] { color: #075e56; background: #d5f5ed; }
body.budgetyar-light .auth-field input::placeholder { color: #64748b; }
body.budgetyar-light .auth-feedback--error { color: #be123c; }
body.budgetyar-light .auth-feedback--success { color: #166534; }
body.budgetyar-light .auth-settings-link, body.budgetyar-light .auth-edit-head { color: #0f766e; }
body.budgetyar-light .auth-outline-button { color: #0f766e; }
.account-pro-badge { border: 1px solid var(--primary); border-radius: 6px; color: var(--primary); display: inline-block; font-size: .62rem; font-weight: 800; line-height: 1; margin-inline-start: 4px; padding: 4px; vertical-align: middle; }
@media (max-width: 860px) {
  .auth-shell { grid-template-columns: 1fr; gap: 12px; max-width: 570px; }
  .auth-story { min-height: 0; gap: 20px; padding: 24px; }
  .auth-story h1 { margin: 9px 0; font-size: 1.75rem; }
  .auth-story-copy p { max-width: none; font-size: .83rem; line-height: 1.8; }
  .auth-story-notes { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .auth-story-note { align-items: flex-start; }
}
@media (max-width: 540px) {
  .auth-page { padding: 0; }
  .auth-shell { gap: 10px; }
  .auth-story, .auth-panel { border-radius: 19px; }
  .auth-story { gap: 13px; padding: 18px; }
  .auth-brand-mark { width: 39px; height: 39px; border-radius: 11px; }
  .auth-story h1 { font-size: 1.48rem; }
  .auth-story-copy p { font-size: .78rem; }
  .auth-story-notes { display: none; }
  .auth-panel { padding: 22px 18px 26px; }
  .auth-panel-heading { margin-bottom: 19px; }
  .auth-panel-heading h2 { font-size: 1.5rem; }
  .auth-tabs { margin-bottom: 18px; }
}
@media (prefers-reduced-motion: reduce) { .auth-spinner { animation-duration: 1.5s; } }
</style>
