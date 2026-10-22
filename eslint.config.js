// npm run lint
const js = require("@eslint/js");
const globals = require("globals");

const rules = {
  "no-unused-vars": ["error", { args: "none", caughtErrors: "none", ignoreRestSiblings: true }],
  "no-empty": ["error", { allowEmptyCatch: true }],
};

module.exports = [
  { ignores: ["node_modules/**", "js/vendor/**", "video/**", "images/**"] },
  js.configs.recommended,
  {
    files: ["api/**/*.js", "scripts/**/*.js", "test/**/*.js", "dev-server.js", "eslint.config.js"],
    languageOptions: { ecmaVersion: 2023, sourceType: "commonjs", globals: { ...globals.node } },
    rules,
  },
  {
    // the public site's scripts share a few globals between files (main.js defines them)
    files: ["js/**/*.js"],
    ignores: ["js/hero-gl.js"],
    languageOptions: {
      ecmaVersion: 2023, sourceType: "script",
      globals: { ...globals.browser, gsap: "readonly", ScrollTrigger: "readonly", Lenis: "readonly", MAYZA: "readonly", setLang: "readonly", refreshChrome: "readonly", toggleMenu: "readonly" },
    },
    rules: { ...rules, "no-redeclare": ["error", { builtinGlobals: false }], "no-unused-vars": ["error", { args: "none", caughtErrors: "none", ignoreRestSiblings: true, varsIgnorePattern: "^(refreshChrome|setLang|toggleMenu)$" }] },
  },
  {
    files: ["js/hero-gl.js"],
    languageOptions: { ecmaVersion: 2023, sourceType: "module", globals: { ...globals.browser } },
    rules,
  },
  {
    files: ["admin/**/*.js"],
    languageOptions: { ecmaVersion: 2023, sourceType: "module", globals: { ...globals.browser } },
    rules,
  },
];
