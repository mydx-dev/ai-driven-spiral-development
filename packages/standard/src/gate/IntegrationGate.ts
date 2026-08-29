import type {
  GatePass,
  ProcessGate,
} from "@mydx-dev/ai-driven-spiral-development";
import type { ImplementedSoftwareElements } from "../artifact/ImplementedSoftwareElements.js";
import type { IntegratedSoftware } from "../artifact/IntegratedSoftware.js";
import type { SoftwareDesign } from "../artifact/SoftwareDesign.js";

export class IntegrationGate implements ProcessGate<IntegratedSoftware> {
  constructor(
    public readonly implementations: ImplementedSoftwareElements[],
    public readonly softwareDesigns: SoftwareDesign[],
  ) {}

  verifyStructuralComplete(integrations: IntegratedSoftware[]): GatePass {
    const errors: string[] = [];

    if (integrations.length !== 1) {
      return {
        passed: false,
        errors: ["対象CycleのIntegrated Softwareを一意に特定できません"],
      };
    }

    const implementedElementKeys = new Set<string>();
    const implementedDesignElementKeys = new Set<string>();

    for (const implementation of this.implementations) {
      if (implementation.elements === undefined) {
        errors.push(
          `${implementation.id}: Implemented Software Elementsが未確定です`,
        );
        continue;
      }

      for (const element of implementation.elements ?? []) {
        implementedElementKeys.add(`${implementation.id}:${element.id}`);
        implementedDesignElementKeys.add(
          `${element.designElement.designId}:${element.designElement.elementId}`,
        );
      }
    }

    const relationshipKeys = new Set<string>();
    const interfaceKeys = new Set<string>();

    for (const design of this.softwareDesigns) {
      if (design.relationships === undefined) {
        errors.push(`${design.id}: Software Element Relationshipsが未確定です`);
      } else {
        for (const relationship of design.relationships ?? []) {
          if (
            implementedDesignElementKeys.has(
              `${design.id}:${relationship.sourceElementId}`,
            ) &&
            implementedDesignElementKeys.has(
              `${design.id}:${relationship.targetElementId}`,
            )
          ) {
            relationshipKeys.add(
              `${design.id}:${relationship.sourceElementId}:${relationship.targetElementId}:${relationship.type}`,
            );
          }
        }
      }

      if (design.interfaces === undefined) {
        errors.push(`${design.id}: Software Interfacesが未確定です`);
      } else {
        for (const softwareInterface of design.interfaces ?? []) {
          if (
            implementedDesignElementKeys.has(
              `${design.id}:${softwareInterface.providedByElementId}`,
            ) ||
            softwareInterface.consumedByElementIds.some((elementId) =>
              implementedDesignElementKeys.has(`${design.id}:${elementId}`),
            )
          ) {
            interfaceKeys.add(`${design.id}:${softwareInterface.id}`);
          }
        }
      }
    }

    const integration = integrations[0];

    if (!integration.id.trim()) {
      errors.push("Integrated Software識別子がありません");
    }

    if (!integration.cycleId.trim()) {
      errors.push(`${integration.id}: 対象Cycleがありません`);
    }

    if (integration.elements === undefined) {
      errors.push(`${integration.id}: 統合対象Software Elementsが未確定です`);
    } else if (integration.elements === null) {
      if (implementedElementKeys.size > 0) {
        errors.push(
          `${integration.id}: 統合対象のSoftware Elementが存在します`,
        );
      }
    } else {
      const integratedElementKeys = new Set<string>();

      for (const element of integration.elements) {
        if (!element.implementationId.trim() || !element.elementId.trim()) {
          errors.push(
            `${integration.id}: Implemented Software Element参照が不正です`,
          );
          continue;
        }

        const elementKey = `${element.implementationId}:${element.elementId}`;

        if (!implementedElementKeys.has(elementKey)) {
          errors.push(
            `${integration.id}: 未知のImplemented Software Elementを参照しています`,
          );
        } else if (integratedElementKeys.has(elementKey)) {
          errors.push(
            `${integration.id}: Implemented Software Element参照が重複しています`,
          );
        } else {
          integratedElementKeys.add(elementKey);
        }
      }

      for (const elementKey of implementedElementKeys) {
        if (!integratedElementKeys.has(elementKey)) {
          errors.push(
            `${elementKey}: Integrated Softwareへのtraceabilityがありません`,
          );
        }
      }
    }

    if (integration.relationships === undefined) {
      errors.push(`${integration.id}: relationship統合状態が未確定です`);
    } else if (integration.relationships === null) {
      if (relationshipKeys.size > 0) {
        errors.push(`${integration.id}: 統合対象のrelationshipが存在します`);
      }
    } else {
      const integratedRelationshipKeys = new Set<string>();

      for (const relationship of integration.relationships) {
        const relationshipKey = `${relationship.designId}:${relationship.sourceElementId}:${relationship.targetElementId}:${relationship.type}`;

        if (!relationshipKeys.has(relationshipKey)) {
          errors.push(
            `${integration.id}: 未知のSoftware Design relationshipを参照しています`,
          );
        } else if (integratedRelationshipKeys.has(relationshipKey)) {
          errors.push(
            `${integration.id}: relationship統合参照が重複しています`,
          );
        } else {
          integratedRelationshipKeys.add(relationshipKey);
        }

        if (
          relationship.evidence.length === 0 ||
          relationship.evidence.some((item) => !item.trim())
        ) {
          errors.push(
            `${integration.id}: relationship統合のevidenceがありません`,
          );
        }
      }

      for (const relationshipKey of relationshipKeys) {
        if (!integratedRelationshipKeys.has(relationshipKey)) {
          errors.push(`${relationshipKey}: relationshipが統合されていません`);
        }
      }
    }

    if (integration.interfaces === undefined) {
      errors.push(`${integration.id}: interface統合状態が未確定です`);
    } else if (integration.interfaces === null) {
      if (interfaceKeys.size > 0) {
        errors.push(`${integration.id}: 統合対象のinterfaceが存在します`);
      }
    } else {
      const integratedInterfaceKeys = new Set<string>();

      for (const softwareInterface of integration.interfaces) {
        const interfaceKey = `${softwareInterface.designId}:${softwareInterface.interfaceId}`;

        if (!interfaceKeys.has(interfaceKey)) {
          errors.push(
            `${integration.id}: 未知のSoftware Design interfaceを参照しています`,
          );
        } else if (integratedInterfaceKeys.has(interfaceKey)) {
          errors.push(`${integration.id}: interface統合参照が重複しています`);
        } else {
          integratedInterfaceKeys.add(interfaceKey);
        }

        if (
          softwareInterface.evidence.length === 0 ||
          softwareInterface.evidence.some((item) => !item.trim())
        ) {
          errors.push(`${integration.id}: interface統合のevidenceがありません`);
        }
      }

      for (const interfaceKey of interfaceKeys) {
        if (!integratedInterfaceKeys.has(interfaceKey)) {
          errors.push(`${interfaceKey}: interfaceが統合されていません`);
        }
      }
    }

    if (integration.artifactReferences === undefined) {
      errors.push(`${integration.id}: 統合Software成果物が未確定です`);
    } else if (
      implementedElementKeys.size > 0 &&
      (integration.artifactReferences === null ||
        integration.artifactReferences.length === 0)
    ) {
      errors.push(
        `${integration.id}: Verification対象となる統合Software成果物がありません`,
      );
    } else if (
      integration.artifactReferences !== null &&
      integration.artifactReferences.some((reference) => !reference.trim())
    ) {
      errors.push(`${integration.id}: 統合Software成果物参照が不正です`);
    }

    if (integration.evidence === undefined) {
      errors.push(`${integration.id}: integration evidenceが未確定です`);
    } else if (
      integration.evidence !== null &&
      integration.evidence.some((item) => !item.trim())
    ) {
      errors.push(`${integration.id}: integration evidenceが不正です`);
    }

    if (integration.unresolvedItems === undefined) {
      errors.push(`${integration.id}: integration上の未解決事項が未確定です`);
    } else if (
      integration.unresolvedItems !== null &&
      integration.unresolvedItems.length > 0
    ) {
      errors.push(`${integration.id}: integration上の未解決事項が残っています`);
    }

    return errors.length === 0 ? { passed: true } : { passed: false, errors };
  }
}
