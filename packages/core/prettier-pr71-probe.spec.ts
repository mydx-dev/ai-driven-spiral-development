import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { format, resolveConfig } from "prettier";

describe("PR 71 prettier probe", () => {
  it("prints exact codec formatting", async () => {
    const path = "packages/standard-github/src/StandardArtifactIssueCodecs.ts";
    const source = await readFile(path, "utf8");
    const config = (await resolveConfig(path)) ?? {};
    const formatted = await format(source, { ...config, filepath: path });
    console.log("PRETTIER_PR71_START");
    console.log(formatted);
    console.log("PRETTIER_PR71_END");
    expect.fail("PR 71 prettier probe");
  });
});
