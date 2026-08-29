import type {
  GatePass,
  ProcessGate,
} from "@mydx-dev/ai-driven-spiral-development";
import type { SoftwareDesign } from "../artifact/SoftwareDesign.js";
import type { SoftwareRequirementsSpecification } from "../artifact/SoftwareRequirementsSpecification.js";

export class SoftwareDesignGate implements ProcessGate<SoftwareDesign> {
  constructor(
    public readonly softwareRequirementsSpecifications: SoftwareRequirementsSpecification[],
  ) {}

  verifyStructuralComplete(designs: SoftwareDesign[]): GatePass {
    const errors: string[] = [];

    if (designs.length === 0) {
      return {
        passed: false,
        errors: ["Software Designがありません"],
      };
    }

    const softwareRequirementKeys = new Set(
      this.softwareRequirementsSpecifications.flatMap((specification) =>
        (specification.requirements ?? []).map(
          (requirement) => `${specification.id}:${requirement.id}`,
        ),
      ),
    );
    const allocatedRequirementKeys = new Set<string>();

    for (const design of designs) {
      if (!design.id.trim()) {
        errors.push("Software Design識別子がありません");
      }

      if (!design.cycleId.trim()) {
        errors.push(`${design.id}: 対象Cycleがありません`);
      }

      const elementIds = new Set<string>();

      if (design.elements === undefined) {
        errors.push(`${design.id}: Software Elementsが未確定です`);
      } else if (design.elements === null) {
        if (softwareRequirementKeys.size > 0) {
          errors.push(`${design.id}: 設計対象のSoftware Requirementが存在します`);
        }
      } else {
        if (design.elements.length === 0 && softwareRequirementKeys.size > 0) {
          errors.push(`${design.id}: Software Elementsが不正です`);
        }

        for (const element of design.elements) {
          if (!element.id.trim()) {
            errors.push(`${design.id}: Software Element識別子がありません`);
          } else if (elementIds.has(element.id)) {
            errors.push(`${design.id}: Software Element識別子が重複しています`);
          } else {
            elementIds.add(element.id);
          }

          if (!element.name.trim()) {
            errors.push(`${design.id}/${element.id}: Element名がありません`);
          }

          if (
            element.responsibilities.length === 0 ||
            element.responsibilities.some((value) => !value.trim())
          ) {
            errors.push(`${design.id}/${element.id}: 責務境界が定義されていません`);
          }

          if (element.data === undefined) {
            errors.push(`${design.id}/${element.id}: data設計が未確定です`);
          } else if (
            element.data !== null &&
            element.data.some((value) => !value.trim())
          ) {
            errors.push(`${design.id}/${element.id}: data設計が不正です`);
          }

          if (element.state === undefined) {
            errors.push(`${design.id}/${element.id}: state設計が未確定です`);
          } else if (
            element.state !== null &&
            element.state.some((value) => !value.trim())
          ) {
            errors.push(`${design.id}/${element.id}: state設計が不正です`);
          }

          if (element.behavior === undefined) {
            errors.push(`${design.id}/${element.id}: behavior設計が未確定です`);
          } else if (
            element.behavior !== null &&
            element.behavior.some((value) => !value.trim())
          ) {
            errors.push(`${design.id}/${element.id}: behavior設計が不正です`);
          }
        }
      }

      if (design.relationships === undefined) {
        errors.push(`${design.id}: relationship / dependencyが未確定です`);
      } else if (design.relationships !== null) {
        for (const relationship of design.relationships) {
          if (
            !elementIds.has(relationship.sourceElementId) ||
            !elementIds.has(relationship.targetElementId)
          ) {
            errors.push(`${design.id}: 未知のSoftware Element間relationshipがあります`);
          }

          if (!relationship.description.trim()) {
            errors.push(`${design.id}: relationshipの説明がありません`);
          }
        }
      }

      const interfaceIds = new Set<string>();

      if (design.interfaces === undefined) {
        errors.push(`${design.id}: interface設計が未確定です`);
      } else if (design.interfaces !== null) {
        for (const softwareInterface of design.interfaces) {
          if (!softwareInterface.id.trim()) {
            errors.push(`${design.id}: interface識別子がありません`);
          } else if (interfaceIds.has(softwareInterface.id)) {
            errors.push(`${design.id}: interface識別子が重複しています`);
          } else {
            interfaceIds.add(softwareInterface.id);
          }

          if (
            !softwareInterface.name.trim() ||
            !softwareInterface.contract.trim()
          ) {
            errors.push(`${design.id}/${softwareInterface.id}: interface設計が不正です`);
          }

          if (!elementIds.has(softwareInterface.providedByElementId)) {
            errors.push(`${design.id}/${softwareInterface.id}: interface提供Elementが不正です`);
          }

          if (
            softwareInterface.consumedByElementIds.some(
              (elementId) => !elementIds.has(elementId),
            )
          ) {
            errors.push(`${design.id}/${softwareInterface.id}: interface利用Elementが不正です`);
          }
        }
      }

      if (design.requirementAllocations === undefined) {
        errors.push(`${design.id}: SRS Requirement allocationが未確定です`);
      } else if (design.requirementAllocations === null) {
        if (softwareRequirementKeys.size > 0) {
          errors.push(`${design.id}: Software Requirementの設計allocationが必要です`);
        }
      } else {
        for (const allocation of design.requirementAllocations) {
          const requirementKey = `${allocation.requirement.specificationId}:${allocation.requirement.requirementId}`;

          if (
            !allocation.requirement.specificationId.trim() ||
            !allocation.requirement.requirementId.trim()
          ) {
            errors.push(`${design.id}: SRS Requirement参照が不正です`);
            continue;
          }

          if (!softwareRequirementKeys.has(requirementKey)) {
            errors.push(`${design.id}: 未知のSRS Requirementを参照しています`);
          }

          if (
            allocation.elementIds.length === 0 ||
            allocation.elementIds.some((elementId) => !elementIds.has(elementId))
          ) {
            errors.push(`${design.id}: Software RequirementのElement allocationが不正です`);
          } else if (softwareRequirementKeys.has(requirementKey)) {
            allocatedRequirementKeys.add(requirementKey);
          }
        }
      }

      if (design.rationales === undefined) {
        errors.push(`${design.id}: design rationaleが未確定です`);
      } else if (design.rationales !== null) {
        for (const rationale of design.rationales) {
          if (
            !rationale.id.trim() ||
            !rationale.decision.trim() ||
            !rationale.reason.trim()
          ) {
            errors.push(`${design.id}: design rationaleが不正です`);
          }
        }
      }

      if (design.unresolvedDecisions === undefined) {
        errors.push(`${design.id}: unresolved design decisionsが未確定です`);
      } else if (design.unresolvedDecisions !== null) {
        for (const decision of design.unresolvedDecisions) {
          if (!decision.id.trim() || !decision.description.trim()) {
            errors.push(`${design.id}: unresolved design decisionが不正です`);
          }
        }
      }
    }

    for (const requirementKey of softwareRequirementKeys) {
      if (!allocatedRequirementKeys.has(requirementKey)) {
        errors.push(`${requirementKey}: Software Designへのtraceabilityがありません`);
      }
    }

    return errors.length === 0 ? { passed: true } : { passed: false, errors };
  }
}
