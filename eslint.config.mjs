// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt(
  {
    rules: {
      'no-console': 'error',
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
