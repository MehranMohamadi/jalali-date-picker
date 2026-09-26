import { requestCloudApi } from './cloudApi'

export interface AuthUser {
  id: string
  username: string
  fullName: string
  createdAt: string
  lastLoginAt?: string
  avatar?: string
}

export interface AvatarOption {
  id: string
  title: string
  src: string
}

export const DEFAULT_AVATARS: AvatarOption[] = [
  { id: 'avatar-1', title: '\u200Fآرش', src: '/avatars/avatar-1.svg' },
  { id: 'avatar-2', title: '\u200Fسارا', src: '/avatars/avatar-2.svg' },
  { id: 'avatar-3', title: '\u200Fپویا', src: '/avatars/avatar-3.svg' },
  { id: 'avatar-4', title: '\u200Fمریم', src: '/avatars/avatar-4.svg' },
  { id: 'avatar-5', title: '\u200Fامید', src: '/avatars/avatar-5.svg' },
  { id: 'avatar-6', title: '\u200Fنیلوفر', src: '/avatars/avatar-6.svg' },
  { id: 'avatar-7', title: '\u200Fطلا', src: '/avatars/avatar-7.svg' },
  { id: 'avatar-8', title: '\u200Fالماس', src: '/avatars/avatar-8.svg' },
  { id: 'avatar-9', title: '\u200Fسپر', src: '/avatars/avatar-9.svg' },
  { id: 'avatar-10', title: '\u200Fرشد', src: '/avatars/avatar-10.svg' },
  { id: 'avatar-11', title: '\u200Fستاره', src: '/avatars/avatar-11.svg' },
]

interface AuthResult {
  success: boolean
  message: string
}

const currentUser = ref<AuthUser | null>(null)
const isAuthInitialized = ref(false)
const isAuthWorking = ref(false)
const activeAvatar = ref<string>(DEFAULT_AVATARS[0].src)
let authRevision = 0
let sessionRefresh: Promise<void> | null = null

function loadAvatarForUser(user: AuthUser | null) {
  if (typeof window === 'undefined') return
  if (!user) {
    activeAvatar.value = DEFAULT_AVATARS[0].src
    return
  }
  const key = `budgetyar-avatar-${user.id || user.username}`
  const saved = localStorage.getItem(key)
  activeAvatar.value = saved || DEFAULT_AVATARS[0].src
}

function accountChanged() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('budgetyar-account-changed'))
}

async function requestAccount(body: Record<string, unknown>) {
  const response = await requestCloudApi('/api/account', {
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
  if (status === 409) return '\u200Fاین نام کاربری قبلاً ثبت شده است.'
  if (status === 429) return '\u200Fتلاش‌های ناموفق زیاد بود. ۱۵ دقیقهٔ دیگر دوباره امتحان کنید.'
  if (status === 401) return error === 'session expired' ? '\u200Fنشست شما منقضی شده است.' : '\u200Fنام کاربری یا رمز عبور درست نیست.'
  if (status === 400) return '\u200Fاطلاعات واردشده معتبر نیست.'
  return '\u200Fارتباط با سرور برقرار نشد. دوباره تلاش کنید.'
}

export function useAuth() {
  async function refreshAuth() {
    if (sessionRefresh) return sessionRefresh
    const revision = authRevision
    sessionRefresh = (async () => {
      const response = await requestCloudApi('/api/account')
      const result = await response.json() as { authenticated?: boolean, user?: AuthUser, error?: string }
      if (revision !== authRevision) return
      if (!response.ok) throw new Error(result.error || '\u200Fارتباط با سرور برقرار نشد. دوباره تلاش کنید.')
      currentUser.value = result.authenticated && typeof result.user?.id === 'string' ? result.user : null
      loadAvatarForUser(currentUser.value)
      isAuthInitialized.value = true
    })().catch(error => {
      if (revision === authRevision) throw error
    }).finally(() => { sessionRefresh = null })
    return sessionRefresh
  }

  function setAvatar(avatarSrc: string, userId?: string) {
    activeAvatar.value = avatarSrc
    if (typeof window !== 'undefined') {
      const targetId = userId || currentUser.value?.id || currentUser.value?.username
      if (targetId) {
        localStorage.setItem(`budgetyar-avatar-${targetId}`, avatarSrc)
      } else {
        localStorage.setItem('budgetyar-avatar-temp', avatarSrc)
      }
    }
  }

  async function initAuth() {
    if (isAuthInitialized.value || isAuthWorking.value || typeof window === 'undefined') return
    isAuthWorking.value = true
    try {
      // Old browser-only accounts contained plain-text passwords. They are no longer trusted.
      localStorage.removeItem('budgetyar-users-v1')
      localStorage.removeItem('budgetyar-current-user-v1')
      sessionStorage.removeItem('budgetyar-session-user-v1')
      await refreshAuth()
    } catch {
      currentUser.value = null
      loadAvatarForUser(null)
    } finally {
      isAuthWorking.value = false
      isAuthInitialized.value = true
    }
  }

  async function login(username: string, password: string, remember = true): Promise<AuthResult> {
    if (!username.trim() || !password) return { success: false, message: '\u200Fنام کاربری و رمز عبور را وارد کنید.' }
    isAuthWorking.value = true
    try {
      const { response, result } = await requestAccount({ action: 'login', username: username.trim(), password, remember })
      if (!response.ok || !result.user) return { success: false, message: errorMessage(response.status, result.error) }
      authRevision++
      currentUser.value = result.user
      loadAvatarForUser(result.user)
      isAuthInitialized.value = true
      accountChanged()
      return { success: true, message: '\u200Fبا موفقیت وارد شدید.' }
    } catch {
      return { success: false, message: '\u200Fارتباط با سرور برقرار نشد.' }
    } finally {
      isAuthWorking.value = false
    }
  }

  async function register(username: string, password: string, fullName: string, chosenAvatar?: string): Promise<AuthResult> {
    if (!/^[a-zA-Z0-9_.-]{3,40}$/.test(username.trim()) || [...password].length < 12 || new TextEncoder().encode(password).length > 256) {
      return { success: false, message: '\u200Fنام کاربری ۳ تا ۴۰ نویسهٔ انگلیسی و رمز عبور دست‌کم ۱۲ نویسه لازم است.' }
    }
    isAuthWorking.value = true
    try {
      const { response, result } = await requestAccount({ action: 'register', username: username.trim(), password, fullName: fullName.trim(), remember: true })
      if (!response.ok || !result.user) return { success: false, message: errorMessage(response.status, result.error) }
      authRevision++
      currentUser.value = result.user
      if (chosenAvatar) {
        setAvatar(chosenAvatar, result.user.id || result.user.username)
      } else {
        loadAvatarForUser(result.user)
      }
      isAuthInitialized.value = true
      accountChanged()
      return { success: true, message: '\u200Fحساب ساخته شد و وارد شدید.' }
    } catch {
      return { success: false, message: '\u200Fارتباط با سرور برقرار نشد.' }
    } finally {
      isAuthWorking.value = false
    }
  }

  async function updateProfile(fullName: string): Promise<AuthResult> {
    if (!fullName.trim() || [...fullName.trim()].length > 80) return { success: false, message: '\u200Fنام نمایشی معتبر نیست.' }
    try {
      const { response, result } = await requestAccount({ action: 'profile', fullName: fullName.trim() })
      if (!response.ok || !result.user) return { success: false, message: errorMessage(response.status, result.error) }
      authRevision++
      currentUser.value = result.user
      return { success: true, message: '\u200Fنام نمایشی ذخیره شد.' }
    } catch {
      return { success: false, message: '\u200Fارتباط با سرور برقرار نشد.' }
    }
  }

  async function changePassword(oldPassword: string, newPassword: string): Promise<AuthResult> {
    if (!oldPassword || [...newPassword].length < 12 || new TextEncoder().encode(newPassword).length > 256 || oldPassword === newPassword) {
      return { success: false, message: '\u200Fرمز جدید باید متفاوت و دست‌کم ۱۲ نویسه باشد.' }
    }
    try {
      const { response, result } = await requestAccount({ action: 'password', oldPassword, password: newPassword })
      if (!response.ok) return { success: false, message: response.status === 401 ? '\u200Fرمز فعلی درست نیست.' : errorMessage(response.status, result.error) }
      return { success: true, message: '\u200Fرمز عبور تغییر کرد. نشست‌های دیگر بسته شدند.' }
    } catch {
      return { success: false, message: '\u200Fارتباط با سرور برقرار نشد.' }
    }
  }

  async function deleteAccount(password: string): Promise<AuthResult> {
    if (!password) return { success: false, message: '\u200Fبرای حذف حساب، رمز عبور را وارد کنید.' }
    try {
      const { response, result } = await requestAccount({ action: 'delete', password })
      if (!response.ok) return { success: false, message: response.status === 401 ? '\u200Fرمز عبور درست نیست.' : errorMessage(response.status, result.error) }
      authRevision++
      currentUser.value = null
      loadAvatarForUser(null)
      accountChanged()
      return { success: true, message: '\u200Fحساب و داده‌های ابری آن حذف شدند.' }
    } catch {
      return { success: false, message: '\u200Fارتباط با سرور برقرار نشد.' }
    }
  }

  async function logout(): Promise<AuthResult> {
    try {
      const { response, result } = await requestAccount({ action: 'logout' })
      if (!response.ok && response.status !== 401) return { success: false, message: errorMessage(response.status, result.error) }
      authRevision++
      currentUser.value = null
      loadAvatarForUser(null)
      accountChanged()
      return { success: true, message: '\u200Fاز حساب خارج شدید.' }
    } catch {
      return { success: false, message: '\u200Fارتباط با سرور برقرار نشد.' }
    }
  }

  return {
    currentUser,
    isAuthenticated: computed(() => currentUser.value !== null),
    isAuthInitialized,
    isAuthWorking,
    activeAvatar,
    DEFAULT_AVATARS,
    setAvatar,
    initAuth,
    refreshAuth,
    login,
    register,
    updateProfile,
    changePassword,
    deleteAccount,
    logout,
  }
}
