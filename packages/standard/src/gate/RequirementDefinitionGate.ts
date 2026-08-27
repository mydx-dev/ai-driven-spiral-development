import type {
  GatePass,
  ProcessGate,
} from "@mydx-dev/ai-driven-spiral-development";
import type { Demand } from "../artifact/Demand.js";

export class RequirementDefinitionGate implements ProcessGate<Demand> {
  verifyStructuralComplete(demands: Demand[]): GatePass {
    const errors: string[] = [];

    if (demands.length === 0) {
      errors.push("Demandが1件も存在しません");
    }

    for (const demand of demands) {
      if (demand.requirements.length === 0) {
        errors.push(`${demand.id}: Requirementが定義されていません`);
        continue;
      }

      for (const requirement of demand.requirements) {
        if (!requirement.id.trim()) {
          errors.push(`${demand.id}: Requirement識別子がありません`);
        }

        if (!requirement.detail.trim()) {
          errors.push(`${demand.id}/${requirement.id}: Requirementが空です`);
        }
      }
    }

    return errors.length === 0 ? { passed: true } : { passed: false, errors };
  }
}
