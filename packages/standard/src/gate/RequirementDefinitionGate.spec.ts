import { describe, expect, it } from "vitest";
import { Demand } from "../artifact/Demand";
import { Requirement } from "../artifact/Requirement";
import { RequirementDefinitionGate } from "./RequirementDefinitionGate";

describe("RequirementDefinitionGate", () => {
  const gate = new RequirementDefinitionGate();

  it("Demandが1件も存在しない場合は構造的未完了", () => {
    expect(gate.verifyStructuralComplete([])).toEqual({
      passed: false,
      errors: ["Demandが1件も存在しません"],
    });
  });

  it("Requirementが存在しないDemandがある場合は構造的未完了", () => {
    const demand = new Demand(
      "demand-1",
      "cycle-1",
      "対象",
      "現在",
      "期待",
      "source",
      [],
    );

    expect(gate.verifyStructuralComplete([demand])).toEqual({
      passed: false,
      errors: ["demand-1: Requirementが定義されていません"],
    });
  });

  it("全Demandに有効なRequirementが存在する場合は構造的完了", () => {
    const demands = [
      new Demand("demand-1", "cycle-1", "対象A", "現在A", "期待A", "source", [
        new Requirement("requirement-1", "受注を登録できること"),
      ]),
      new Demand("demand-2", "cycle-1", "対象B", "現在B", "期待B", "source", [
        new Requirement("requirement-2", "受注を検索できること"),
      ]),
    ];

    expect(gate.verifyStructuralComplete(demands)).toEqual({
      passed: true,
    });
  });

  it("Requirementの識別子が空の場合は構造的未完了", () => {
    const demand = new Demand(
      "demand-1",
      "cycle-1",
      "対象",
      "現在",
      "期待",
      "source",
      [new Requirement("", "要件")],
    );

    expect(gate.verifyStructuralComplete([demand]).passed).toBe(false);
  });

  it("Requirementの内容が空の場合は構造的未完了", () => {
    const demand = new Demand(
      "demand-1",
      "cycle-1",
      "対象",
      "現在",
      "期待",
      "source",
      [new Requirement("requirement-1", "")],
    );

    expect(gate.verifyStructuralComplete([demand]).passed).toBe(false);
  });
});
