import ts from "@babel/preset-typescript"
import moduleResolver from "babel-plugin-module-resolver"
import solid from "babel-preset-solid"

export default {
  presets: [
    [
      solid,
      { moduleName: "@opentui/solid", generate: "universal" },
    ],
    [ts],
  ],
  plugins: [
    [
      moduleResolver,
      {
        resolvePath(specifier) {
          if (specifier === "solid-js") return "solid-js/dist/solid.js"
          if (specifier === "solid-js/store")
            return "solid-js/store/dist/store.js"
          // Relative imports get explicit .js extension for Node ESM
          if (specifier.startsWith(".")) {
            return `${specifier}.js`
          }
          return specifier
        },
      },
    ],
  ],
}
