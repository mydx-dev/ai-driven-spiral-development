import type {
  GatePass,
  ProcessGate,
} from "@mydx-dev/ai-driven-spiral-development";
import type { ImplementedSoftwareElements } from "../artifact/ImplementedSoftwareElements.js";
import type { SoftwareDesign } from "../artifact/SoftwareDesign.js";

export class ImplementationGate implements ProcessGate<ImplementedSoftwareElements> {
  constructor(public readonly softwareDesigns: SoftwareDesign[]) {}

  verifyStructuralComplete(
    implementations: ImplementedSoftwareElements[],
  ): GatePass {
    const errors: string[] = [];

    if (implementations.length === 0) {
      return {
        passed: false,
        errors: ["Implemented Software Elementsがありません"],
      };
    }

    const designElementKeys = new Set<string>();

    for (const design of this.softwareDesigns) {
      if (design.elements === undefined) {
        errors.push(`${design.id}: Software Elementsが未確定です`);
        continue;
      }

      for (const element of design.elements ?? []) {
        designElementKeys.add(`${design.id}:${element.id}`);
      }
    }

    const implementedDesignElementKeys = new Set<string>();

    for (const implementation of implementations) {
      if (!implementation.id.trim()) {
        errors.push("Implemented Software Elements識別子がありません");
      }

      if (!implementation.cycleId.trim()) {
        errors.push(`${implementation.id}: 対象Cycleがありません`);
      }

      if (implementation.elements === undefined) {
        errors.push(`${implementation.id}: 実装対象Software Elementsが未確定です`);
        continue;
      }

      if (implementation.elements === null) {
        if (designElementKeys.size > 0) {
          errors.push(`${implementation.id}: 実装対象のSoftware Elementが存在します`);
        }
        continue;
      }

      const implementationElementIds = new Set<string>();

      for (const element of implementation.elements) {
        if (!element.id.trim()) {
          errors.push(`${implementation.id}: 実装Element識別子がありません`);
        } else if (implementationElementIds.has(element.id)) {
          errors.push(`${implementation.id}: 実装Element識別子が重複しています`);
        } else {
          implementationElementIds.add(element.id);
        }

        if (
          !element.designElement.designId.trim() ||
          !element.designElement.elementId.trim()
        ) {
          errors.push(`${implementation.id}/${element.id}: Software Design参照が不正です`);
          continue;
        }

        const designElementKey = `${element.designElement.designId}:${element.designElement.elementId}`;

        if (!designElementKeys.has(designElementKey)) {
          errors.push(`${implementation.id}/${element.id}: 未知のSoftware Design Elementを参照しています`);
        } else {
          implementedDesignElementKeys.add(designElementKey);
        }

        if (
          element.artifactReferences.length === 0 ||
          element.artifactReferences.some((reference) => !reference.trim())
        ) {
          errors.push(`${implementation.id}/${element.id}: 実装成果物への参照がありません`);
        }

        if (element.checks === undefined) {
          errors.push(`${implementation.id}/${element.id}: 機械的条件の判定が未確定です`);
        } else if (element.checks !== null) {
          for (const check of element.checks) {
            if (!check.name.trim()) {
              errors.push(`${implementation.id}/${element.id}: 実装チェック名がありません`);
            }

            if (!check.passed) {
              errors.push(`${implementation.id}/${element.id}: ${check.name}が成功していません`);
            }
          }
        }

        if (element.knownConstraints === undefined) {
          errors.push(`${implementation.id}/${element.id}: 既知の制約が未確定です`);
        } else if (
          element.knownConstraints !== null &&
          element.knownConstraints.some((constraint) => !constraint.trim())
        ) {
          errors.push(`${implementation.id}/${element.id}: 既知の制約が不正です`);
        }

        if (element.unimplementedItems === undefined) {
          errors.push(`${implementation.id}/${element.id}: 未実装箇所が未確定です`);
        } else if (
          element.unimplementedItems !== null &&
          element.unimplementedItems.some((item) => !item.trim())
        ) {
          errors.push(`${implementation.id}/${element.id}: 未実装箇所が不正です`);
        }
      }
    }

    for (const designElementKey of designElementKeys) {
      if (!implementedDesignElementKeys.has(designElementKey)) {
        errors.push(`${designElementKey}: Implementationへのtraceabilityがありません`);
      }
    }

    return errors.length === 0 ? { passed: true } : { passed: false, errors };
  }
}
