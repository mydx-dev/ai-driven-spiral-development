import type {
  GatePass,
  ProcessGate,
} from "@mydx-dev/ai-driven-spiral-development";
import type { IntegratedSoftware } from "../artifact/IntegratedSoftware.js";
import type { SoftwareRequirementsSpecification } from "../artifact/SoftwareRequirementsSpecification.js";
import type { VerificationResult } from "../artifact/VerificationResult.js";

export class VerificationGate implements ProcessGate<VerificationResult> {
  constructor(
    public readonly specifications: SoftwareRequirementsSpecification[],
    public readonly integratedSoftware: IntegratedSoftware[],
  ) {}

  verifyStructuralComplete(verifications: VerificationResult[]): GatePass {
    const errors: string[] = [];

    if (verifications.length === 0) {
      return { passed: false, errors: ["Verification Resultがありません"] };
    }

    const requirementKeys = new Set<string>();

    for (const specification of this.specifications) {
      if (specification.requirements === undefined) {
        errors.push(`${specification.id}: Software Requirementsが未確定です`);
        continue;
      }

      for (const requirement of specification.requirements ?? []) {
        requirementKeys.add(`${specification.id}:${requirement.id}`);
      }
    }

    const integratedSoftwareIds = new Set<string>();

    for (const software of this.integratedSoftware) {
      if (software.artifactReferences === undefined) {
        errors.push(`${software.id}: Integrated Softwareが未確定です`);
        continue;
      }

      if (software.artifactReferences !== null) {
        integratedSoftwareIds.add(software.id);
      }
    }

    const verifiedRequirementKeys = new Set<string>();

    for (const verification of verifications) {
      if (!verification.id.trim()) {
        errors.push("Verification Result識別子がありません");
      }

      if (!verification.cycleId.trim()) {
        errors.push(`${verification.id}: 対象Cycleがありません`);
      }

      if (verification.results === undefined) {
        errors.push(`${verification.id}: Verification結果が未確定です`);
        continue;
      }

      if (verification.results === null) {
        if (requirementKeys.size > 0) {
          errors.push(
            `${verification.id}: 検証対象Software Requirementが存在します`,
          );
        }
        continue;
      }

      const resultIds = new Set<string>();

      for (const result of verification.results) {
        if (!result.id.trim()) {
          errors.push(`${verification.id}: Verification結果識別子がありません`);
        } else if (resultIds.has(result.id)) {
          errors.push(
            `${verification.id}: Verification結果識別子が重複しています`,
          );
        } else {
          resultIds.add(result.id);
        }

        const requirementKey = `${result.requirement.specificationId}:${result.requirement.requirementId}`;

        if (
          !result.requirement.specificationId.trim() ||
          !result.requirement.requirementId.trim()
        ) {
          errors.push(`${verification.id}/${result.id}: SRS参照が不正です`);
        } else if (!requirementKeys.has(requirementKey)) {
          errors.push(
            `${verification.id}/${result.id}: 未知のSoftware Requirementを参照しています`,
          );
        } else if (verifiedRequirementKeys.has(requirementKey)) {
          errors.push(
            `${verification.id}/${result.id}: Software RequirementのVerification結果が重複しています`,
          );
        } else {
          verifiedRequirementKeys.add(requirementKey);
        }

        if (
          !result.integratedSoftwareId.trim() ||
          !integratedSoftwareIds.has(result.integratedSoftwareId)
        ) {
          errors.push(
            `${verification.id}/${result.id}: Verification対象Integrated Softwareを特定できません`,
          );
        }

        if (!result.method.trim()) {
          errors.push(
            `${verification.id}/${result.id}: Verification methodがありません`,
          );
        }

        if (
          result.evidence.length === 0 ||
          result.evidence.some((evidence) => !evidence.trim())
        ) {
          errors.push(
            `${verification.id}/${result.id}: objective evidenceがありません`,
          );
        }

        if (result.failureCause === undefined) {
          errors.push(
            `${verification.id}/${result.id}: failure原因の判定が未確定です`,
          );
        }

        if (result.unresolvedItems === undefined) {
          errors.push(
            `${verification.id}/${result.id}: 未解決事項の判定が未確定です`,
          );
        } else if (
          result.passed &&
          result.unresolvedItems !== null &&
          result.unresolvedItems.length > 0
        ) {
          errors.push(
            `${verification.id}/${result.id}: 未解決事項が残っています`,
          );
        }

        if (result.qualityReferences === undefined) {
          errors.push(
            `${verification.id}/${result.id}: Quality Requirement関連が未確定です`,
          );
        } else if (
          result.qualityReferences !== null &&
          result.qualityReferences.some((reference) => !reference.trim())
        ) {
          errors.push(
            `${verification.id}/${result.id}: Quality Requirement関連が不正です`,
          );
        }

        if (!result.passed) {
          if (result.failureCause === null || !result.failureCause?.trim()) {
            errors.push(
              `${verification.id}/${result.id}: fail原因がありません`,
            );
          }
          errors.push(
            `${verification.id}/${result.id}: VerificationがFAILしています`,
          );
        }
      }
    }

    for (const requirementKey of requirementKeys) {
      if (!verifiedRequirementKeys.has(requirementKey)) {
        errors.push(`${requirementKey}: Verification結果がありません`);
      }
    }

    return errors.length === 0 ? { passed: true } : { passed: false, errors };
  }
}
