import type { CapacitorConfig } from '@capacitor/cli'

const mobileOrigin = new URL(process.env.BUDGETYAR_MOBILE_API_URL || 'https://date-one-roan.vercel.app')
if (mobileOrigin.protocol !== 'https:' || mobileOrigin.username || mobileOrigin.password || mobileOrigin.pathname !== '/' || mobileOrigin.search || mobileOrigin.hash) {
  throw new Error('BUDGETYAR_MOBILE_API_URL must be an HTTPS origin')
}

const config: CapacitorConfig = {
  appId: 'ir.budgetyar.app',
  appName: 'جیب‌طلا',
  webDir: 'mobile/dist',
  server: {
    androidScheme: 'https',
    allowNavigation: [mobileOrigin.host],
    errorPath: 'error.html',
  },
  android: { appendUserAgent: ' BudgetyarAndroid/2' },
  plugins: {
    BudgetyarApi: {
      baseUrl: mobileOrigin.origin,
    },
  },
}

export default config
