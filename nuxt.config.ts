export default defineNuxtConfig({
  compatibilityDate: '2026-11-04',
  // Opt into Nuxt 5 behavior while still on Nuxt 4.6.x. Nuxt 5 is not on npm
  // yet; this is the official migration-prep path from the upgrade guide.
  future: {
    compatibilityVersion: 5,
  },
  // terrace's own port; port 3000 is reserved for something else on this machine
  devServer: {
    port: 4000,
  },
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
