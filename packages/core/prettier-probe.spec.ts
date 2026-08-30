import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { format, resolveConfig } from "prettier";

const paths = [
  "packages/standard/src/artifact/ValidationResult.ts",
  "packages/standard/src/gate/ValidationGate.ts",
];

describe("prettier probe", () => {
  it("prints formatted validation files", async () => {
    for (const path of paths) {
      const source = await readFile(path, "utf8");
      const config = (await resolveConfig(path)) ?? {};
      const formatted = await format(source, { ...config, filepath: path });

      console.log(`PRETTIER_START:${path}`);
      console.log(formatted);
      console.log(`PRETTIER_END:${path}`);
    }

    expect.fail("prettier probe");
  });
});
