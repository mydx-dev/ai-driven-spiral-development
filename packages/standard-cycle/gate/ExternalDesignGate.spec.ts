import { describe, expect, it } from "vitest";
import { ExternalSpec, Feature } from "../artifact/ExternalSpec";
import { ExternalDesignGate } from "./ExternalDesignGate";

describe("ExternalDesignGate", () => {
  const gate = new ExternalDesignGate();

  it("ExternalSpecを一意に特定できない場合は構造的未完了", () => {
    expect(gate.verifyStructuralComplete([]).passed).toBe(false);
  });

  it("全RequirementがFeatureに取り込まれている場合は構造的完了", () => {
    const externalSpec = new ExternalSpec(
      "external-spec-1",
      ["requirement-1", "requirement-2", "requirement-3"],
      [
        new Feature(
          "feature-1",
          ["requirement-1", "requirement-2"],
          "受注登録機能",
        ),
        new Feature("feature-2", ["requirement-3"], "受注検索機能"),
      ],
    );

    expect(gate.verifyStructuralComplete([externalSpec])).toEqual({
      passed: true,
    });
  });

  it("Featureに取り込まれていないRequirementがある場合は構造的未完了", () => {
    const externalSpec = new ExternalSpec(
      "external-spec-1",
      ["requirement-1", "requirement-2"],
      [new Feature("feature-1", ["requirement-1"], "受注登録機能")],
    );

    const result = gate.verifyStructuralComplete([externalSpec]);

    expect(result.passed).toBe(false);

    if (!result.passed) {
      expect(result.errors).toContain(
        "requirement-2: 外部仕様へ取り込まれていません",
      );
    }
  });

  it("対象外Requirementを参照するFeatureがある場合は構造的未完了", () => {
    const externalSpec = new ExternalSpec(
      "external-spec-1",
      ["requirement-1"],
      [
        new Feature(
          "feature-1",
          ["requirement-1", "requirement-x"],
          "受注登録機能",
        ),
      ],
    );

    expect(gate.verifyStructuralComplete([externalSpec]).passed).toBe(false);
  });

  it("Featureが存在しない場合は構造的未完了", () => {
    const externalSpec = new ExternalSpec(
      "external-spec-1",
      ["requirement-1"],
      [],
    );

    expect(gate.verifyStructuralComplete([externalSpec]).passed).toBe(false);
  });

  it("Requirementと外部仕様を持たないFeatureは構造的未完了", () => {
    const externalSpec = new ExternalSpec(
      "external-spec-1",
      ["requirement-1"],
      [new Feature("feature-1", [], "")],
    );

    expect(gate.verifyStructuralComplete([externalSpec]).passed).toBe(false);
  });
});
