import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { ESLint } from "eslint";
import { Project } from "ts-morph";
import { describe, expect, it } from "vitest";
import {
  analyzeSourceFiles,
  createEslintConfig,
  mergeQualityConfig,
  QualityToolError,
  runQualityGuard,
} from "./src/index.mjs";

const quality = mergeQualityConfig();
const packageRoot = dirname(fileURLToPath(import.meta.url));

const analyze = (source, configuredQuality = quality, filePath = "src/example.ts") => {
  const project = new Project({ useInMemoryFileSystem: true });
  const file = project.createSourceFile(filePath, source);
  return analyzeSourceFiles([file], configuredQuality, "/");
};

const temporaryProject = () => {
  const cwd = mkdtempSync(join(tmpdir(), "spiral-quality-test-"));
  mkdirSync(join(cwd, "src"), { recursive: true });
  writeFileSync(
    join(cwd, "tsconfig.json"),
    JSON.stringify({ compilerOptions: { target: "ES2022", module: "ESNext" } }),
  );
  writeFileSync(
    join(cwd, "package.json"),
    JSON.stringify({ name: "quality-fixture", type: "module", private: true }),
  );
  return cwd;
};

describe("Responsibility Boundary Guard", () => {
  it("detects stateless instance methods", () => {
    const findings = analyze(`class Example { run() { return 1; } }`);
    expect(
      findings.some((finding) => finding.kind === "stateless-instance-method"),
    ).toBe(true);
  });

  it("allows interface contract methods", () => {
    const findings = analyze(
      `interface Contract { save(): void } class Example implements Contract { save() {} }`,
    );
    expect(
      findings.some((finding) => finding.kind === "stateless-instance-method"),
    ).toBe(false);
  });

  it("detects internal-only public methods", () => {
    const findings = analyze(
      `class Example { value = 1; calculate() { return this.value + 1; } } new Example();`,
    );
    expect(
      findings.some((finding) => finding.kind === "internal-only-public-method"),
    ).toBe(true);
  });

  it("detects static-only classes and static methods", () => {
    const findings = analyze(`class Example { static run() { return 1; } }`);
    expect(
      findings.some((finding) => finding.kind === "static-only-class"),
    ).toBe(true);
    expect(findings.some((finding) => finding.kind === "static-method")).toBe(
      true,
    );
  });

  it("allows structural named constructors", () => {
    const findings = analyze(
      `class Example { private constructor() {} static create(): Example { return new Example(); } }`,
    );
    expect(findings.some((finding) => finding.kind === "static-method")).toBe(
      false,
    );
  });

  it.each(["any", "unknown", "never"])(
    "does not allow %s typed factory escapes",
    (returnType) => {
      const body = returnType === "never" ? `throw new Error("x")` : "return 1 as any";
      const findings = analyze(
        `class Example { static create(): ${returnType} { ${body}; } }`,
      );
      expect(findings.some((finding) => finding.kind === "static-method")).toBe(
        true,
      );
    },
  );

  it("detects backend free functions and allows frontend override", () => {
    const configured = mergeQualityConfig({
      responsibilityBoundary: {
        overrides: [
          {
            files: ["src/frontend/**"],
            rules: { topLevelFunction: "off" },
          },
        ],
      },
    });
    expect(
      analyze(
        `function backend() { return 1; } backend();`,
        configured,
        "src/backend/example.ts",
      ).some((finding) => finding.kind === "top-level-free-function"),
    ).toBe(true);
    expect(
      analyze(
        `function frontend() { return 1; } frontend();`,
        configured,
        "src/frontend/example.ts",
      ).some((finding) => finding.kind === "top-level-free-function"),
    ).toBe(false);
  });

  it("detects local helpers while allowing inline callbacks", () => {
    const helperFindings = analyze(
      `function top() { const local = () => 1; return local(); } top();`,
    );
    expect(
      helperFindings.some((finding) => finding.kind === "local-helper"),
    ).toBe(true);

    const inlineFindings = analyze(
      `const values = [1, 2].map((value) => value + 1); console.log(values);`,
    );
    expect(
      inlineFindings.some((finding) => finding.kind === "local-helper"),
    ).toBe(false);
  });

  it("honors centralized exceptions", () => {
    const configured = mergeQualityConfig({
      responsibilityBoundary: {
        exceptions: {
          staticMethods: [
            { symbol: "Example.helper", reason: "framework contract" },
          ],
        },
      },
    });
    const findings = analyze(
      `class Example { static helper() { return 1; } }`,
      configured,
    );
    expect(
      findings.some((finding) => finding.kind === "static-method-exception"),
    ).toBe(true);
    expect(findings.some((finding) => finding.kind === "static-method")).toBe(
      false,
    );
  });
});

describe("Structure metrics", () => {
  it("detects single-use boundaries, low cohesion, high coupling and God Class signals", () => {
    const configured = mergeQualityConfig({
      structure: {
        cohesion: { lcomMax: 0.2, tccMin: 0.8, failOnViolation: true },
        coupling: { cboMax: 0, failOnViolation: true },
        godClass: {
          methodCountMax: 1,
          fieldCountMax: 1,
          cboMax: 0,
          lcomMax: 0.2,
          tccMin: 0.8,
          wmcMax: 1,
          minimumSignals: 2,
          failOnDetection: true,
        },
      },
    });
    const findings = analyze(
      `import { External } from "./external"; class Example { a = 1; b = 2; one() { return this.a; } two() { return this.b; } three(value: External) { if (value) return this.a; return this.b; } } new Example();`,
      configured,
    );
    expect(findings.some((finding) => finding.kind === "low-cohesion")).toBe(
      true,
    );
    expect(findings.some((finding) => finding.kind === "high-coupling")).toBe(
      true,
    );
    expect(
      findings.some((finding) => finding.kind === "god-class-candidate"),
    ).toBe(true);
    expect(
      findings.some(
        (finding) => finding.kind === "single-use-trivial-boundary",
      ),
    ).toBe(true);
  });
});

describe("Suppression and method policy", () => {
  it("rejects private/protected/private-identifier methods but allows private fields", async () => {
    const eslint = new ESLint({
      overrideConfigFile: true,
      overrideConfig: createEslintConfig(quality),
    });
    const [result] = await eslint.lintText(
      `class Example { #value = 1; private hidden() {} protected inherited() {} #secret() {} read() { return this.#value; } }`,
      { filePath: "example.ts" },
    );
    const messages = result.messages
      .map((message) => message.message)
      .join("\n");
    expect(messages).toContain("private method is prohibited");
    expect(messages).toContain("protected method is prohibited");
  });

  it("rejects inline eslint suppression", async () => {
    const eslint = new ESLint({
      overrideConfigFile: true,
      overrideConfig: createEslintConfig(quality),
    });
    const [result] = await eslint.lintText(
      `// eslint-disable-next-line no-unused-vars\nconst suppressedButStillInvalid = 1;`,
      { filePath: "example.ts" },
    );
    expect(result.errorCount).toBeGreaterThan(0);
  });
});

describe("Quality Guard integration", () => {
  it("keeps architecture, unused and duplication sensors effective", async () => {
    const cwd = temporaryProject();
    try {
      writeFileSync(join(cwd, "src", "a.ts"), `import { b } from "./b";\nexport const a = () => b();\n`);
      writeFileSync(join(cwd, "src", "b.ts"), `import { a } from "./a";\nexport const b = () => a();\n`);
      writeFileSync(
        join(cwd, "src", "duplicate-one.ts"),
        `export const duplicateOne = (value: number) => {\n  const doubled = value * 2;\n  const tripled = value * 3;\n  return doubled + tripled;\n};\n`,
      );
      writeFileSync(
        join(cwd, "src", "duplicate-two.ts"),
        `export const duplicateTwo = (value: number) => {\n  const doubled = value * 2;\n  const tripled = value * 3;\n  return doubled + tripled;\n};\n`,
      );

      const report = await runQualityGuard({
        cwd,
        quality: mergeQualityConfig({
          paths: { source: "src" },
          duplication: { percent: 0, minLines: 3, minTokens: 10 },
          responsibilityBoundary: {
            default: {
              statelessInstanceMethod: "off",
              internalOnlyPublicMethod: "off",
              staticMethod: "off",
              staticOnlyClass: "off",
              topLevelFunction: "off",
              localHelper: "off",
            },
          },
          structure: {
            singleUseTrivialBoundary: { failOnDetection: false },
            cohesion: { failOnViolation: false },
            coupling: { failOnViolation: false },
            godClass: { failOnDetection: false },
          },
        }),
      });

      expect(report.results.find((result) => result.sensor === "architecture")?.passed).toBe(false);
      expect(report.results.find((result) => result.sensor === "unused")?.passed).toBe(false);
      expect(report.results.find((result) => result.sensor === "duplication")?.passed).toBe(false);
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  });

  it("normalizes config failures as QualityToolError", async () => {
    await expect(
      runQualityGuard({ configPath: "definitely-missing-quality.config.mjs" }),
    ).rejects.toMatchObject({
      name: "Error",
      sensor: "config",
    });
  });

  it("uses exit 2 for tool/config failure and exit 1 only for violations", () => {
    const result = spawnSync(
      process.execPath,
      [
        join(packageRoot, "src", "cli.mjs"),
        "--config",
        "definitely-missing-quality.config.mjs",
      ],
      { cwd: packageRoot, encoding: "utf8" },
    );
    expect(result.status).toBe(2);
    expect(`${result.stdout}${result.stderr}`).toContain(
      "Quality Guard sensor failed unexpectedly: config",
    );
  });

  it("exports QualityToolError as the public tool failure type", () => {
    const error = new QualityToolError("config", new Error("bad config"));
    expect(error.sensor).toBe("config");
    expect(error.cause).toBeInstanceOf(Error);
  });
});
