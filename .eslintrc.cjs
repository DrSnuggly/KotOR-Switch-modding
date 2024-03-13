/* eslint-env node */
module.exports = {
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended-type-checked",
  ],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: "tsconfig.json",
  },
  plugins: ["@typescript-eslint", "unused-imports"],
  root: true,
  rules: {
    // bump down to warnings
    "unused-imports/no-unused-imports": "warn",
    "@typescript-eslint/consistent-type-assertions": "warn",
    "@typescript-eslint/consistent-type-imports": "warn",
    "@typescript-eslint/no-unused-vars": "warn",
    // turn off
    "@typescript-eslint/ban-ts-comment": "off", // needed in some cases
    "@typescript-eslint/no-explicit-any": "off", // needed in some cases
    "no-extra-semi": "off", // needed syntax in some cases
    "no-var": "off", // used for globals
  },
}
