import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("@mydx/spiral-standard package boundary", () => {
  it("runtime dependencyはCoreだけである", () => {
    const packageJson = JSON.parse(
      readFileSync(new URL("../package.json", import.meta.url), "utf8"),
    );

    expect(packageJson.dependencies).toEqual({
      "ai-driven-spiral-development": "^1.0.1",
    });
    expect(packageJson.dependencies["@mydx/spiral-github"]).toBeUndefined();
    expect(packageJson.dependencies["@mydx/spiral-standard-github"]).toBeUndefined();
    expect(packageJson.dependencies["@mydx/spiral"]).toBeUndefined();
  });
});
