import type { GatePass, ProcessGate } from "@mydx-dev/ai-driven-spiral-development";
import type { AcceptanceReport } from "../artifact/AcceptanceReport.js";

export class AcceptanceGate implements ProcessGate<AcceptanceReport> {
  verifyStructuralComplete(reports: AcceptanceReport[]): GatePass {
    if (reports.length !== 1) {
      return {
        passed: false,
        errors: ["対象CycleのAcceptanceReportを一意に特定できません"],
      };
    }

    const report = reports[0];
    const errors: string[] = [];

    if (report.demandIds.length === 0) {
      errors.push("検収対象となるDemandが存在しません");
    }

    const results = new Map(
      report.results.map((result) => [result.demandId, result]),
    );

    for (const demandId of report.demandIds) {
      const result = results.get(demandId);

      if (!result) {
        errors.push(`${demandId}: 検収結果が存在しません`);
        continue;
      }

      if (!result.reached) {
        errors.push(`${demandId}: Demandが期待状態に到達していません`);
      }

      if (!result.evaluation.trim()) {
        errors.push(`${demandId}: 要求者による評価がありません`);
      }
    }

    return errors.length === 0 ? { passed: true } : { passed: false, errors };
  }
}
