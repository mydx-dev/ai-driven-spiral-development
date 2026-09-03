import type { ArtifactRepository } from "@mydx-dev/ai-driven-spiral-development";
import type { ImplementedSoftwareElements } from "../artifact/ImplementedSoftwareElements.js";
import type { IntegratedSoftware } from "../artifact/IntegratedSoftware.js";
import type { SoftwareArchitectureDescription } from "../artifact/SoftwareArchitectureDescription.js";
import type { SoftwareElementDesign } from "../artifact/SoftwareElementDesign.js";
import type { SoftwareRequirementsSpecification } from "../artifact/SoftwareRequirementsSpecification.js";
import type { StakeholderRequirementsSpecification } from "../artifact/StakeholderRequirementsSpecification.js";
import type { SystemArchitectureDescription } from "../artifact/SystemArchitectureDescription.js";
import type { SystemRequirementsSpecification } from "../artifact/SystemRequirementsSpecification.js";
import type { ValidationResult } from "../artifact/ValidationResult.js";
import type { VerificationResult } from "../artifact/VerificationResult.js";

export type StakeholderRequirementsRepository =
  ArtifactRepository<StakeholderRequirementsSpecification>;
export type SystemRequirementsRepository =
  ArtifactRepository<SystemRequirementsSpecification>;
export type SystemArchitectureDescriptionRepository =
  ArtifactRepository<SystemArchitectureDescription>;
export type SoftwareRequirementsRepository =
  ArtifactRepository<SoftwareRequirementsSpecification>;
export type SoftwareArchitectureDescriptionRepository =
  ArtifactRepository<SoftwareArchitectureDescription>;
export type SoftwareElementDesignRepository = ArtifactRepository<SoftwareElementDesign>;

export interface ImplementedSoftwareElementsRepository {
  find(id: string): Promise<ImplementedSoftwareElements | undefined>;
  findByCycle(cycleId: string): Promise<ImplementedSoftwareElements[]>;
}

export interface IntegratedSoftwareRepository {
  find(id: string): Promise<IntegratedSoftware | undefined>;
  findByCycle(cycleId: string): Promise<IntegratedSoftware[]>;
}

/** Runtime-produced verification evidence. It is not a human-authored template. */
export type VerificationResultRepository = ArtifactRepository<VerificationResult>;
/** Runtime-produced validation evidence. It is not a human-authored template. */
export type ValidationResultRepository = ArtifactRepository<ValidationResult>;
