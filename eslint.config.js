import globals from "globals";

export default [
  {
    ignores: [
      "node_modules/**",
      "assets/**",
      "img/**",
      "*.min.js"
    ]
  },
  {
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.browser,
        ...globals.es2024
      }
    },
    rules: {
      "no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_"
        }
      ],
      "no-undef": "error"
    }
  }
];
