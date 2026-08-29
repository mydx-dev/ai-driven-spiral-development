import type {
  GatePass,
  ProcessGate,
} from "@mydx-dev/ai-driven-spiral-development";
import type { StakeholderRequirementsSpecification } from "../artifact/StakeholderRequirementsSpecification.js";

export class StakeholderNeedsAndRequirementsDefinitionGate implements ProcessGate<StakeholderRequirementsSpecification> {
  verifyStructuralComplete(
    specifications: StakeholderRequirementsSpecification[],
  ): GatePass {
    const errors: string[] = [];

    if (specifications.length === 0) {
      errors.push("StRSが1件も存在しません");
    }

    for (const specification of specifications) {
      const {
        id,
        cycleId,
        stakeholders,
        purpose,
        scope,
        businessContext,
        operationalContext,
        requirements,
        constraints,
        scenarios,
        unresolvedItems,
      } = specification;

      if (!id.trim()) {
        errors.push("StRS識別子がありません");
      }

      if (!cycleId.trim()) {
        errors.push(`${id}: 対象Cycleがありません`);
      }

      if (stakeholders === undefined) {
        errors.push(`${id}: Stakeholderが未確定です`);
      } else if (stakeholders !== null) {
        if (stakeholders.length === 0) {
          errors.push(`${id}: Stakeholderが不正です`);
        }

        if (stakeholders.some((value) => !value.trim())) {
          errors.push(`${id}: Stakeholderが不正です`);
        }
      }

      if (purpose === undefined) {
        errors.push(`${id}: purposeが未確定です`);
      } else if (purpose !== null && !purpose.trim()) {
        errors.push(`${id}: purposeが不正です`);
      }

      if (scope === undefined) {
        errors.push(`${id}: scopeが未確定です`);
      } else if (scope !== null && !scope.trim()) {
        errors.push(`${id}: scopeが不正です`);
      }

      if (businessContext === undefined) {
        errors.push(`${id}: business contextが未確定です`);
      } else if (businessContext !== null && !businessContext.trim()) {
        errors.push(`${id}: business contextが不正です`);
      }

      if (operationalContext === undefined) {
        errors.push(`${id}: operational contextが未確定です`);
      } else if (operationalContext !== null && !operationalContext.trim()) {
        errors.push(`${id}: operational contextが不正です`);
      }

      if (requirements === undefined) {
        errors.push(`${id}: User / Stakeholder Requirementsが未確定です`);
      } else if (requirements !== null) {
        if (requirements.length === 0) {
          errors.push(`${id}: User / Stakeholder Requirementsが不正です`);
        }

        for (const requirement of requirements) {
          if (!requirement.id.trim()) {
            errors.push(`${id}: Requirement識別子がありません`);
          }

          if (!requirement.statement.trim()) {
            errors.push(
              `${id}/${requirement.id}: Requirementが記述されていません`,
            );
          }

          if (!requirement.source.trim()) {
            errors.push(
              `${id}/${requirement.id}: Requirement sourceがありません`,
            );
          }
        }
      }

      if (constraints === undefined) {
        errors.push(`${id}: constraintsが未確定です`);
      } else if (
        constraints !== null &&
        constraints.some((value) => !value.trim())
      ) {
        errors.push(`${id}: constraintsに空の値があります`);
      }

      if (scenarios === undefined) {
        errors.push(`${id}: scenariosが未確定です`);
      } else if (
        scenarios !== null &&
        scenarios.some((value) => !value.trim())
      ) {
        errors.push(`${id}: scenariosに空の値があります`);
      }

      if (unresolvedItems === undefined) {
        errors.push(`${id}: 未確定事項の確認が未完了です`);
      } else if (unresolvedItems !== null) {
        for (const unresolvedItem of unresolvedItems) {
          if (!unresolvedItem.id.trim()) {
            errors.push(`${id}: 未確定事項の識別子がありません`);
          }

          if (!unresolvedItem.description.trim()) {
            errors.push(
              `${id}/${unresolvedItem.id}: 未確定事項が記述されていません`,
            );
          }
        }
      }
    }

    return errors.length === 0 ? { passed: true } : { passed: false, errors };
  }
}
