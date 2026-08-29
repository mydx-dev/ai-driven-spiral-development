import type {
  GatePass,
  ProcessGate,
} from "@mydx-dev/ai-driven-spiral-development";
import type { SystemRequirementsSpecification } from "../artifact/SystemRequirementsSpecification.js";

export class SystemRequirementsDefinitionGate implements ProcessGate<SystemRequirementsSpecification> {
  verifyStructuralComplete(
    specifications: SystemRequirementsSpecification[],
  ): GatePass {
    const errors: string[] = [];

    if (specifications.length === 0) {
      errors.push("SyRSが1件も存在しません");
    }

    for (const specification of specifications) {
      const {
        id,
        cycleId,
        purpose,
        scope,
        overview,
        requirements,
        assumptions,
        dependencies,
        unresolvedItems,
      } = specification;

      if (!id.trim()) {
        errors.push("SyRS識別子がありません");
      }

      if (!cycleId.trim()) {
        errors.push(`${id}: 対象Cycleがありません`);
      }

      if (purpose === undefined) {
        errors.push(`${id}: system purposeが未確定です`);
      } else if (purpose !== null && !purpose.trim()) {
        errors.push(`${id}: system purposeが不正です`);
      }

      if (scope === undefined) {
        errors.push(`${id}: system scopeが未確定です`);
      } else if (scope !== null && !scope.trim()) {
        errors.push(`${id}: system scopeが不正です`);
      }

      if (overview === undefined) {
        errors.push(`${id}: system overviewが未確定です`);
      } else if (overview !== null && !overview.trim()) {
        errors.push(`${id}: system overviewが不正です`);
      }

      if (requirements === undefined) {
        errors.push(`${id}: System Requirementsが未確定です`);
      } else if (requirements !== null) {
        if (requirements.length === 0) {
          errors.push(`${id}: System Requirementsが不正です`);
        }

        for (const requirement of requirements) {
          if (!requirement.id.trim()) {
            errors.push(`${id}: System Requirement識別子がありません`);
          }

          if (!requirement.statement.trim()) {
            errors.push(
              `${id}/${requirement.id}: System Requirementが記述されていません`,
            );
          }

          if (requirement.tracesTo.length === 0) {
            errors.push(
              `${id}/${requirement.id}: StRSへのtraceabilityがありません`,
            );
          }

          for (const trace of requirement.tracesTo) {
            if (!trace.specificationId.trim() || !trace.requirementId.trim()) {
              errors.push(
                `${id}/${requirement.id}: StRSへのtraceabilityが不正です`,
              );
            }
          }
        }
      }

      if (assumptions === undefined) {
        errors.push(`${id}: assumptionsが未確定です`);
      } else if (
        assumptions !== null &&
        assumptions.some((value) => !value.trim())
      ) {
        errors.push(`${id}: assumptionsに空の値があります`);
      }

      if (dependencies === undefined) {
        errors.push(`${id}: dependenciesが未確定です`);
      } else if (
        dependencies !== null &&
        dependencies.some((value) => !value.trim())
      ) {
        errors.push(`${id}: dependenciesに空の値があります`);
      }

      if (unresolvedItems === undefined) {
        errors.push(`${id}: unresolved itemsの確認が未完了です`);
      } else if (unresolvedItems !== null) {
        for (const unresolvedItem of unresolvedItems) {
          if (!unresolvedItem.id.trim()) {
            errors.push(`${id}: unresolved itemの識別子がありません`);
          }

          if (!unresolvedItem.description.trim()) {
            errors.push(
              `${id}/${unresolvedItem.id}: unresolved itemが記述されていません`,
            );
          }
        }
      }
    }

    return errors.length === 0 ? { passed: true } : { passed: false, errors };
  }
}
