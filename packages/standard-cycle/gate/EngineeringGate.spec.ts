import { describe, expect, it } from "vitest";
import { Implementation, ImplementedFeature } from "../artifact/Implementation";
import { EngineeringGate } from "./EngineeringGate";

describe("EngineeringGate", () => {
  const gate = new EngineeringGate();

  it("Implementationを一意に特定できない場合は構造的未完了", () => {
    expect(gate.verifyStructuralComplete([]).passed).toBe(false);
  });

  it("全Featureの実装が完了している場合は構造的完了", () => {
    const implementation = new Implementation("implementation-1", [
      new ImplementedFeature("feature-1", true),
      new ImplementedFeature("feature-2", true),
    ]);

    expect(gate.verifyStructuralComplete([implementation])).toEqual({
      passed: true,
    });
  });

  it("未完了Featureが存在する場合は構造的未完了", () => {
    const implementation = new Implementation("implementation-1", [
      new ImplementedFeature("feature-1", true),
      new ImplementedFeature("feature-2", false),
    ]);

    const result = gate.verifyStructuralComplete([implementation]);

    expect(result.passed).toBe(false);

    if (!result.passed) {
      expect(result.errors).toContain(
        "feature-2: Featureの実装が完了していません",
      );
    }
  });

  it("実装対象Featureが存在しない場合は構造的未完了", () => {
    const implementation = new Implementation("implementation-1", []);

    expect(gate.verifyStructuralComplete([implementation]).passed).toBe(false);
  });

  it("Feature識別子が空の場合は構造的未完了", () => {
    const implementation = new Implementation("implementation-1", [
      new ImplementedFeature("", true),
    ]);

    expect(gate.verifyStructuralComplete([implementation]).passed).toBe(false);
  });
});
