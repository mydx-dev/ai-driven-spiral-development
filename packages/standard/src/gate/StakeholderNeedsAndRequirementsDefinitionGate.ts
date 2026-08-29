import type {
  GatePass,
  ProcessGate,
} from "@mydx-dev/ai-driven-spiral-development";
import type { StakeholderRequirementsSpecification } from "../artifact/StakeholderRequirementsSpecification.js";

export class StakeholderNeedsAndRequirementsDefinitionGate
  implements ProcessGate<StakeholderRequirementsSpecification>
{
  verifyStructuralComplete(
    specifications: StakeholderRequirementsSpecification[],
  ): GatePass {
    const errors: string[] = [];

    if (specifications.length === 0) {
      errors.push("StRSが1件も存在しません");
    }

    for (const specification of specifications) {
      if (!specification.id.trim()) {
        errors.push("StRS識別子がありません");
      }

      if (!specification.cycleId.trim()) {
        errors.push(`${specification.id}: 対象Cycleがありません`);
      }

      if (
        specification.stakeholders.length === 0 ||
        specification.stakeholders.some((stakeholder) => !stakeholder.trim())
      ) {
        errors.push(`${specification.id}: Stakeholderが識別されていません`);
      }

      if (!specification.purpose.trim()) {
        errors.push(`${specification.id}: purposeが定義されていません`);
      }

      if (!specification.scope.trim()) {
        errors.push(`${specification.id}: scopeが定義されていません`);
      }

      if (!specification.businessContext.trim()) {
        errors.push(
          `${specification.id}: business contextが記述されていません`,
        );
      }

      if (!specification.operationalContext.trim()) {
        errors.push(
          `${specification.id}: operational contextが記述されていません`,
        );
      }

      if (specification.requirements.length === 0) {
        errors.push(
          `${specification.id}: User / Stakeholder Requirementsがありません`,
        );
      }

      for (const requirement of specification.requirements) {
        if (!requirement.id.trim()) {
          errors.push(`${specification.id}: Requirement識別子がありません`);
        }

        if (!requirement.statement.trim()) {
          errors.push(
            `${specification.id}/${requirement.id}: Requirementが記述されていません`,
          );
        }

        if (!requirement.source.trim()) {
          errors.push(
            `${specification.id}/${requirement.id}: Requirement sourceがありません`,
          );
        }
      }

      for (const unresolvedItem of specification.unresolvedItems) {
        if (!unresolvedItem.id.trim()) {
          errors.push(`${specification.id}: 未確定事項の識別子がありません`);
        }

        if (!unresolvedItem.description.trim()) {
          errors.push(
            `${specification.id}/${unresolvedItem.id}: 未確定事項が記述されていません`,
          );
        }
      }
    }

    return errors.length === 0 ? { passed: true } : { passed: false, errors };
  }
}
