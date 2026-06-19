export default defineNuxtConfig({
  modules: ['@nuxtjs/tailwindcss', '../src/module'],
  tailwindcss: {
    configPath: '../tailwind.config.ts',
    viewer: false,
  },
  devtools: { enabled: true },
})
