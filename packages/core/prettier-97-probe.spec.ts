import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { format, resolveConfig } from "prettier";

const paths = [
  "packages/standard-github/src/Runtime.spec.ts",
  "packages/standard-github/src/Runtime.ts",
  "packages/standard-github/src/RuntimeRepositories.ts",
];

describe("Issue 97 prettier probe", () => {
  it("prints exact formatted files", async () => {
    for (const path of paths) {
      const source = await readFile(path, "utf8");
      const config = (await resolveConfig(path)) ?? {};
      const formatted = await format(source, { ...config, filepath: path });
      console.log(`PRETTIER_97_START:${path}`);
      console.log(formatted);
      console.log(`PRETTIER_97_END:${path}`);
    }
    expect.fail("Issue 97 prettier probe");
  });
});
