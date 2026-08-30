import type {
  Artifact,
  GatePass,
  ProcessGate,
} from "@mydx-dev/ai-driven-spiral-development";
import { SoftwareArchitectureDescription } from "../artifact/SoftwareArchitectureDescription.js";
import { SoftwareRequirementsSpecification } from "../artifact/SoftwareRequirementsSpecification.js";
import type { SystemArchitectureDescription } from "../artifact/SystemArchitectureDescription.js";
import type { SystemRequirementsSpecification } from "../artifact/SystemRequirementsSpecification.js";
import { SoftwareArchitectureDescriptionGate } from "./SoftwareArchitectureDescriptionGate.js";
import { SoftwareRequirementsDefinitionGate } from "./SoftwareRequirementsDefinitionGate.js";

export class SoftwareRequirementsGate implements ProcessGate<Artifact> {
  constructor(
    public readonly systemArchitectures: SystemArchitectureDescription[],
    public readonly systemRequirementsSpecifications: SystemRequirementsSpecification[],
  ) {}

  verifyStructuralComplete(artifacts: Artifact[]): GatePass {
    const specifications = artifacts.filter(
      (artifact): artifact is SoftwareRequirementsSpecification =>
        artifact instanceof SoftwareRequirementsSpecification,
    );
    const architectures = artifacts.filter(
      (artifact): artifact is SoftwareArchitectureDescription =>
        artifact instanceof SoftwareArchitectureDescription,
    );
    const errors: string[] = [];

    const requirementsResult = new SoftwareRequirementsDefinitionGate(
      this.systemArchitectures,
      this.systemRequirementsSpecifications,
    ).verifyStructuralComplete(specifications);
    if (!requirementsResult.passed) errors.push(...requirementsResult.errors);

    const architectureResult =
      new SoftwareArchitectureDescriptionGate(
        specifications,
      ).verifyStructuralComplete(architectures);
    if (!architectureResult.passed) errors.push(...architectureResult.errors);

    return errors.length === 0 ? { passed: true } : { passed: false, errors };
  }
}
