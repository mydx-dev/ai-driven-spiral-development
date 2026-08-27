import sonarjs from "eslint-plugin-sonarjs";
import tseslint from "typescript-eslint";

export const createEslintConfig = (quality) =>
  tseslint.config(
    {
      ignores: [
        "node_modules/**",
        "dist/**",
        "coverage/**",
        "**/*.spec.ts",
        "**/*.test.ts",
      ],
      linterOptions: {
        noInlineConfig: true,
        reportUnusedDisableDirectives: "error",
      },
    },
    ...tseslint.configs.recommended,
    {
      files: ["**/*.ts", "**/*.tsx"],
      plugins: {
        sonarjs,
      },
      rules: {
        "class-methods-use-this": "off",
        complexity: ["error", quality.complexity.cyclomatic],
        "sonarjs/cognitive-complexity": [
          "error",
          quality.complexity.cognitive,
        ],
        "@typescript-eslint/class-methods-use-this": "off",
        "@typescript-eslint/no-unused-vars": [
          "error",
          {
            argsIgnorePattern: "^_",
            varsIgnorePattern: "^_",
          },
        ],
        "no-restricted-syntax": [
          "error",
          {
            selector: "MethodDefinition[accessibility='private']",
            message:
              "private method is prohibited by the responsibility-boundary policy.",
          },
          {
            selector: "MethodDefinition[accessibility='protected']",
            message:
              "protected method is prohibited by the responsibility-boundary policy.",
          },
          {
            selector: "MethodDefinition[key.type='PrivateIdentifier']",
            message:
              "ECMAScript private method is prohibited by the responsibility-boundary policy. Private fields are allowed.",
          },
        ],
      },
    },
  );
