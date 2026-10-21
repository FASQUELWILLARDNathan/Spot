import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  compatibilityDate: '2026-10-21',

  modules: [
    '@vite-pwa/nuxt'
  ],

  css: ['~/assets/css/main.css'],

  vite: {
    plugins: [tailwindcss()]
  },

  pwa: {
    registerType: 'autoUpdate',

    manifest: {
      name: 'Spot - Workout Tracker',
      short_name: 'Spot',
      description: 'Suivi de musculation et records personnels',
      theme_color: '#0B1018',
      background_color: '#0B1018',
      display: 'standalone',
      start_url: '/',
      icons: [
        {
          src: '/icons/icon-192.png',
          sizes: '192x192',
          type: 'image/png'
        },
        {
          src: '/icons/icon-512.png',
          sizes: '512x512',
          type: 'image/png'
        }
      ]
    }
  }
})