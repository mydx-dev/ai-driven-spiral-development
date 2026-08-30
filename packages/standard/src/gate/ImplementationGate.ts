import type {
  GatePass,
  ProcessGate,
} from "@mydx-dev/ai-driven-spiral-development";
import type { ImplementedSoftwareElements } from "../artifact/ImplementedSoftwareElements.js";
import type { SoftwareArchitectureDescription } from "../artifact/SoftwareArchitectureDescription.js";
import type { SoftwareElementDesign } from "../artifact/SoftwareElementDesign.js";

export type ProjectImplementationQualityResult = {
  readonly designId: string;
  readonly name: string;
  readonly passed: boolean;
  readonly details: string | null;
};

export class ImplementationGate implements ProcessGate<ImplementedSoftwareElements> {
  constructor(
    public readonly softwareArchitectures: SoftwareArchitectureDescription[],
    public readonly elementDesigns: SoftwareElementDesign[],
    public readonly qualityResults: ProjectImplementationQualityResult[] = [],
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
    const targetElementIds = new Set<string>();
    const architectureInterfaceIds = new Set<string>();

    if (architecture.elements === undefined) {
      errors.push(`${architecture.id}: Software Elementsが未確定です`);
    } else {
      for (const element of architecture.elements ?? []) {
        targetElementIds.add(element.id);
      }
    }

    if (architecture.interfaces === undefined) {
      errors.push(`${architecture.id}: Software interfacesが未確定です`);
    } else {
      for (const softwareInterface of architecture.interfaces ?? []) {
        architectureInterfaceIds.add(softwareInterface.id);
      }
    }

    const designIds = new Set<string>();
    const designByElementId = new Map<string, SoftwareElementDesign>();

    for (const design of this.elementDesigns) {
      if (!design.id.trim()) {
        errors.push("Software Element Design識別子がありません");
      } else if (designIds.has(design.id)) {
        errors.push("Software Element Design識別子が重複しています");
      } else {
        designIds.add(design.id);
      }

      if (!design.cycleId.trim()) {
        errors.push(`${design.id}: 対象Cycleがありません`);
      }

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
      } else if (design.interfaceIds !== null) {
        const uniqueInterfaceIds = new Set(design.interfaceIds);
        if (uniqueInterfaceIds.size !== design.interfaceIds.length) {
          errors.push(`${design.id}: interface参照が重複しています`);
        }

        for (const interfaceId of design.interfaceIds) {
          if (!interfaceId.trim() || !architectureInterfaceIds.has(interfaceId)) {
            errors.push(`${design.id}: 未知のSoftware interfaceを参照しています`);
          }
        }
      }

      if (design.rationales === undefined) {
        errors.push(`${design.id}: design rationaleが未確定です`);
      } else if (design.rationales !== null) {
        const rationaleIds = new Set<string>();
        for (const rationale of design.rationales) {
          if (
            !rationale.id.trim() ||
            rationaleIds.has(rationale.id) ||
            !rationale.decision.trim() ||
            !rationale.reason.trim()
          ) {
            errors.push(`${design.id}: design rationaleが不正です`);
          } else {
            rationaleIds.add(rationale.id);
          }
        }
      }

      if (design.unresolvedDecisions === undefined) {
        errors.push(`${design.id}: 未解決Design Decisionが未確定です`);
      } else if (
        design.unresolvedDecisions !== null &&
        design.unresolvedDecisions.length > 0
      ) {
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
        errors.push(
          `${implementation.id}: Implemented Software Elementsが未確定です`,
        );
        continue;
      }

      if (implementation.elements === null) {
        if (targetElementIds.size > 0) {
          errors.push(`${implementation.id}: 実装対象Software Elementが存在します`);
        }
        continue;
      }

      const implementationElementIds = new Set<string>();

      for (const element of implementation.elements) {
        if (!element.id.trim()) {
          errors.push(`${implementation.id}: 実装Element識別子がありません`);
        } else if (implementationElementIds.has(element.id)) {
          errors.push(
            `${implementation.id}: 実装Element識別子が重複しています`,
          );
        } else {
          implementationElementIds.add(element.id);
        }

        if (!element.elementDesign.designId.trim()) {
          errors.push(
            `${implementation.id}/${element.id}: Software Element Design参照が不正です`,
          );
          continue;
        }

        if (!designIds.has(element.elementDesign.designId)) {
          errors.push(
            `${implementation.id}/${element.id}: 未知のSoftware Element Designを参照しています`,
          );
        } else if (implementedDesignIds.has(element.elementDesign.designId)) {
          errors.push(
            `${element.elementDesign.designId}: Implementationが重複しています`,
          );
        } else {
          implementedDesignIds.add(element.elementDesign.designId);
        }

        if (
          element.artifactReferences.length === 0 ||
          element.artifactReferences.some((reference) => !reference.trim())
        ) {
          errors.push(
            `${implementation.id}/${element.id}: 実装成果物への参照がありません`,
          );
        }

        if (element.checks === undefined) {
          errors.push(
            `${implementation.id}/${element.id}: local check結果が未確定です`,
          );
        } else if (element.checks !== null) {
          for (const check of element.checks) {
            if (!check.name.trim()) {
              errors.push(
                `${implementation.id}/${element.id}: local check名がありません`,
              );
            }
            if (!check.passed) {
              errors.push(
                `${implementation.id}/${element.id}: ${check.name}が成功していません`,
              );
            }
          }
        }

        if (element.knownConstraints === undefined) {
          errors.push(
            `${implementation.id}/${element.id}: 既知の制約が未確定です`,
          );
        } else if (
          element.knownConstraints !== null &&
          element.knownConstraints.some((constraint) => !constraint.trim())
        ) {
          errors.push(
            `${implementation.id}/${element.id}: 既知の制約が不正です`,
          );
        }

        if (element.unimplementedItems === undefined) {
          errors.push(
            `${implementation.id}/${element.id}: 未実装箇所が未確定です`,
          );
        } else if (
          element.unimplementedItems !== null &&
          element.unimplementedItems.length > 0
        ) {
          errors.push(
            `${implementation.id}/${element.id}: 未実装箇所が残っています`,
          );
        }
      }
    }

    for (const design of this.elementDesigns) {
      if (!implementedDesignIds.has(design.id)) {
        errors.push(`${design.id}: Implementationへのtraceabilityがありません`);
      }
    }

    const qualityKeys = new Set<string>();
    for (const qualityResult of this.qualityResults) {
      const key = `${qualityResult.designId}:${qualityResult.name}`;
      if (
        !designIds.has(qualityResult.designId) ||
        !qualityResult.name.trim() ||
        qualityKeys.has(key)
      ) {
        errors.push(`${key}: project-defined Quality Guard結果が不正です`);
        continue;
      }
      qualityKeys.add(key);

      if (!qualityResult.passed) {
        errors.push(`${key}: project-defined Quality Guardが成功していません`);
      }
    }

    return errors.length === 0 ? { passed: true } : { passed: false, errors };
  }
}
