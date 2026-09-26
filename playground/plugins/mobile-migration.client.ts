import { Capacitor, registerPlugin } from '@capacitor/core'
import { migrateMobileStorage } from '../../src/utils/mobileMigration'

const updates = registerPlugin<{
  migration(): Promise<{ entries: Record<string, unknown>; completed: boolean }>
  completeMigration(): Promise<void>
}>('BudgetyarUpdates')

export default defineNuxtPlugin(async () => {
  if (!Capacitor.isNativePlatform() || !Capacitor.isPluginAvailable('BudgetyarUpdates') || location.hostname === 'localhost') return
  try {
    const migration = await updates.migration()
    if (migration.completed) return
    migrateMobileStorage(localStorage, migration.entries)
    await updates.completeMigration()
  } catch {
    throw createError({ statusCode: 503, fatal: true, statusMessage: '‏انتقال اطلاعات کامل نشد. برنامه را دوباره باز کنید؛ داده‌های اصلی روی دستگاه محفوظ‌اند.' })
  }
})
