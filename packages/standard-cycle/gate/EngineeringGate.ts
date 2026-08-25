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

    const implementedFeatureIds = new Set(
      implementation.features.map((feature) => feature.featureId),
    );

    for (const featureId of implementation.featureIds) {
      if (!implementedFeatureIds.has(featureId)) {
        errors.push(`${featureId}: 実装成果物が存在しません`);
      }
    }

    if (implementation.features.length === 0) {
      errors.push("実装対象となるFeatureが存在しません");
    }

    for (const feature of implementation.features) {
      if (!implementation.featureIds.includes(feature.featureId)) {
        errors.push(`${feature.featureId}: 実装対象ではないFeatureです`);
      }

      if (!feature.featureId.trim()) {
        errors.push("Feature識別子がありません");
      }

      if (!feature.testPassed) {
        errors.push(`${feature.featureId}: テストが成功していません`);
      }

      if (!feature.staticAnalysisPassed) {
        errors.push(`${feature.featureId}: 静的解析が成功していません`);
      }

      if (!feature.buildPassed) {
        errors.push(`${feature.featureId}: Buildが成功していません`);
      }

      if (!feature.reviewResolved) {
        errors.push(`${feature.featureId}: Reviewが完了していません`);
      }

      if (!feature.integrated) {
        errors.push(`${feature.featureId}: 実装成果物が統合されていません`);
      }
    }

    return errors.length === 0 ? { passed: true } : { passed: false, errors };
  }
}
