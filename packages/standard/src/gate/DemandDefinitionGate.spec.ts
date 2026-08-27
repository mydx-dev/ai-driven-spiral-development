import { describe, expect, it } from "vitest";
import { Demand } from "../artifact/Demand";
import { DemandDefinitionGate } from "./DemandDefinitionGate";

describe("DemandDefinitionGate", () => {
  const gate = new DemandDefinitionGate();

  it("Demandが1件も存在しない場合は構造的未完了", () => {
    expect(gate.verifyStructuralComplete([])).toEqual({
      passed: false,
      errors: ["Demandが1件も存在しません"],
    });
  });

  it("必要な情報を持つDemandが存在する場合は構造的完了", () => {
    const demand = new Demand(
      "demand-1",
      "cycle-1",
      "受注業務",
      "手作業で受注を管理している",
      "受注をシステム上で管理できる",
      "顧客ヒアリング",
      [],
    );

    expect(gate.verifyStructuralComplete([demand])).toEqual({
      passed: true,
    });
  });

  it.each([
    ["id", new Demand("", "cycle-1", "対象", "現在", "期待", "source", [])],
    [
      "cycleId",
      new Demand("demand-1", "", "対象", "現在", "期待", "source", []),
    ],
    [
      "target",
      new Demand("demand-1", "cycle-1", "", "現在", "期待", "source", []),
    ],
    [
      "currentState",
      new Demand("demand-1", "cycle-1", "対象", "", "期待", "source", []),
    ],
    [
      "expectedState",
      new Demand("demand-1", "cycle-1", "対象", "現在", "", "source", []),
    ],
    [
      "source",
      new Demand("demand-1", "cycle-1", "対象", "現在", "期待", "", []),
    ],
  ])("%s が不足している場合は構造的未完了", (_, demand) => {
    expect(gate.verifyStructuralComplete([demand]).passed).toBe(false);
  });
});
