import { describe, expect, it } from "vitest";
import { Implementation, ImplementedFeature } from "../artifact/Implementation";
import { EngineeringGate } from "./EngineeringGate";

describe("EngineeringGate", () => {
  const gate = new EngineeringGate();

  const completedFeature = (featureId: string) =>
    new ImplementedFeature(featureId, true, true, true, true, true);

  it("Implementationを一意に特定できない場合は構造的未完了", () => {
    expect(gate.verifyStructuralComplete([]).passed).toBe(false);

    expect(
      gate.verifyStructuralComplete([
        new Implementation(
          "implementation-1",
          ["feature-1"],
          [completedFeature("feature-1")],
        ),
        new Implementation(
          "implementation-2",
          ["feature-2"],
          [completedFeature("feature-2")],
        ),
      ]).passed,
    ).toBe(false);
  });

  it("全FeatureがEngineeringの構造的完了条件を満たしている場合は構造的完了", () => {
    const implementation = new Implementation(
      "implementation-1",
      ["feature-1", "feature-2"],
      [completedFeature("feature-1"), completedFeature("feature-2")],
    );

    expect(gate.verifyStructuralComplete([implementation])).toEqual({
      passed: true,
    });
  });

  it("実装対象Featureが存在しない場合は構造的未完了", () => {
    const implementation = new Implementation("implementation-1", [], []);

    expect(gate.verifyStructuralComplete([implementation]).passed).toBe(false);
  });

  it("対象Featureの実装成果物が存在しない場合は構造的未完了", () => {
    const implementation = new Implementation(
      "implementation-1",
      ["feature-1", "feature-2"],
      [completedFeature("feature-1")],
    );

    expect(gate.verifyStructuralComplete([implementation])).toEqual({
      passed: false,
      errors: ["feature-2: 実装成果物が存在しません"],
    });
  });

  it("実装対象ではないFeatureが含まれる場合は構造的未完了", () => {
    const implementation = new Implementation(
      "implementation-1",
      ["feature-1"],
      [completedFeature("feature-1"), completedFeature("feature-2")],
    );

    expect(gate.verifyStructuralComplete([implementation])).toEqual({
      passed: false,
      errors: ["feature-2: 実装対象ではないFeatureです"],
    });
  });

  it("Feature識別子が空の場合は構造的未完了", () => {
    const implementation = new Implementation(
      "implementation-1",
      [""],
      [completedFeature("")],
    );

    expect(gate.verifyStructuralComplete([implementation]).passed).toBe(false);
  });

  it("テストが成功していないFeatureがある場合は構造的未完了", () => {
    const implementation = new Implementation(
      "implementation-1",
      ["feature-1"],
      [new ImplementedFeature("feature-1", false, true, true, true, true)],
    );

    expect(gate.verifyStructuralComplete([implementation])).toEqual({
      passed: false,
      errors: ["feature-1: テストが成功していません"],
    });
  });

  it("静的解析が成功していないFeatureがある場合は構造的未完了", () => {
    const implementation = new Implementation(
      "implementation-1",
      ["feature-1"],
      [new ImplementedFeature("feature-1", true, false, true, true, true)],
    );

    expect(gate.verifyStructuralComplete([implementation])).toEqual({
      passed: false,
      errors: ["feature-1: 静的解析が成功していません"],
    });
  });

  it("Buildが成功していないFeatureがある場合は構造的未完了", () => {
    const implementation = new Implementation(
      "implementation-1",
      ["feature-1"],
      [new ImplementedFeature("feature-1", true, true, false, true, true)],
    );

    expect(gate.verifyStructuralComplete([implementation])).toEqual({
      passed: false,
      errors: ["feature-1: Buildが成功していません"],
    });
  });

  it("Reviewが完了していないFeatureがある場合は構造的未完了", () => {
    const implementation = new Implementation(
      "implementation-1",
      ["feature-1"],
      [new ImplementedFeature("feature-1", true, true, true, false, true)],
    );

    expect(gate.verifyStructuralComplete([implementation])).toEqual({
      passed: false,
      errors: ["feature-1: Reviewが完了していません"],
    });
  });

  it("統合されていないFeatureがある場合は構造的未完了", () => {
    const implementation = new Implementation(
      "implementation-1",
      ["feature-1"],
      [new ImplementedFeature("feature-1", true, true, true, true, false)],
    );

    expect(gate.verifyStructuralComplete([implementation])).toEqual({
      passed: false,
      errors: ["feature-1: 実装成果物が統合されていません"],
    });
  });

  it("複数の構造的完了条件を満たしていない場合はすべてのエラーを返す", () => {
    const implementation = new Implementation(
      "implementation-1",
      ["feature-1"],
      [new ImplementedFeature("feature-1", false, true, false, false, true)],
    );

    expect(gate.verifyStructuralComplete([implementation])).toEqual({
      passed: false,
      errors: [
        "feature-1: テストが成功していません",
        "feature-1: Buildが成功していません",
        "feature-1: Reviewが完了していません",
      ],
    });
  });
});
