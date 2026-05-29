import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = [
  {
    ignores: [
      ".next/**",
      ".next-stale-*/**",
      "coverage/**",
      "dist/**",
      "node_modules/**",
      "out/**",
      "playwright-report/**",
      "test-results/**"
    ]
  },
  ...nextVitals,
  ...nextTs
];

export default eslintConfig;
