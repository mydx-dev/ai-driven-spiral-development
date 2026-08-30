import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { format, resolveConfig } from "prettier";

describe("prettier probe", () => {
  it("prints formatted process model", async () => {
    const path = "docs/theory/5.process-model.md";
    const source = await readFile(path, "utf8");
    const config = (await resolveConfig(path)) ?? {};
    const formatted = await format(source, { ...config, filepath: path });

    console.log("PRETTIER_START");
    console.log(formatted);
    console.log("PRETTIER_END");
    expect.fail("prettier probe");
  });
});