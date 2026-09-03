import type {
  GatePass,
  ProcessGate,
} from "@mydx-dev/ai-driven-spiral-development";
import type { ImplementedSoftwareElements } from "../artifact/ImplementedSoftwareElements.js";
import type { SoftwareArchitectureDescription } from "../artifact/SoftwareArchitectureDescription.js";
import type { SoftwareElementDesign } from "../artifact/SoftwareElementDesign.js";

export class ImplementationGate implements ProcessGate<ImplementedSoftwareElements> {
  constructor(
    public readonly softwareArchitectures: SoftwareArchitectureDescription[],
    public readonly elementDesigns: SoftwareElementDesign[],
  ) {}

  verifyStructuralComplete(
    implementations: ImplementedSoftwareElements[],
  ): GatePass {
    const errors: string[] = [];

    if (this.softwareArchitectures.length !== 1) {
      return {
        passed: false,
        errors: [
          "対象CycleのSoftware Architecture Descriptionを一意に特定できません",
        ],
      };
    }

    const architecture = this.softwareArchitectures[0];
    const targetElementIds = new Set(
      (architecture.elements ?? []).map((element) => element.id),
    );
    const architectureInterfaceIds = new Set(
      (architecture.interfaces ?? []).map((softwareInterface) =>
        softwareInterface.id,
      ),
    );
    if (architecture.elements === undefined) {
      errors.push(`${architecture.id}: Software Elementsが未確定です`);
    }
    if (architecture.interfaces === undefined) {
      errors.push(`${architecture.id}: Software interfacesが未確定です`);
    }

    const designIds = new Set<string>();
    const designByElementId = new Map<string, SoftwareElementDesign>();
    for (const design of this.elementDesigns) {
      if (!design.id.trim() || designIds.has(design.id)) {
        errors.push(`${design.id}: Software Element Design識別子が不正です`);
      } else {
        designIds.add(design.id);
      }
      if (!design.cycleId.trim()) errors.push(`${design.id}: 対象Cycleがありません`);
      if (
        design.architectureElement.architectureId !== architecture.id ||
        !targetElementIds.has(design.architectureElement.elementId)
      ) {
        errors.push(
          `${design.id}: 未知のSoftware Architecture Elementを参照しています`,
        );
      } else if (designByElementId.has(design.architectureElement.elementId)) {
        errors.push(
          `${architecture.id}:${design.architectureElement.elementId}: Software Element Designが重複しています`,
        );
      } else {
        designByElementId.set(design.architectureElement.elementId, design);
      }

      for (const [name, values] of [
        ["data", design.data],
        ["state", design.state],
        ["behavior", design.behavior],
      ] as const) {
        if (values === undefined) {
          errors.push(`${design.id}: ${name}設計が未確定です`);
        } else if (values !== null && values.some((value) => !value.trim())) {
          errors.push(`${design.id}: ${name}設計が不正です`);
        }
      }
      if (design.interfaceIds === undefined) {
        errors.push(`${design.id}: interface実現方針が未確定です`);
      } else {
        for (const interfaceId of design.interfaceIds ?? []) {
          if (!architectureInterfaceIds.has(interfaceId)) {
            errors.push(`${design.id}: 未知のSoftware interfaceを参照しています`);
          }
        }
      }
      if (design.unresolvedDecisions === undefined) {
        errors.push(`${design.id}: 未解決Design Decisionが未確定です`);
      } else if ((design.unresolvedDecisions ?? []).length > 0) {
        errors.push(`${design.id}: 未解決Design Decisionが残っています`);
      }
    }

    for (const elementId of targetElementIds) {
      if (!designByElementId.has(elementId)) {
        errors.push(
          `${architecture.id}:${elementId}: Software Element Designがありません`,
        );
      }
    }

    if (implementations.length === 0) {
      errors.push("Implemented Software Elementsがありません");
    }

    const implementedDesignIds = new Set<string>();
    for (const implementation of implementations) {
      if (!implementation.id.trim()) {
        errors.push("Implemented Software Elements識別子がありません");
      }
      if (!implementation.cycleId.trim()) {
        errors.push(`${implementation.id}: 対象Cycleがありません`);
      }
      if (implementation.elements === undefined) {
        errors.push(`${implementation.id}: Implemented Software Elementsが未確定です`);
        continue;
      }

      const elementIds = new Set<string>();
      for (const element of implementation.elements ?? []) {
        const prefix = `${implementation.id}/${element.id}`;
        if (!element.id.trim() || elementIds.has(element.id)) {
          errors.push(`${prefix}: 実装Element識別子が不正です`);
        } else {
          elementIds.add(element.id);
        }

        const designId = element.elementDesign.designId;
        if (!designIds.has(designId)) {
          errors.push(`${prefix}: 未知のSoftware Element Designを参照しています`);
        } else if (implementedDesignIds.has(designId)) {
          errors.push(`${designId}: Implementationが重複しています`);
        } else {
          implementedDesignIds.add(designId);
        }

        if (
          element.artifactReferences.length === 0 ||
          element.artifactReferences.some((reference) => !reference.trim())
        ) {
          errors.push(`${prefix}: 実装成果物への参照がありません`);
        }

        if (element.checks === undefined) {
          errors.push(`${prefix}: local check / Quality Guard結果が未確定です`);
        } else {
          const checks = element.checks ?? [];
          if (!checks.some((check) => check.kind === "local")) {
            errors.push(`${prefix}: local check結果がありません`);
          }
          for (const check of checks) {
            if (!check.name.trim()) {
              errors.push(`${prefix}: check名がありません`);
            }
            if (!check.passed) {
              errors.push(
                check.kind === "quality-guard"
                  ? `${prefix}: project-defined Quality Guard ${check.name}が成功していません`
                  : `${prefix}: ${check.name}が成功していません`,
              );
            }
          }
        }

        if (element.knownConstraints === undefined) {
          errors.push(`${prefix}: 既知の制約が未確定です`);
        } else if (
          (element.knownConstraints ?? []).some((constraint) => !constraint.trim())
        ) {
          errors.push(`${prefix}: 既知の制約が不正です`);
        }

        if (element.unimplementedItems === undefined) {
          errors.push(`${prefix}: 未実装箇所が未確定です`);
        } else if ((element.unimplementedItems ?? []).length > 0) {
          errors.push(`${prefix}: 未実装箇所が残っています`);
        }
      }
    }

    for (const design of this.elementDesigns) {
      if (!implementedDesignIds.has(design.id)) {
        errors.push(`${design.id}: Implementationへのtraceabilityがありません`);
      }
    }

    return errors.length === 0 ? { passed: true } : { passed: false, errors };
  }
}
