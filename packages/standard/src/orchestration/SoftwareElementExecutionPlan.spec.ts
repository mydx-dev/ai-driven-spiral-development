import { describe, expect, it } from "vitest";
import { SoftwareArchitectureDescription } from "../artifact/SoftwareArchitectureDescription.js";
import { SoftwareElementExecutionPlan } from "./SoftwareElementExecutionPlan.js";

const architecture = new SoftwareArchitectureDescription(
  "architecture-1",
  "cycle-1",
  [
    { id: "api", name: "API", responsibilities: ["serve request"] },
    { id: "domain", name: "Domain", responsibilities: ["business rule"] },
    {
      id: "repository",
      name: "Repository",
      responsibilities: ["persist data"],
    },
  ],
  [
    {
      sourceElementId: "api",
      targetElementId: "domain",
      type: "dependency",
      description: "API depends on Domain",
    },
  ],
  [],
  [],
  [],
);

describe("SoftwareElementExecutionPlan", () => {
  it("依存関係のないSoftware Elementsを並列実行可能として返す", () => {
    expect(
      new SoftwareElementExecutionPlan(architecture).executableElementIds([]),
    ).toEqual(["domain", "repository"]);
  });

  it("依存先が完了すると後続Software Elementを実行可能にする", () => {
    expect(
      new SoftwareElementExecutionPlan(architecture).executableElementIds([
        "domain",
        "repository",
      ]),
    ).toEqual(["api"]);
  });
});
