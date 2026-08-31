import type {
  Artifact,
  GatePass,
  ProcessGate,
} from "@mydx-dev/ai-driven-spiral-development";
import { StakeholderRequirementsSpecification } from "../artifact/StakeholderRequirementsSpecification.js";
import { StakeholderNeedsAndRequirementsDefinitionGate } from "./StakeholderNeedsAndRequirementsDefinitionGate.js";

export class RequirementsGate implements ProcessGate<Artifact> {
  verifyStructuralComplete(artifacts: Artifact[]): GatePass {
    return new StakeholderNeedsAndRequirementsDefinitionGate().verifyStructuralComplete(
      artifacts.filter(
        (artifact): artifact is StakeholderRequirementsSpecification =>
          artifact instanceof StakeholderRequirementsSpecification,
      ),
    );
  }
}
