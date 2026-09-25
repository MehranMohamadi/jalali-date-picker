import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'ir.budgetyar.app',
  appName: 'جیب‌طلا',
  webDir: 'playground/.output/public',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    BudgetyarApi: {
      baseUrl: process.env.BUDGETYAR_MOBILE_API_URL || 'https://date-one-roan.vercel.app',
    },
  },
}

export default config
