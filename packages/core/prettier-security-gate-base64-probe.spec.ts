import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { format, resolveConfig } from "prettier";

describe("security gate prettier byte probe", () => {
  it("prints formatted bytes as base64", async () => {
    const path = "scripts/security-gate.mjs";
    const source = await readFile(path, "utf8");
    const config = (await resolveConfig(path)) ?? {};
    const formatted = await format(source, { ...config, filepath: path });
    console.log("PRETTIER_SECURITY_GATE_BASE64_START");
    console.log(Buffer.from(formatted, "utf8").toString("base64"));
    console.log("PRETTIER_SECURITY_GATE_BASE64_END");
    expect.fail("security gate prettier byte probe");
  });
});
