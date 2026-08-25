import { describe, expect, it } from "vitest";
import {
  AcceptanceFeedback,
  AcceptanceReport,
  DemandAcceptance,
} from "../artifact/AcceptanceReport";
import { AcceptanceGate } from "./AcceptanceGate";

describe("AcceptanceGate", () => {
  const gate = new AcceptanceGate();

  it("AcceptanceReportを一意に特定できない場合は構造的未完了", () => {
    expect(gate.verifyStructuralComplete([]).passed).toBe(false);
  });

  it("全Demandが要求者によって評価されている場合は構造的完了", () => {
    const report = new AcceptanceReport(
      "acceptance-report-1",
      ["demand-1", "demand-2"],
      [
        new DemandAcceptance("demand-1", true, "期待した状態になっている"),
        new DemandAcceptance("demand-2", true, "問題なく利用できる"),
      ],
      new AcceptanceFeedback(false, false, false),
    );

    expect(gate.verifyStructuralComplete([report])).toEqual({
      passed: true,
    });
  });

  it("未評価Demandが存在する場合は構造的未完了", () => {
    const report = new AcceptanceReport(
      "acceptance-report-1",
      ["demand-1", "demand-2"],
      [new DemandAcceptance("demand-1", true, "確認済み")],
      new AcceptanceFeedback(false, false, false),
    );

    const result = gate.verifyStructuralComplete([report]);

    expect(result.passed).toBe(false);

    if (!result.passed) {
      expect(result.errors).toContain("demand-2: 検収結果が存在しません");
    }
  });

  it("要求者による評価内容がない場合は構造的未完了", () => {
    const report = new AcceptanceReport(
      "acceptance-report-1",
      ["demand-1"],
      [new DemandAcceptance("demand-1", true, "")],
      new AcceptanceFeedback(false, false, false),
    );

    expect(gate.verifyStructuralComplete([report]).passed).toBe(false);
  });

  it("Demandが未到達の場合は構造的未完了", () => {
    const report = new AcceptanceReport(
      "acceptance-report-1",
      ["demand-1"],
      [
        new DemandAcceptance(
          "demand-1",
          false,
          "期待した状態には到達していない",
        ),
      ],
      new AcceptanceFeedback(false, true, false),
    );

    expect(gate.verifyStructuralComplete([report])).toEqual({
      passed: false,
      errors: ["demand-1: Demandが期待状態に到達していません"],
    });
  });

  it("新規Demandが存在してもAcceptance Process自体は構造的完了できる", () => {
    const report = new AcceptanceReport(
      "acceptance-report-1",
      ["demand-1"],
      [new DemandAcceptance("demand-1", true, "既存要求は満たされた")],
      new AcceptanceFeedback(true, false, false),
    );

    expect(gate.verifyStructuralComplete([report])).toEqual({
      passed: true,
    });
  });
});
