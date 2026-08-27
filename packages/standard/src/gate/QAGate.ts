import type {
  GatePass,
  ProcessGate,
} from "@mydx-dev/ai-driven-spiral-development";
import type { QAReport } from "../artifact/QAReport.js";

export class QAGate implements ProcessGate<QAReport> {
  verifyStructuralComplete(reports: QAReport[]): GatePass {
    if (reports.length !== 1) {
      return {
        passed: false,
        errors: ["対象CycleのQAReportを一意に特定できません"],
      };
    }

    const report = reports[0];
    const errors: string[] = [];

    if (report.requirementIds.length === 0) {
      errors.push("検証対象となるRequirementが存在しません");
    }

    const results = new Map(
      report.results.map((result) => [result.requirementId, result]),
    );

    for (const requirementId of report.requirementIds) {
      const result = results.get(requirementId);

      if (!result) {
        errors.push(`${requirementId}: QAが実施されていません`);
        continue;
      }

      if (!result.satisfied) {
        errors.push(`${requirementId}: Requirementを満たしていません`);
      }

      if (!result.evidence.trim()) {
        errors.push(`${requirementId}: 検証根拠がありません`);
      }
    }

    return errors.length === 0 ? { passed: true } : { passed: false, errors };
  }
}
