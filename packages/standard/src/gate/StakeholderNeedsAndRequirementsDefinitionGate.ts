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
      }

      if (specification.stakeholders !== undefined) {
        if (specification.stakeholders !== null) {
          if (specification.stakeholders.length === 0) {
            errors.push(`${specification.id}: Stakeholderが不正です`);
          }

          if (specification.stakeholders.some((value) => !value.trim())) {
            errors.push(`${specification.id}: Stakeholderが不正です`);
          }
        }
      }

      if (specification.purpose === undefined) {
        errors.push(`${specification.id}: purposeが未確定です`);
      }

      if (specification.purpose !== undefined) {
        if (specification.purpose !== null && !specification.purpose.trim()) {
          errors.push(`${specification.id}: purposeが不正です`);
        }
      }

      if (specification.scope === undefined) {
        errors.push(`${specification.id}: scopeが未確定です`);
      }

      if (specification.scope !== undefined) {
        if (specification.scope !== null && !specification.scope.trim()) {
          errors.push(`${specification.id}: scopeが不正です`);
        }
      }

      if (specification.businessContext === undefined) {
        errors.push(`${specification.id}: business contextが未確定です`);
      }

      if (specification.businessContext !== undefined) {
        if (
          specification.businessContext !== null &&
          !specification.businessContext.trim()
        ) {
          errors.push(`${specification.id}: business contextが不正です`);
        }
      }

      if (specification.operationalContext === undefined) {
        errors.push(`${specification.id}: operational contextが未確定です`);
      }

      if (specification.operationalContext !== undefined) {
        if (
          specification.operationalContext !== null &&
          !specification.operationalContext.trim()
        ) {
          errors.push(`${specification.id}: operational contextが不正です`);
        }
      }

      if (specification.requirements === undefined) {
        errors.push(
          `${specification.id}: User / Stakeholder Requirementsが未確定です`,
        );
      }

      if (specification.requirements !== undefined) {
        if (specification.requirements !== null) {
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
      }

      if (specification.constraints === undefined) {
        errors.push(`${specification.id}: constraintsが未確定です`);
      }

      if (specification.constraints !== undefined) {
        if (specification.constraints !== null) {
          if (specification.constraints.some((value) => !value.trim())) {
            errors.push(`${specification.id}: constraintsに空の値があります`);
          }
        }
      }

      if (specification.scenarios === undefined) {
        errors.push(`${specification.id}: scenariosが未確定です`);
      }

      if (specification.scenarios !== undefined) {
        if (specification.scenarios !== null) {
          if (specification.scenarios.some((value) => !value.trim())) {
            errors.push(`${specification.id}: scenariosに空の値があります`);
          }
        }
      }

      if (specification.unresolvedItems === undefined) {
        errors.push(`${specification.id}: 未確定事項の確認が未完了です`);
      }

      if (specification.unresolvedItems !== undefined) {
        if (specification.unresolvedItems !== null) {
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
    }

    return errors.length === 0 ? { passed: true } : { passed: false, errors };
  }
}
