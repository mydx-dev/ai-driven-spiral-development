import type {
  GatePass,
  ProcessGate,
} from "@mydx-dev/ai-driven-spiral-development";
import type { RequirementAllocation } from "../artifact/RequirementAllocation.js";
import type { SoftwareRequirementsSpecification } from "../artifact/SoftwareRequirementsSpecification.js";
import type { SystemArchitecture } from "../artifact/SystemArchitecture.js";
import type { SystemRequirementsSpecification } from "../artifact/SystemRequirementsSpecification.js";

export class SoftwareRequirementsDefinitionGate implements ProcessGate<SoftwareRequirementsSpecification> {
  constructor(
    public readonly systemArchitectures: SystemArchitecture[],
    public readonly requirementAllocations: RequirementAllocation[],
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

    const systemRequirements = new Map(
      this.systemRequirementsSpecifications.flatMap((specification) =>
        (specification.requirements ?? []).map(
          (requirement) =>
            [`${specification.id}:${requirement.id}`, requirement] as const,
        ),
      ),
    );
    const softwareElementIds = new Set(
      this.systemArchitectures.flatMap((architecture) =>
        (architecture.elements ?? [])
          .filter((element) => element.type === "software")
          .map((element) => element.id),
      ),
    );
    const softwareAllocationKeys = new Set<string>();

    for (const allocation of this.requirementAllocations) {
      if (allocation.allocations === undefined) {
        errors.push(`${allocation.id}: Requirement allocationが未確定です`);
        continue;
      }

      if (allocation.allocations === null) {
        continue;
      }

      for (const entry of allocation.allocations) {
        for (const elementId of entry.elementIds) {
          if (!softwareElementIds.has(elementId)) {
            continue;
          }

          softwareAllocationKeys.add(
            `${allocation.id}:${entry.requirement.specificationId}:${entry.requirement.requirementId}:${elementId}`,
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
              `${specification.id}/${requirement.id}: Requirement Allocationへのtraceabilityがありません`,
            );
          }

          for (const trace of requirement.tracesTo) {
            if (
              !trace.allocationId.trim() ||
              !trace.systemRequirementSpecificationId.trim() ||
              !trace.systemRequirementId.trim() ||
              !trace.softwareElementId.trim()
            ) {
              errors.push(
                `${specification.id}/${requirement.id}: Allocation traceabilityが不正です`,
              );
              continue;
            }

            const systemRequirementKey = `${trace.systemRequirementSpecificationId}:${trace.systemRequirementId}`;
            const systemRequirement =
              systemRequirements.get(systemRequirementKey);
            const allocationKey = `${trace.allocationId}:${systemRequirementKey}:${trace.softwareElementId}`;

            if (!softwareElementIds.has(trace.softwareElementId)) {
              errors.push(
                `${specification.id}/${requirement.id}: Software以外のSystem Elementを参照しています`,
              );
            }

            if (!softwareAllocationKeys.has(allocationKey)) {
              errors.push(
                `${specification.id}/${requirement.id}: 未知のSoftware allocationを参照しています`,
              );
            } else {
              tracedSoftwareAllocationKeys.add(allocationKey);
            }

            if (!systemRequirement) {
              errors.push(
                `${specification.id}/${requirement.id}: 未知のSyRS Requirementを参照しています`,
              );
            } else if (systemRequirement.tracesTo.length === 0) {
              errors.push(
                `${specification.id}/${requirement.id}: StRSまでtraceabilityが到達しません`,
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
