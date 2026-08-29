import type {
  GatePass,
  ProcessGate,
} from "@mydx-dev/ai-driven-spiral-development";
import type {
  StakeholderRequirementsSpecification,
} from "../artifact/StakeholderRequirementsSpecification.js";

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

      if (specification.stakeholders === undefined) {
        errors.push(`${specification.id}: Stakeholderが未確定です`);
      } else if (
        specification.stakeholders !== null &&
        (specification.stakeholders.length === 0 ||
          specification.stakeholders.some(
            (stakeholder) => !stakeholder.trim(),
          ))
      ) {
        errors.push(`${specification.id}: Stakeholderが不正です`);
      }

      if (specification.purpose === undefined) {
        errors.push(`${specification.id}: purposeが未確定です`);
      } else if (
        specification.purpose !== null &&
        !specification.purpose.trim()
      ) {
        errors.push(`${specification.id}: purposeが不正です`);
      }

      if (specification.scope === undefined) {
        errors.push(`${specification.id}: scopeが未確定です`);
      } else if (specification.scope !== null && !specification.scope.trim()) {
        errors.push(`${specification.id}: scopeが不正です`);
      }

      if (specification.businessContext === undefined) {
        errors.push(`${specification.id}: business contextが未確定です`);
      } else if (
        specification.businessContext !== null &&
        !specification.businessContext.trim()
      ) {
        errors.push(`${specification.id}: business contextが不正です`);
      }

      if (specification.operationalContext === undefined) {
        errors.push(`${specification.id}: operational contextが未確定です`);
      } else if (
        specification.operationalContext !== null &&
        !specification.operationalContext.trim()
      ) {
        errors.push(`${specification.id}: operational contextが不正です`);
      }

      if (specification.requirements === undefined) {
        errors.push(
          `${specification.id}: User / Stakeholder Requirementsが未確定です`,
        );
      } else if (specification.requirements !== null) {
        if (specification.requirements.length === 0) {
          errors.push(
            `${specification.id}: User / Stakeholder Requirementsが不正です`,
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
      }

      if (specification.constraints === undefined) {
        errors.push(`${specification.id}: constraintsが未確定です`);
      } else if (
        specification.constraints !== null &&
        specification.constraints.some((constraint) => !constraint.trim())
      ) {
        errors.push(`${specification.id}: constraintsに空の値があります`);
      }

      if (specification.scenarios === undefined) {
        errors.push(`${specification.id}: scenariosが未確定です`);
      } else if (
        specification.scenarios !== null &&
        specification.scenarios.some((scenario) => !scenario.trim())
      ) {
        errors.push(`${specification.id}: scenariosに空の値があります`);
      }

      if (specification.unresolvedItems === undefined) {
        errors.push(`${specification.id}: 未確定事項の確認が未完了です`);
      } else if (specification.unresolvedItems !== null) {
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
    }

    return errors.length === 0 ? { passed: true } : { passed: false, errors };
  }
}
