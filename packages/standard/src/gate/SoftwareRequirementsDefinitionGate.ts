import type {
  GatePass,
  ProcessGate,
} from "@mydx-dev/ai-driven-spiral-development";
import type { SoftwareRequirementsSpecification } from "../artifact/SoftwareRequirementsSpecification.js";
import type { SystemArchitectureDescription } from "../artifact/SystemArchitectureDescription.js";
import type {
  SystemRequirement,
  SystemRequirementsSpecification,
} from "../artifact/SystemRequirementsSpecification.js";

export class SoftwareRequirementsDefinitionGate implements ProcessGate<SoftwareRequirementsSpecification> {
  constructor(
    public readonly systemArchitectures: SystemArchitectureDescription[],
    public readonly systemRequirementsSpecifications: SystemRequirementsSpecification[],
  ) {}

  verifyStructuralComplete(
    specifications: SoftwareRequirementsSpecification[],
  ): GatePass {
    const errors: string[] = [];

    if (specifications.length === 0) {
      return {
        passed: false,
        errors: ["Software Requirements Specificationがありません"],
      };
    }

    const systemRequirements = new Map<string, SystemRequirement>(
      this.systemRequirementsSpecifications.flatMap((specification) =>
        (specification.requirements ?? []).map(
          (requirement) =>
            [`${specification.id}:${requirement.id}`, requirement] as const,
        ),
      ),
    );
    const softwareAllocationKeys = new Set<string>();

    for (const architecture of this.systemArchitectures) {
      if (architecture.elements === undefined) {
        errors.push(`${architecture.id}: System Elementsが未確定です`);
        continue;
      }

      if (architecture.requirementAllocations === undefined) {
        errors.push(`${architecture.id}: Requirement allocationが未確定です`);
        continue;
      }

      const softwareElementIds = new Set(
        (architecture.elements ?? [])
          .filter((element) => element.type === "software")
          .map((element) => element.id),
      );

      for (const allocation of architecture.requirementAllocations ?? []) {
        for (const elementId of allocation.elementIds) {
          if (!softwareElementIds.has(elementId)) continue;

          softwareAllocationKeys.add(
            `${architecture.id}:${allocation.requirement.specificationId}:${allocation.requirement.requirementId}:${elementId}`,
          );
        }
      }
    }

    const tracedSoftwareAllocationKeys = new Set<string>();

    for (const specification of specifications) {
      if (!specification.id.trim()) {
        errors.push("SRS識別子がありません");
      }

      if (!specification.cycleId.trim()) {
        errors.push(`${specification.id}: 対象Cycleがありません`);
      }

      if (specification.purpose === undefined) {
        errors.push(`${specification.id}: Software purposeが未確定です`);
      } else if (
        specification.purpose !== null &&
        !specification.purpose.trim()
      ) {
        errors.push(`${specification.id}: Software purposeが不正です`);
      }

      if (specification.scope === undefined) {
        errors.push(`${specification.id}: Software scopeが未確定です`);
      } else if (specification.scope !== null && !specification.scope.trim()) {
        errors.push(`${specification.id}: Software scopeが不正です`);
      }

      const requirementIds = new Set<string>();

      if (specification.requirements === undefined) {
        errors.push(`${specification.id}: Software Requirementsが未確定です`);
      } else if (specification.requirements === null) {
        if (softwareAllocationKeys.size > 0) {
          errors.push(
            `${specification.id}: SRS化対象のSoftware allocationが存在します`,
          );
        }
      } else {
        if (specification.requirements.length === 0) {
          errors.push(`${specification.id}: Software Requirementsが不正です`);
        }

        for (const requirement of specification.requirements) {
          if (!requirement.id.trim()) {
            errors.push(
              `${specification.id}: Software Requirement識別子がありません`,
            );
          } else if (requirementIds.has(requirement.id)) {
            errors.push(
              `${specification.id}: Software Requirement識別子が重複しています`,
            );
          } else {
            requirementIds.add(requirement.id);
          }

          if (!requirement.statement.trim()) {
            errors.push(
              `${specification.id}/${requirement.id}: Requirement本文がありません`,
            );
          }

          if (
            requirement.verificationCriteria.length === 0 ||
            requirement.verificationCriteria.some((value) => !value.trim())
          ) {
            errors.push(
              `${specification.id}/${requirement.id}: 検証可能性を示すVerification Criteriaがありません`,
            );
          }

          if (requirement.tracesTo.length === 0) {
            errors.push(
              `${specification.id}/${requirement.id}: System Architecture allocationへのtraceabilityがありません`,
            );
          }

          for (const trace of requirement.tracesTo) {
            if (
              !trace.architectureId.trim() ||
              !trace.systemRequirementSpecificationId.trim() ||
              !trace.systemRequirementId.trim() ||
              !trace.softwareElementId.trim()
            ) {
              errors.push(
                `${specification.id}/${requirement.id}: System Architecture allocation traceabilityが不正です`,
              );
              continue;
            }

            const systemRequirementKey = `${trace.systemRequirementSpecificationId}:${trace.systemRequirementId}`;
            const allocationKey = `${trace.architectureId}:${systemRequirementKey}:${trace.softwareElementId}`;

            if (!softwareAllocationKeys.has(allocationKey)) {
              errors.push(
                `${specification.id}/${requirement.id}: 未知のSoftware allocationを参照しています`,
              );
            } else {
              tracedSoftwareAllocationKeys.add(allocationKey);
            }

            if (!systemRequirements.has(systemRequirementKey)) {
              errors.push(
                `${specification.id}/${requirement.id}: 未知のSyRS Requirementを参照しています`,
              );
            }
          }
        }
      }

      if (specification.unresolvedItems === undefined) {
        errors.push(`${specification.id}: unresolved itemsが未確定です`);
      } else if (specification.unresolvedItems !== null) {
        for (const item of specification.unresolvedItems) {
          if (!item.id.trim()) {
            errors.push(
              `${specification.id}: unresolved item識別子がありません`,
            );
          }

          if (!item.description.trim()) {
            errors.push(
              `${specification.id}/${item.id}: unresolved itemが不正です`,
            );
          }
        }
      }
    }

    for (const allocationKey of softwareAllocationKeys) {
      if (!tracedSoftwareAllocationKeys.has(allocationKey)) {
        errors.push(`${allocationKey}: SRSへのtraceabilityがありません`);
      }
    }

    return errors.length === 0 ? { passed: true } : { passed: false, errors };
  }
}
