import type { GatePass, ProcessGate } from "../../core/ProcessGate";
import type { Implementation } from "../artifact/Implementation";

export class EngineeringGate implements ProcessGate<Implementation> {
  verifyStructuralComplete(implementations: Implementation[]): GatePass {
    const errors: string[] = [];

    if (implementations.length !== 1) {
      return {
        passed: false,
        errors: ["対象CycleのImplementationを一意に特定できません"],
      };
    }

    const implementation = implementations[0];

    if (implementation.features.length === 0) {
      errors.push("実装対象となるFeatureが存在しません");
    }

    for (const feature of implementation.features) {
      if (!feature.featureId.trim()) {
        errors.push("Feature識別子がありません");
      }

      if (!feature.completed) {
        errors.push(`${feature.featureId}: Featureの実装が完了していません`);
      }
    }

    return errors.length === 0 ? { passed: true } : { passed: false, errors };
  }
}
