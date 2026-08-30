import type {
  GatePass,
  ProcessGate,
} from "@mydx-dev/ai-driven-spiral-development";
import type { StakeholderRequirementsSpecification } from "../artifact/StakeholderRequirementsSpecification.js";
import type { ValidationResult } from "../artifact/ValidationResult.js";

export class ValidationGate implements ProcessGate<ValidationResult> {
  constructor(
    public readonly stakeholderSpecifications: StakeholderRequirementsSpecification[],
  ) {}

  verifyStructuralComplete(validations: ValidationResult[]): GatePass {
    const errors: string[] = [];

    if (validations.length === 0) {
      return { passed: false, errors: ["Validation Resultがありません"] };
    }

    const stakeholderRequirementKeys = new Set<string>();

    for (const specification of this.stakeholderSpecifications) {
      if (specification.requirements === undefined) {
        errors.push(`${specification.id}: Stakeholder Requirementsが未確定です`);
        continue;
      }

      for (const requirement of specification.requirements ?? []) {
        stakeholderRequirementKeys.add(`${specification.id}:${requirement.id}`);
      }
    }

    const validatedRequirementKeys = new Set<string>();

    for (const validation of validations) {
      if (!validation.id.trim()) {
        errors.push("Validation Result識別子がありません");
      }

      if (!validation.cycleId.trim()) {
        errors.push(`${validation.id}: 対象Cycleがありません`);
      }

      if (validation.results === undefined) {
        errors.push(`${validation.id}: Validation結果が未確定です`);
        continue;
      }

      if (validation.results === null) {
        if (stakeholderRequirementKeys.size > 0) {
          errors.push(
            `${validation.id}: Validation対象Stakeholder Requirementが存在します`,
          );
        }
        continue;
      }

      const resultIds = new Set<string>();

      for (const result of validation.results) {
        if (!result.id.trim()) {
          errors.push(`${validation.id}: Validation結果識別子がありません`);
        } else if (resultIds.has(result.id)) {
          errors.push(`${validation.id}: Validation結果識別子が重複しています`);
        } else {
          resultIds.add(result.id);
        }

        const stakeholderRequirementKey = `${result.stakeholderRequirement.specificationId}:${result.stakeholderRequirement.requirementId}`;

        if (
          !result.stakeholderRequirement.specificationId.trim() ||
          !result.stakeholderRequirement.requirementId.trim()
        ) {
          errors.push(`${validation.id}/${result.id}: StRS参照が不正です`);
        } else if (!stakeholderRequirementKeys.has(stakeholderRequirementKey)) {
          errors.push(
            `${validation.id}/${result.id}: 未知のStakeholder Requirementを参照しています`,
          );
        } else if (validatedRequirementKeys.has(stakeholderRequirementKey)) {
          errors.push(
            `${validation.id}/${result.id}: Stakeholder RequirementのValidation結果が重複しています`,
          );
        } else {
          validatedRequirementKeys.add(stakeholderRequirementKey);
        }

        if (!result.intendedUse.trim()) {
          errors.push(`${validation.id}/${result.id}: intended useがありません`);
        }

        if (!result.scenario.trim()) {
          errors.push(`${validation.id}/${result.id}: scenarioがありません`);
        }

        if (!result.method.trim()) {
          errors.push(`${validation.id}/${result.id}: Validation methodがありません`);
        }

        if (
          result.evidence.length === 0 ||
          result.evidence.some((evidence) => !evidence.trim())
        ) {
          errors.push(`${validation.id}/${result.id}: Validation evidenceがありません`);
        }

        if (result.systemRequirements === undefined) {
          errors.push(`${validation.id}/${result.id}: System traceabilityが未確定です`);
        } else if (
          result.systemRequirements !== null &&
          result.systemRequirements.some(
            (reference) =>
              !reference.specificationId.trim() || !reference.requirementId.trim(),
          )
        ) {
          errors.push(`${validation.id}/${result.id}: System traceabilityが不正です`);
        }

        if (result.softwareRequirements === undefined) {
          errors.push(`${validation.id}/${result.id}: Software traceabilityが未確定です`);
        } else if (
          result.softwareRequirements !== null &&
          result.softwareRequirements.some(
            (reference) =>
              !reference.specificationId.trim() || !reference.requirementId.trim(),
          )
        ) {
          errors.push(`${validation.id}/${result.id}: Software traceabilityが不正です`);
        }

        if (result.verificationResultIds === undefined) {
          errors.push(`${validation.id}/${result.id}: Verification traceabilityが未確定です`);
        } else if (
          result.verificationResultIds !== null &&
          result.verificationResultIds.some((id) => !id.trim())
        ) {
          errors.push(`${validation.id}/${result.id}: Verification traceabilityが不正です`);
        }

        if (result.feedback === undefined) {
          errors.push(`${validation.id}/${result.id}: Stakeholder feedbackが未確定です`);
        } else if (
          result.feedback !== null &&
          result.feedback.some((feedback) => !feedback.trim())
        ) {
          errors.push(`${validation.id}/${result.id}: Stakeholder feedbackが不正です`);
        }

        if (result.feedbackCandidates === undefined) {
          errors.push(`${validation.id}/${result.id}: Feedback候補が未確定です`);
        } else if (!result.passed) {
          if (
            result.feedbackCandidates === null ||
            result.feedbackCandidates.length === 0
          ) {
            errors.push(
              `${validation.id}/${result.id}: Validation FAILを次Cycleへ引き継ぐFeedback候補がありません`,
            );
          } else if (
            result.feedbackCandidates.some(
              (candidate) =>
                !candidate.id.trim() ||
                !candidate.description.trim() ||
                candidate.evidence.length === 0 ||
                candidate.evidence.some((evidence) => !evidence.trim()),
            )
          ) {
            errors.push(`${validation.id}/${result.id}: Feedback候補が不正です`);
          }
        }
      }
    }

    for (const requirementKey of stakeholderRequirementKeys) {
      if (!validatedRequirementKeys.has(requirementKey)) {
        errors.push(`${requirementKey}: Validation結果がありません`);
      }
    }

    return errors.length === 0 ? { passed: true } : { passed: false, errors };
  }
}
