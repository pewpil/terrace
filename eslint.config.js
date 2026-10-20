import prettier from "eslint-plugin-prettier"
import tseslint from "typescript-eslint"

export default tseslint.config(
  ...tseslint.configs.recommended,
  {
    plugins: { prettier },
    rules: {
      "prettier/prettier": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "no-console": "error",
    },
  },
  {
    ignores: ["dist/", "node_modules/"],
  },
)
