import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { format, resolveConfig } from "prettier";

describe("configureStandardCycle prettier probe", () => {
  it("prints exact prettier output", async () => {
    const path = "packages/standard/src/configureStandardCycle.ts";
    const source = await readFile(path, "utf8");
    const config = (await resolveConfig(path)) ?? {};
    const formatted = await format(source, { ...config, filepath: path });
    console.log("PRETTIER_CONFIGURE_STANDARD_CYCLE_START");
    console.log(formatted);
    console.log("PRETTIER_CONFIGURE_STANDARD_CYCLE_END");
    expect.fail("prettier probe");
  });
});
