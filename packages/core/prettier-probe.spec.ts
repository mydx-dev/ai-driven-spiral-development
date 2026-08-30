import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { format, resolveConfig } from "prettier";

const paths = [
  "packages/standard-github/src/StandardArtifactIssueCodecs.ts",
  "packages/standard-github/src/StandardArtifactIssueRepository.spec.ts",
  "packages/standard-github/src/StandardArtifactIssueRepository.ts",
];

describe("prettier probe", () => {
  it("prints formatted Standard GitHub adapter files", async () => {
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
