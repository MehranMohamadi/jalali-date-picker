import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'ir.budgetyar.app',
  appName: 'Budgetyar',
  webDir: 'playground/.output/public',
  server: {
    androidScheme: 'https',
  },
}

export default config
