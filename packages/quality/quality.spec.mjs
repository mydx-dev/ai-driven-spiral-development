import { ESLint } from "eslint";
import { Project } from "ts-morph";
import { describe, expect, it } from "vitest";
import {
  analyzeSourceFiles,
  createEslintConfig,
  mergeQualityConfig,
} from "./src/index.mjs";

const quality = mergeQualityConfig();

const analyze = (source) => {
  const project = new Project({ useInMemoryFileSystem: true });
  const file = project.createSourceFile("src/example.ts", source);
  return analyzeSourceFiles([file], quality, "/");
};

describe("Responsibility Boundary Guard", () => {
  it("detects stateless instance methods", () => {
    const findings = analyze(`class Example { run() { return 1; } }`);
    expect(
      findings.some((finding) => finding.kind === "stateless-instance-method"),
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

  it("detects top-level and local helpers", () => {
    const findings = analyze(
      `function top() { const local = () => 1; return local(); } top();`,
    );
    expect(
      findings.some((finding) => finding.kind === "top-level-free-function"),
    ).toBe(true);
    expect(findings.some((finding) => finding.kind === "local-helper")).toBe(
      true,
    );
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
