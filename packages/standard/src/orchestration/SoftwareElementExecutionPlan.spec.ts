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

  it("全Software Elementが完了済みなら実行可能Elementなしとして返す", () => {
    expect(
      new SoftwareElementExecutionPlan(architecture).executableElementIds([
        "api",
        "domain",
        "repository",
      ]),
    ).toEqual([]);
  });

  it("未完了Elementが残る循環依存を正常な空配列として返さない", () => {
    const cyclicArchitecture = new SoftwareArchitectureDescription(
      "architecture-2",
      "cycle-1",
      [
        { id: "a", name: "A", responsibilities: ["A"] },
        { id: "b", name: "B", responsibilities: ["B"] },
      ],
      [
        {
          sourceElementId: "a",
          targetElementId: "b",
          type: "dependency",
          description: "A depends on B",
        },
        {
          sourceElementId: "b",
          targetElementId: "a",
          type: "dependency",
          description: "B depends on A",
        },
      ],
      [],
      [],
      [],
    );

    expect(() =>
      new SoftwareElementExecutionPlan(cyclicArchitecture).executableElementIds(
        [],
      ),
    ).toThrow("Software Element execution is blocked");
  });
});
