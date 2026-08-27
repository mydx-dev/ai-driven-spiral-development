import { describe, expect, it } from "vitest";
import { QAReport, RequirementVerification } from "../artifact/QAReport";
import { QAGate } from "./QAGate";

describe("QAGate", () => {
  const gate = new QAGate();

  it("QAReportを一意に特定できない場合は構造的未完了", () => {
    expect(gate.verifyStructuralComplete([]).passed).toBe(false);
  });

  it("全Requirementが検証され充足している場合は構造的完了", () => {
    const report = new QAReport(
      "qa-report-1",
      ["requirement-1", "requirement-2"],
      [
        new RequirementVerification("requirement-1", true, "自動テストで確認"),
        new RequirementVerification("requirement-2", true, "E2Eテストで確認"),
      ],
    );

    expect(gate.verifyStructuralComplete([report])).toEqual({
      passed: true,
    });
  });

  it("未検証Requirementが存在する場合は構造的未完了", () => {
    const report = new QAReport(
      "qa-report-1",
      ["requirement-1", "requirement-2"],
      [new RequirementVerification("requirement-1", true, "自動テストで確認")],
    );

    const result = gate.verifyStructuralComplete([report]);

    expect(result.passed).toBe(false);

    if (!result.passed) {
      expect(result.errors).toContain("requirement-2: QAが実施されていません");
    }
  });

  it("Requirementが不充足の場合は構造的未完了", () => {
    const report = new QAReport(
      "qa-report-1",
      ["requirement-1"],
      [
        new RequirementVerification(
          "requirement-1",
          false,
          "E2Eテストで不具合を確認",
        ),
      ],
    );

    expect(gate.verifyStructuralComplete([report]).passed).toBe(false);
  });

  it("検証根拠がない場合は構造的未完了", () => {
    const report = new QAReport(
      "qa-report-1",
      ["requirement-1"],
      [new RequirementVerification("requirement-1", true, "")],
    );

    expect(gate.verifyStructuralComplete([report]).passed).toBe(false);
  });
});
