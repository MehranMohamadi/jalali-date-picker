export interface AuthUser {
  id: string
  username: string
  fullName: string
  createdAt: string
  lastLoginAt?: string
}

interface AuthResult {
  success: boolean
  message: string
}

const currentUser = ref<AuthUser | null>(null)
const isAuthInitialized = ref(false)
const isAuthWorking = ref(false)

function accountChanged() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('budgetyar-account-changed'))
}

async function requestAccount(body: Record<string, unknown>) {
  const response = await fetch('/api/account', {
    method: 'POST',
    credentials: 'same-origin',
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const result = await response.json() as { authenticated?: boolean, user?: AuthUser, error?: string }
  return { response, result }
}

function errorMessage(status: number, error?: string) {
  if (status === 409) return 'این نام کاربری قبلاً ثبت شده است.'
  if (status === 429) return 'تلاش‌های ناموفق زیاد بود. ۱۵ دقیقهٔ دیگر دوباره امتحان کنید.'
  if (status === 401) return error === 'session expired' ? 'نشست شما منقضی شده است.' : 'نام کاربری یا رمز عبور درست نیست.'
  if (status === 400) return 'اطلاعات واردشده معتبر نیست.'
  return 'ارتباط با سرور برقرار نشد. دوباره تلاش کنید.'
}

export function useAuth() {
  async function initAuth() {
    if (isAuthInitialized.value || isAuthWorking.value || typeof window === 'undefined') return
    isAuthWorking.value = true
    try {
      // Old browser-only accounts contained plain-text passwords. They are no longer trusted.
      localStorage.removeItem('budgetyar-users-v1')
      localStorage.removeItem('budgetyar-current-user-v1')
      sessionStorage.removeItem('budgetyar-session-user-v1')
      const response = await fetch('/api/account', { credentials: 'same-origin', cache: 'no-store' })
      const result = await response.json() as { authenticated?: boolean, user?: AuthUser }
      currentUser.value = response.ok && result.authenticated ? result.user ?? null : null
    } catch {
      currentUser.value = null
    } finally {
      isAuthWorking.value = false
      isAuthInitialized.value = true
    }
  }

  async function login(username: string, password: string, remember = true): Promise<AuthResult> {
    if (!username.trim() || !password) return { success: false, message: 'نام کاربری و رمز عبور را وارد کنید.' }
    isAuthWorking.value = true
    try {
      const { response, result } = await requestAccount({ action: 'login', username: username.trim(), password, remember })
      if (!response.ok || !result.user) return { success: false, message: errorMessage(response.status, result.error) }
      currentUser.value = result.user
      isAuthInitialized.value = true
      accountChanged()
      return { success: true, message: 'با موفقیت وارد شدید.' }
    } catch {
      return { success: false, message: 'ارتباط با سرور برقرار نشد.' }
    } finally {
      isAuthWorking.value = false
    }
  }

  async function register(username: string, password: string, fullName: string): Promise<AuthResult> {
    if (!/^[a-zA-Z0-9_.-]{3,40}$/.test(username.trim()) || [...password].length < 12 || new TextEncoder().encode(password).length > 256) {
      return { success: false, message: 'نام کاربری ۳ تا ۴۰ نویسهٔ انگلیسی و رمز عبور دست‌کم ۱۲ نویسه لازم است.' }
    }
    isAuthWorking.value = true
    try {
      const { response, result } = await requestAccount({ action: 'register', username: username.trim(), password, fullName: fullName.trim(), remember: true })
      if (!response.ok || !result.user) return { success: false, message: errorMessage(response.status, result.error) }
      currentUser.value = result.user
      isAuthInitialized.value = true
      accountChanged()
      return { success: true, message: 'حساب ساخته شد و وارد شدید.' }
    } catch {
      return { success: false, message: 'ارتباط با سرور برقرار نشد.' }
    } finally {
      isAuthWorking.value = false
    }
  }

  async function updateProfile(fullName: string): Promise<AuthResult> {
    if (!fullName.trim() || [...fullName.trim()].length > 80) return { success: false, message: 'نام نمایشی معتبر نیست.' }
    try {
      const { response, result } = await requestAccount({ action: 'profile', fullName: fullName.trim() })
      if (!response.ok || !result.user) return { success: false, message: errorMessage(response.status, result.error) }
      currentUser.value = result.user
      return { success: true, message: 'نام نمایشی ذخیره شد.' }
    } catch {
      return { success: false, message: 'ارتباط با سرور برقرار نشد.' }
    }
  }

  async function changePassword(oldPassword: string, newPassword: string): Promise<AuthResult> {
    if (!oldPassword || [...newPassword].length < 12 || new TextEncoder().encode(newPassword).length > 256 || oldPassword === newPassword) {
      return { success: false, message: 'رمز جدید باید متفاوت و دست‌کم ۱۲ نویسه باشد.' }
    }
    try {
      const { response, result } = await requestAccount({ action: 'password', oldPassword, password: newPassword })
      if (!response.ok) return { success: false, message: response.status === 401 ? 'رمز فعلی درست نیست.' : errorMessage(response.status, result.error) }
      return { success: true, message: 'رمز عبور تغییر کرد. نشست‌های دیگر بسته شدند.' }
    } catch {
      return { success: false, message: 'ارتباط با سرور برقرار نشد.' }
    }
  }

  async function deleteAccount(password: string): Promise<AuthResult> {
    if (!password) return { success: false, message: 'برای حذف حساب، رمز عبور را وارد کنید.' }
    try {
      const { response, result } = await requestAccount({ action: 'delete', password })
      if (!response.ok) return { success: false, message: response.status === 401 ? 'رمز عبور درست نیست.' : errorMessage(response.status, result.error) }
      currentUser.value = null
      accountChanged()
      return { success: true, message: 'حساب و داده‌های ابری آن حذف شدند.' }
    } catch {
      return { success: false, message: 'ارتباط با سرور برقرار نشد.' }
    }
  }

  async function logout(): Promise<AuthResult> {
    try {
      const { response, result } = await requestAccount({ action: 'logout' })
      if (!response.ok && response.status !== 401) return { success: false, message: errorMessage(response.status, result.error) }
      currentUser.value = null
      accountChanged()
      return { success: true, message: 'از حساب خارج شدید.' }
    } catch {
      return { success: false, message: 'ارتباط با سرور برقرار نشد.' }
    }
  }

  return {
    currentUser,
    isAuthenticated: computed(() => currentUser.value !== null),
    isAuthInitialized,
    isAuthWorking,
    initAuth,
    login,
    register,
    updateProfile,
    changePassword,
    deleteAccount,
    logout,
  }
}
