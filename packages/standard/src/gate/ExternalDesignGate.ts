import type {
  GatePass,
  ProcessGate,
} from "@mydx-dev/ai-driven-spiral-development";
import type { ExternalSpec } from "../artifact/ExternalSpec.js";

export class ExternalDesignGate implements ProcessGate<ExternalSpec> {
  verifyStructuralComplete(externalSpecs: ExternalSpec[]): GatePass {
    const errors: string[] = [];

    if (externalSpecs.length !== 1) {
      return {
        passed: false,
        errors: ["対象CycleのExternalSpecを一意に特定できません"],
      };
    }

    const externalSpec = externalSpecs[0];

    if (externalSpec.requirementIds.length === 0) {
      errors.push("設計対象となるRequirementが存在しません");
    }

    if (externalSpec.features.length === 0) {
      errors.push("Featureが存在しません");
    }

    const targetRequirementIds = new Set(externalSpec.requirementIds);
    const designedRequirementIds = new Set<string>();

    for (const feature of externalSpec.features) {
      if (!feature.id.trim()) {
        errors.push("Feature識別子がありません");
      }

      if (!feature.detail.trim()) {
        errors.push(`${feature.id}: 外部仕様が空です`);
      }

      if (feature.requirementIds.length === 0) {
        errors.push(`${feature.id}: Requirementが紐付いていません`);
      }

      for (const requirementId of feature.requirementIds) {
        if (!targetRequirementIds.has(requirementId)) {
          errors.push(
            `${feature.id}: 対象外Requirement ${requirementId} を参照しています`,
          );
          continue;
        }

        designedRequirementIds.add(requirementId);
      }
    }

    for (const requirementId of targetRequirementIds) {
      if (!designedRequirementIds.has(requirementId)) {
        errors.push(`${requirementId}: 外部仕様へ取り込まれていません`);
      }
    }

    return errors.length === 0 ? { passed: true } : { passed: false, errors };
  }
}
