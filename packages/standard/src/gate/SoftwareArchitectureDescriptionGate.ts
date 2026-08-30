import type {
  GatePass,
  ProcessGate,
} from "@mydx-dev/ai-driven-spiral-development";
import type { SoftwareArchitectureDescription } from "../artifact/SoftwareArchitectureDescription.js";
import type { SoftwareRequirementsSpecification } from "../artifact/SoftwareRequirementsSpecification.js";

export class SoftwareArchitectureDescriptionGate implements ProcessGate<SoftwareArchitectureDescription> {
  constructor(
    public readonly softwareRequirementsSpecifications: SoftwareRequirementsSpecification[],
  ) {}

  verifyStructuralComplete(
    architectures: SoftwareArchitectureDescription[],
  ): GatePass {
    const errors: string[] = [];

    if (architectures.length !== 1) {
      return {
        passed: false,
        errors: [
          "対象CycleのSoftware Architecture Descriptionを一意に特定できません",
        ],
      };
    }

    const architecture = architectures[0];
    const requirementKeys = new Set<string>();
    let requirementsComplete = true;

    for (const specification of this.softwareRequirementsSpecifications) {
      if (specification.requirements === undefined) {
        requirementsComplete = false;
        errors.push(`${specification.id}: Software Requirementsが未確定です`);
        continue;
      }

      for (const requirement of specification.requirements ?? []) {
        requirementKeys.add(`${specification.id}:${requirement.id}`);
      }
    }

    if (!architecture.id.trim()) {
      errors.push("Software Architecture Description識別子がありません");
    }

    if (!architecture.cycleId.trim()) {
      errors.push(`${architecture.id}: 対象Cycleがありません`);
    }

    const elementIds = new Set<string>();

    if (architecture.elements === undefined) {
      errors.push(`${architecture.id}: Software Elementsが未確定です`);
    } else if (architecture.elements === null) {
      if (requirementsComplete && requirementKeys.size > 0) {
        errors.push(
          `${architecture.id}: allocation対象のSRS Requirementが存在します`,
        );
      }
    } else {
      for (const element of architecture.elements) {
        if (!element.id.trim()) {
          errors.push(`${architecture.id}: Software Element識別子がありません`);
        } else if (elementIds.has(element.id)) {
          errors.push(
            `${architecture.id}: Software Element識別子が重複しています`,
          );
        } else {
          elementIds.add(element.id);
        }

        if (!element.name.trim()) {
          errors.push(
            `${architecture.id}/${element.id}: Element名がありません`,
          );
        }

        if (
          element.responsibilities.length === 0 ||
          element.responsibilities.some((value) => !value.trim())
        ) {
          errors.push(
            `${architecture.id}/${element.id}: 責務境界が定義されていません`,
          );
        }
      }
    }

    if (architecture.relationships === undefined) {
      errors.push(`${architecture.id}: Software relationshipsが未確定です`);
    } else if (architecture.relationships !== null) {
      for (const relationship of architecture.relationships) {
        if (
          !elementIds.has(relationship.sourceElementId) ||
          !elementIds.has(relationship.targetElementId) ||
          !relationship.description.trim()
        ) {
          errors.push(`${architecture.id}: Software relationshipが不正です`);
        }
      }
    }

    const interfaceIds = new Set<string>();

    if (architecture.interfaces === undefined) {
      errors.push(`${architecture.id}: Software interfacesが未確定です`);
    } else if (architecture.interfaces !== null) {
      for (const softwareInterface of architecture.interfaces) {
        if (!softwareInterface.id.trim()) {
          errors.push(`${architecture.id}: interface識別子がありません`);
        } else if (interfaceIds.has(softwareInterface.id)) {
          errors.push(`${architecture.id}: interface識別子が重複しています`);
        } else {
          interfaceIds.add(softwareInterface.id);
        }

        if (
          !softwareInterface.name.trim() ||
          !softwareInterface.contract.trim() ||
          !elementIds.has(softwareInterface.providedByElementId) ||
          softwareInterface.consumedByElementIds.some(
            (elementId) => !elementIds.has(elementId),
          )
        ) {
          errors.push(
            `${architecture.id}/${softwareInterface.id}: interfaceが不正です`,
          );
        }
      }
    }

    const allocatedRequirementKeys = new Set<string>();

    if (architecture.requirementAllocations === undefined) {
      errors.push(`${architecture.id}: SRS Requirement allocationが未確定です`);
    } else if (architecture.requirementAllocations === null) {
      if (requirementsComplete && requirementKeys.size > 0) {
        errors.push(`${architecture.id}: SRS Requirement allocationが必要です`);
      }
    } else {
      for (const allocation of architecture.requirementAllocations) {
        const key = `${allocation.requirement.specificationId}:${allocation.requirement.requirementId}`;

        if (
          !allocation.requirement.specificationId.trim() ||
          !allocation.requirement.requirementId.trim() ||
          (requirementsComplete && !requirementKeys.has(key)) ||
          allocation.elementIds.length === 0 ||
          allocation.elementIds.some((elementId) => !elementIds.has(elementId))
        ) {
          errors.push(
            `${architecture.id}/${key}: Requirement allocationが不正です`,
          );
          continue;
        }

        if (allocatedRequirementKeys.has(key)) {
          errors.push(
            `${architecture.id}/${key}: Requirement allocationが重複しています`,
          );
        } else {
          allocatedRequirementKeys.add(key);
        }
      }
    }

    if (requirementsComplete) {
      for (const requirementKey of requirementKeys) {
        if (!allocatedRequirementKeys.has(requirementKey)) {
          errors.push(
            `${requirementKey}: Software Elementへのallocationがありません`,
          );
        }
      }
    }

    if (architecture.decisions === undefined) {
      errors.push(`${architecture.id}: architecture decisionsが未確定です`);
    } else if (architecture.decisions !== null) {
      const decisionIds = new Set<string>();

      for (const decision of architecture.decisions) {
        if (
          !decision.id.trim() ||
          decisionIds.has(decision.id) ||
          !decision.statement.trim()
        ) {
          errors.push(`${architecture.id}: architecture decisionが不正です`);
        } else {
          decisionIds.add(decision.id);
        }

        for (const trace of decision.tracesTo) {
          const key = `${trace.specificationId}:${trace.requirementId}`;
          if (
            !trace.specificationId.trim() ||
            !trace.requirementId.trim() ||
            (requirementsComplete && !requirementKeys.has(key))
          ) {
            errors.push(
              `${architecture.id}/${decision.id}: SRS traceabilityが不正です`,
            );
          }
        }
      }
    }

    return errors.length === 0 ? { passed: true } : { passed: false, errors };
  }
}
