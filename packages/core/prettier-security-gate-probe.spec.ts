import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { format, resolveConfig } from "prettier";

describe("security gate prettier probe", () => {
  it("prints exact prettier output", async () => {
    const path = "scripts/security-gate.mjs";
    const source = await readFile(path, "utf8");
    const config = (await resolveConfig(path)) ?? {};
    const formatted = await format(source, { ...config, filepath: path });
    console.log("PRETTIER_SECURITY_GATE_START");
    console.log(formatted);
    console.log("PRETTIER_SECURITY_GATE_END");
    expect.fail("security gate prettier probe");
  });
});
