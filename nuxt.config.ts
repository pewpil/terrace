export default defineNuxtConfig({
  compatibilityDate: '2026-11-04',
  devtools: { enabled: false },
  modules: ['@nuxt/eslint'],
  css: ['~/assets/css/main.css'],
  app: {
    head: {
      htmlAttrs: { lang: 'en' },
      title: 'terrace',
      meta: [
        {
          name: 'description',
          content: 'a typing trainer - coming to the browser',
        },
      ],
      link: [{ rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }],
    },
  },
})
