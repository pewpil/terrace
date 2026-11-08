// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt(
  {
    rules: {
      'no-console': 'error',
      // Prettier writes void elements self-closed (<input />); keep the Vue
      // rule in agreement with the formatter instead of fighting it.
      'vue/html-self-closing': ['warn', { html: { void: 'always' } }],
    },
  },
  {
    // node-side scripts and configs may log (installer output, tooling)
    files: ['scripts/**/*.mjs'],
    rules: {
      'no-console': 'off',
    },
  },
)
