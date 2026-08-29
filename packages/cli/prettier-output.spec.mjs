import { readFile } from "node:fs/promises";
import { format } from "prettier";
import { describe, it } from "vitest";

describe("temporary prettier output", () => {
  it("prints the formatted Gate", async () => {
    const path =
      "packages/standard/src/gate/StakeholderNeedsAndRequirementsDefinitionGate.ts";
    const source = await readFile(path, "utf8");
    const formatted = await format(source, { filepath: path });

    console.error("<<<PRETTIER_OUTPUT_START>>>");
    console.error(formatted);
    console.error("<<<PRETTIER_OUTPUT_END>>>");
    throw new Error("temporary prettier output");
  });
});
