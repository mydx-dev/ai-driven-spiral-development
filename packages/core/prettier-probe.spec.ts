import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { format, resolveConfig } from "prettier";

const path = "packages/standard/src/gate/ValidationGate.spec.ts";

describe("prettier probe", () => {
  it("prints formatted ValidationGate spec", async () => {
    const source = await readFile(path, "utf8");
    const config = (await resolveConfig(path)) ?? {};
    const formatted = await format(source, { ...config, filepath: path });

    console.log(`PRETTIER_START:${path}`);
    console.log(formatted);
    console.log(`PRETTIER_END:${path}`);

    expect.fail("prettier probe");
  });
});
