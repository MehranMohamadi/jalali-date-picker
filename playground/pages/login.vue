<script setup lang="ts">
import { Cloud, KeyRound, LogIn, LogOut, UserRoundPlus } from 'lucide-vue-next'

const router = useRouter()
const { pushToast } = useBudgetyar()
const auth = useAuth()
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
  if (!window.confirm('\u200Fحساب و همهٔ داده‌های ابری آن برای همیشه حذف شوند؟')) return
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
  <section class="account-wrap" dir="rtl">
    <div class="glass-panel account-card">
      <div class="account-heading">
        <Cloud :size="30" aria-hidden="true" />
        <div>
          <h1>‏حساب کاربری</h1>
          <p>‏داده‌های ابری هر حساب جداگانه ذخیره می‌شوند.</p>
        </div>
      </div>

      <p v-if="!isAuthInitialized" class="account-muted" role="status">‏در حال بررسی حساب…</p>
      <template v-else-if="currentUser">
        <div class="account-profile">
          <div class="profile-info-row">
            <div class="profile-avatar-wrap">
              <img :src="activeAvatar" :alt="currentUser.fullName" class="profile-avatar-img" width="56" height="56" />
            </div>
            <div class="profile-text">
              <strong>{{ currentUser.fullName }}</strong>
              <span dir="ltr">@{{ currentUser.username }}</span>
            </div>
          </div>
        </div>

        <!-- Avatar Selection Section for logged-in profile -->
        <AvatarSelector
          :model-value="activeAvatar"
          title="‏تغییر آواتار نمایه"
          subtitle="‏یکی از تصاویر پیش‌فرض زیر را برای حساب خود انتخاب کنید:"
          :show-preview="false"
          @update:model-value="handleAvatarChange"
        />

        <NuxtLink to="/settings" class="account-link">‏مدیریت داده‌های ابری در تنظیمات</NuxtLink>

        <form class="account-form" @submit.prevent="saveName">
          <h2>‏نام نمایشی</h2>
          <input v-model="editName" :placeholder="currentUser.fullName" autocomplete="name" maxlength="80" required />
          <button class="primary-button" type="submit" :disabled="busy">‏ذخیرهٔ نام</button>
        </form>

        <form class="account-form" @submit.prevent="savePassword">
          <h2>‏تغییر رمز عبور</h2>
          <input v-model="oldPassword" type="password" placeholder="‏رمز فعلی" autocomplete="current-password" required />
          <input v-model="newPassword" type="password" placeholder="‏رمز جدید، دست‌کم ۱۲ نویسه" autocomplete="new-password" minlength="12" required />
          <button class="primary-button" type="submit" :disabled="busy"><KeyRound :size="17" /> ‏تغییر رمز</button>
        </form>

        <button class="account-secondary" type="button" :disabled="busy" @click="signOut"><LogOut :size="17" /> ‏خروج از حساب</button>
        <details class="account-delete">
          <summary>‏حذف حساب و داده‌های ابری</summary>
          <form class="account-form" @submit.prevent="removeAccount">
            <p>‏این کار برگشت‌پذیر نیست. داده‌های همین دستگاه جداگانه باقی می‌مانند.</p>
            <input v-model="deletePassword" type="password" placeholder="‏رمز عبور برای تأیید" autocomplete="current-password" required />
            <button type="submit" :disabled="busy">‏حذف حساب</button>
          </form>
        </details>
      </template>

      <template v-else>
        <div class="account-tabs" role="tablist" aria-label="‏ورود یا ثبت‌نام">
          <button type="button" :aria-selected="tab === 'login'" @click="tab = 'login'; error = ''; message = ''">‏ورود</button>
          <button type="button" :aria-selected="tab === 'signup'" @click="tab = 'signup'; error = ''; message = ''">‏ثبت‌نام</button>
        </div>
        <form class="account-form" @submit.prevent="submitAuth">
          <!-- Avatar picker in signup -->
          <AvatarSelector
            v-if="tab === 'signup'"
            v-model="signupAvatar"
            title="‏انتخاب آواتار حساب"
            subtitle="‏تصویر نمایه مورد علاقه خود را انتخاب کنید:"
          />

          <label v-if="tab === 'signup'">‏نام نمایشی
            <input v-model="fullName" autocomplete="name" maxlength="80" placeholder="‏نام شما" />
          </label>
          <label>‏نام کاربری
            <input v-model="username" autocomplete="username" maxlength="40" minlength="3" pattern="[A-Za-z0-9_.-]+" dir="ltr" required />
          </label>
          <label>‏رمز عبور
            <input v-model="password" type="password" :autocomplete="tab === 'signup' ? 'new-password' : 'current-password'" :minlength="tab === 'signup' ? 12 : 1" required />
          </label>
          <label v-if="tab === 'signup'">‏تکرار رمز عبور
            <input v-model="confirmPassword" type="password" autocomplete="new-password" minlength="12" required />
          </label>
          <label v-if="tab === 'login'" class="account-check"><input v-model="remember" type="checkbox" /> ‏مرا به خاطر بسپار</label>
          <p v-if="tab === 'signup'" class="account-muted">‏رمز عبور دست‌کم ۱۲ نویسه باشد. برای حفظ دسترسی به حساب، آن را در جای امن نگه دارید.</p>
          <button class="primary-button" type="submit" :disabled="busy">
            <LogIn v-if="tab === 'login'" :size="18" /><UserRoundPlus v-else :size="18" />
            {{ busy ? '‏کمی صبر کنید…' : tab === 'login' ? '‏ورود' : '‏ساخت حساب' }}
          </button>
        </form>
      </template>
      <p v-if="error" class="account-error" role="alert">{{ error }}</p>
      <p v-if="message" class="account-success" role="status">{{ message }}</p>
    </div>
  </section>
</template>

<style scoped>
.account-wrap { display: grid; place-items: start center; padding: 16px; }
.account-card { width: min(100%, 500px); padding: 24px; }
.account-heading { display: flex; align-items: center; gap: 14px; margin-bottom: 22px; color: var(--text); }
.account-heading h1 { margin: 0 0 4px; font-size: 1.4rem; }
.account-heading p, .account-muted { margin: 0; color: var(--muted); font-size: .88rem; }
.account-tabs { display: flex; gap: 8px; margin-bottom: 20px; }
.account-tabs button { flex: 1; padding: 10px; border: 1px solid var(--line); border-radius: 10px; background: transparent; color: var(--text); cursor: pointer; }
.account-tabs button[aria-selected="true"] { border-color: var(--primary); background: rgba(42,168,154,.15); font-weight: 700; }
.account-form { display: grid; gap: 12px; margin: 18px 0; }
.account-form h2 { margin: 0; font-size: 1rem; }
.account-form label { display: grid; gap: 6px; color: var(--text); font-size: .88rem; }
.account-form input:not([type="checkbox"]) { width: 100%; padding: 11px 12px; border-radius: 10px; border: 1px solid var(--line); background: rgba(15,23,42,.55); color: var(--text); }
.account-form button, .account-secondary { display: inline-flex; justify-content: center; align-items: center; gap: 8px; padding: 10px 14px; border-radius: 10px; cursor: pointer; }
.account-form button:disabled, .account-secondary:disabled { opacity: .6; cursor: wait; }
.account-check { display: flex !important; align-items: center; }
.account-profile { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 14px; border: 1px solid var(--line); border-radius: 14px; background: rgba(15,23,42,.45); }
.profile-info-row { display: flex; align-items: center; gap: 14px; }
.profile-avatar-wrap {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  padding: 2px;
  background: linear-gradient(135deg, var(--primary, #2aa89a), #38bdf8);
  box-shadow: 0 4px 14px rgba(42,168,154,.25);
}
.profile-avatar-img { width: 100%; height: 100%; border-radius: 50%; display: block; background: #0f172a; }
.profile-text { display: flex; flex-direction: column; gap: 3px; }
.account-profile span { color: var(--muted); font-size: .85rem; }
.account-link { display: block; margin: 16px 0; color: var(--primary); }
.account-secondary { width: 100%; border: 1px solid var(--line); background: transparent; color: var(--text); }
.account-delete { margin-top: 18px; color: #fb7185; font-size: .85rem; }
.account-delete summary { cursor: pointer; }
.account-delete button { border: 0; background: #be123c; color: white; }
.account-delete p { margin: 0; color: var(--muted); }
.account-error, .account-success { margin: 12px 0 0; font-size: .88rem; }
.account-error { color: #fb7185; } .account-success { color: #4ade80; }
@media (max-width: 540px) { .account-wrap { padding: 8px; } .account-card { padding: 18px; } }
</style>
