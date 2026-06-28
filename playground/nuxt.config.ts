export default defineNuxtConfig({
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
      title: 'بودجه‌یار | مدیریت بودجه شخصی',
      meta: [
        { name: 'theme-color', content: '#050816' },
        { name: 'mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-title', content: 'بودجه‌یار' },
        { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' },
        { name: 'description', content: 'داشبورد فارسی مدیریت بودجه ماهانه با رویکرد موبایل‌فرست و آفلاین‌فرست' },
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
