import type {
  GatePass,
  ProcessGate,
} from "@mydx-dev/ai-driven-spiral-development";
import type { RequirementAllocation } from "../artifact/RequirementAllocation.js";
import type { SystemArchitecture } from "../artifact/SystemArchitecture.js";

export type SystemArchitectureDefinitionArtifact =
  | SystemArchitecture
  | RequirementAllocation;

export class SystemArchitectureDefinitionGate implements ProcessGate<SystemArchitectureDefinitionArtifact> {
  verifyStructuralComplete(
    artifacts: SystemArchitectureDefinitionArtifact[],
  ): GatePass {
    const errors: string[] = [];
    const architectures = artifacts.filter(
      (artifact): artifact is SystemArchitecture =>
        artifact.artifactType === "system-architecture",
    );
    const allocations = artifacts.filter(
      (artifact): artifact is RequirementAllocation =>
        artifact.artifactType === "requirement-allocation",
    );

    if (architectures.length !== 1) {
      errors.push("System ArchitectureはCycleごとに1件必要です");
    }

    if (allocations.length !== 1) {
      errors.push("Requirement AllocationはCycleごとに1件必要です");
    }

    const architecture = architectures[0];
    const allocation = allocations[0];

    if (!architecture || !allocation) {
      return { passed: false, errors };
    }

    if (!architecture.id.trim()) {
      errors.push("System Architecture識別子がありません");
    }

    if (!architecture.cycleId.trim()) {
      errors.push(`${architecture.id}: 対象Cycleがありません`);
    }

    if (!allocation.id.trim()) {
      errors.push("Requirement Allocation識別子がありません");
    }

    if (!allocation.cycleId.trim()) {
      errors.push(`${allocation.id}: 対象Cycleがありません`);
    }

    if (architecture.cycleId !== allocation.cycleId) {
      errors.push("System ArchitectureとRequirement AllocationのCycleが不一致です");
    }

    if (architecture.boundary === undefined) {
      errors.push(`${architecture.id}: System boundaryが未確定です`);
    } else if (architecture.boundary !== null && !architecture.boundary.trim()) {
      errors.push(`${architecture.id}: System boundaryが不正です`);
    }

    const elementIds = new Set<string>();

    if (architecture.elements === undefined) {
      errors.push(`${architecture.id}: System Elementsが未確定です`);
    } else if (architecture.elements !== null) {
      if (architecture.elements.length === 0) {
        errors.push(`${architecture.id}: System Elementsが不正です`);
      }

      for (const element of architecture.elements) {
        if (!element.id.trim()) {
          errors.push(`${architecture.id}: System Element識別子がありません`);
        } else if (elementIds.has(element.id)) {
          errors.push(`${architecture.id}: System Element識別子が重複しています`);
        } else {
          elementIds.add(element.id);
        }

        if (!element.name.trim()) {
          errors.push(`${architecture.id}/${element.id}: Element名がありません`);
        }

        if (
          element.responsibilities.length === 0 ||
          element.responsibilities.some((value) => !value.trim())
        ) {
          errors.push(
            `${architecture.id}/${element.id}: Element責任が定義されていません`,
          );
        }
      }
    }

    const sourceRequirementKeys = new Set<string>();

    if (allocation.sourceRequirements === undefined) {
      errors.push(`${allocation.id}: SyRS Requirementsが未確定です`);
    } else if (allocation.sourceRequirements !== null) {
      if (allocation.sourceRequirements.length === 0) {
        errors.push(`${allocation.id}: SyRS Requirementsが不正です`);
      }

      for (const requirement of allocation.sourceRequirements) {
        const key = `${requirement.specificationId}:${requirement.requirementId}`;

        if (!requirement.specificationId.trim() || !requirement.requirementId.trim()) {
          errors.push(`${allocation.id}: SyRS traceabilityが不正です`);
        } else if (sourceRequirementKeys.has(key)) {
          errors.push(`${allocation.id}: SyRS Requirementが重複しています`);
        } else {
          sourceRequirementKeys.add(key);
        }
      }
    }

    const allocatedRequirementKeys = new Set<string>();

    if (allocation.allocations === undefined) {
      errors.push(`${allocation.id}: Requirement allocationが未確定です`);
    } else if (allocation.allocations !== null) {
      for (const entry of allocation.allocations) {
        const key = `${entry.requirement.specificationId}:${entry.requirement.requirementId}`;

        if (
          !entry.requirement.specificationId.trim() ||
          !entry.requirement.requirementId.trim()
        ) {
          errors.push(`${allocation.id}: allocationのSyRS traceabilityが不正です`);
        }

        if (allocatedRequirementKeys.has(key)) {
          errors.push(
            `${allocation.id}/${key}: allocationが重複または矛盾しています`,
          );
        } else {
          allocatedRequirementKeys.add(key);
        }

        if (
          allocation.sourceRequirements !== null &&
          allocation.sourceRequirements !== undefined &&
          !sourceRequirementKeys.has(key)
        ) {
          errors.push(`${allocation.id}/${key}: 未知のSyRS Requirementです`);
        }

        if (entry.elementIds.length === 0) {
          errors.push(`${allocation.id}/${key}: allocation先がありません`);
        }

        const targetIds = new Set<string>();

        for (const elementId of entry.elementIds) {
          if (!elementId.trim()) {
            errors.push(`${allocation.id}/${key}: allocation先が不正です`);
          } else if (targetIds.has(elementId)) {
            errors.push(`${allocation.id}/${key}: allocation先が重複しています`);
          } else {
            targetIds.add(elementId);
          }

          if (architecture.elements !== null && architecture.elements !== undefined) {
            if (!elementIds.has(elementId)) {
              errors.push(
                `${allocation.id}/${key}: 存在しないSystem Elementへのallocationです`,
              );
            }
          }
        }
      }
    }

    if (
      allocation.sourceRequirements !== null &&
      allocation.sourceRequirements !== undefined &&
      allocation.allocations !== null &&
      allocation.allocations !== undefined
    ) {
      for (const key of sourceRequirementKeys) {
        if (!allocatedRequirementKeys.has(key)) {
          errors.push(`${allocation.id}/${key}: allocation漏れがあります`);
        }
      }
    }

    if (architecture.decisions === undefined) {
      errors.push(`${architecture.id}: architecture decisionsが未確定です`);
    } else if (architecture.decisions !== null) {
      for (const decision of architecture.decisions) {
        if (!decision.id.trim()) {
          errors.push(`${architecture.id}: architecture decision識別子がありません`);
        }

        if (!decision.statement.trim()) {
          errors.push(
            `${architecture.id}/${decision.id}: architecture decisionがありません`,
          );
        }

        if (decision.tracesTo.length === 0) {
          errors.push(
            `${architecture.id}/${decision.id}: architecture decisionのtraceabilityがありません`,
          );
        }

        for (const trace of decision.tracesTo) {
          const key = `${trace.specificationId}:${trace.requirementId}`;

          if (!trace.specificationId.trim() || !trace.requirementId.trim()) {
            errors.push(
              `${architecture.id}/${decision.id}: SyRS traceabilityが不正です`,
            );
          } else if (
            allocation.sourceRequirements !== null &&
            allocation.sourceRequirements !== undefined &&
            !sourceRequirementKeys.has(key)
          ) {
            errors.push(
              `${architecture.id}/${decision.id}: 未知のSyRS Requirementを参照しています`,
            );
          }
        }
      }
    }

    return errors.length === 0 ? { passed: true } : { passed: false, errors };
  }
}
