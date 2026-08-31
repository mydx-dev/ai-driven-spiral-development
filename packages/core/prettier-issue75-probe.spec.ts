import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { format, resolveConfig } from "prettier";

const paths = [
  "docs/migration-standard-8-process.md",
  "packages/core/SemanticCompletionEvent.ts",
  "packages/standard-github/src/Runtime.spec.ts",
  "packages/standard-github/src/Runtime.ts",
  "packages/standard/src/artifact/SoftwareRequirementsSpecification.ts",
  "packages/standard/src/gate/SoftwareRequirementsDefinitionGate.spec.ts",
  "packages/standard/src/gate/SoftwareRequirementsGate.ts",
  "packages/standard/src/gate/SystemRequirementsGate.ts",
  "packages/standard/src/index.ts",
  "packages/standard/src/StandardCycle.ts",
  "README.md",
] as const;

describe("issue 75 prettier probe", () => {
  it("prints exact prettier 3.9.6 output", async () => {
    for (const path of paths) {
      const source = await readFile(path, "utf8");
      const config = (await resolveConfig(path)) ?? {};
      const formatted = await format(source, { ...config, filepath: path });
      console.log(`PRETTIER_FILE_START:${path}`);
      console.log(formatted);
      console.log(`PRETTIER_FILE_END:${path}`);
    }
    expect.fail("issue 75 prettier probe");
  });
});
