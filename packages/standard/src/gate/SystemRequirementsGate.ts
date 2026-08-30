import type {
  Artifact,
  GatePass,
  ProcessGate,
} from "@mydx-dev/ai-driven-spiral-development";
import { SystemArchitectureDescription } from "../artifact/SystemArchitectureDescription.js";
import { SystemRequirementsSpecification } from "../artifact/SystemRequirementsSpecification.js";
import { SystemArchitectureDescriptionGate } from "./SystemArchitectureDescriptionGate.js";
import { SystemRequirementsDefinitionGate } from "./SystemRequirementsDefinitionGate.js";

export class SystemRequirementsGate implements ProcessGate<Artifact> {
  verifyStructuralComplete(artifacts: Artifact[]): GatePass {
    const specifications = artifacts.filter(
      (artifact): artifact is SystemRequirementsSpecification =>
        artifact instanceof SystemRequirementsSpecification,
    );
    const architectures = artifacts.filter(
      (artifact): artifact is SystemArchitectureDescription =>
        artifact instanceof SystemArchitectureDescription,
    );
    const errors: string[] = [];

    const requirementsResult =
      new SystemRequirementsDefinitionGate().verifyStructuralComplete(
        specifications,
      );
    if (!requirementsResult.passed) errors.push(...requirementsResult.errors);

    const architectureResult =
      new SystemArchitectureDescriptionGate(specifications).verifyStructuralComplete(
        architectures,
      );
    if (!architectureResult.passed) errors.push(...architectureResult.errors);

    return errors.length === 0 ? { passed: true } : { passed: false, errors };
  }
}
