export default defineNuxtConfig({
  runtimeConfig: {
    public: {
      brsApiKey: process.env.NUXT_PUBLIC_BRS_API_KEY || process.env.BRS_API_KEY || '',
    },
  },
  compatibilityDate: '2026-06-28',
  experimental: {
    appManifest: false,
  },
  modules: ['@nuxtjs/tailwindcss', '../src/module'],
  app: {
    head: {
      htmlAttrs: {
        lang: 'fa',
        dir: 'rtl',
      },
      title: 'پولدار | مدیریت هوشمند دخل‌وخرج',
      meta: [
        { name: 'theme-color', content: '#050816' },
        { name: 'mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-title', content: 'پولدار' },
        { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' },
        { name: 'description', content: 'داشبورد فارسی مدیریت دخل‌وخرج، هدف‌های مالی و پس‌انداز با رویکرد آفلاین‌فرست' },
      ],
      link: [
        { rel: 'manifest', href: '/manifest.webmanifest' },
        { rel: 'icon', type: 'image/png', sizes: '192x192', href: '/icons/icon-192.png' },
        { rel: 'apple-touch-icon', href: '/icons/icon-192.png' },
      ],
    },
  },
  tailwindcss: {
    configPath: '../tailwind.config.ts',
    viewer: false,
  },
  devtools: { enabled: true },
})
