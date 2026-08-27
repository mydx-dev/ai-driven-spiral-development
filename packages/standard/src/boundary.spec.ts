import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("@mydx/spiral-standard package boundary", () => {
  it("runtime boundaryはCoreだけである", () => {
    const packageJson = JSON.parse(
      readFileSync(new URL("../package.json", import.meta.url), "utf8"),
    );

    expect(packageJson.peerDependencies).toEqual({
      "ai-driven-spiral-development": ">=1.0.1 <3",
    });
    expect(packageJson.dependencies).toBeUndefined();
    expect(packageJson.peerDependencies["@mydx/spiral-github"]).toBeUndefined();
    expect(
      packageJson.peerDependencies["@mydx/spiral-standard-github"],
    ).toBeUndefined();
    expect(packageJson.peerDependencies["@mydx/spiral"]).toBeUndefined();
  });

  it("package自身のtoolchainをdevDependenciesとして宣言する", () => {
    const packageJson = JSON.parse(
      readFileSync(new URL("../package.json", import.meta.url), "utf8"),
    );

    expect(packageJson.devDependencies).toMatchObject({
      "@types/node": expect.any(String),
      "ai-driven-spiral-development": "1.0.1",
      typescript: expect.any(String),
      vitest: expect.any(String),
    });
    expect(packageJson.scripts).toEqual({
      build: "rm -rf dist && tsc -p tsconfig.json",
      test: "vitest run src",
      typecheck: "tsc --noEmit -p tsconfig.json",
    });
  });
});
