export * from "./StandardCycle.js";
export * from "./StandardProcess.js";
export * as legacy from "./legacy.js";

export * from "./artifact/ImplementedSoftwareElements.js";
export * from "./artifact/IntegratedSoftware.js";
export * from "./artifact/SoftwareArchitectureDescription.js";
export * from "./artifact/SoftwareElementDesign.js";
export * from "./artifact/SoftwareRequirementsSpecification.js";
export * from "./artifact/StakeholderRequirementsSpecification.js";
export * from "./artifact/SystemArchitectureDescription.js";
export * from "./artifact/SystemRequirementsSpecification.js";
export * from "./artifact/ValidationResult.js";
export * from "./artifact/VerificationResult.js";

export * from "./gate/ImplementationGate.js";
export * from "./gate/IntegrationGate.js";
export * from "./gate/RequirementsGate.js";
export * from "./gate/SoftwareRequirementsGate.js";
export * from "./gate/SystemRequirementsGate.js";
export * from "./gate/ValidationGate.js";
export * from "./gate/VerificationGate.js";

export * from "./orchestration/SoftwareElementExecutionPlan.js";

// Deprecated migration aliases. These are not Standard Process definitions.
/** @deprecated Use the 8-stage Standard Artifact API. */
export { Demand } from "./artifact/Demand.js";
/** @deprecated Use StakeholderRequirementsSpecification. */
export { Requirement } from "./artifact/Requirement.js";
/** @deprecated Use SoftwareRequirementsSpecification and SoftwareArchitectureDescription. */
export { ExternalSpec, Feature } from "./artifact/ExternalSpec.js";
/** @deprecated Use SoftwareElementDesign and ImplementedSoftwareElements. */
export { Implementation, ImplementedFeature } from "./artifact/Implementation.js";
/** @deprecated Use VerificationResult. */
export { QAReport, RequirementVerification } from "./artifact/QAReport.js";
/** @deprecated Release is not a Standard Process artifact in the 8-stage model. */
export { Release } from "./artifact/Release.js";
/** @deprecated Use ValidationResult. */
export {
  AcceptanceFeedback,
  AcceptanceReport,
  DemandAcceptance,
} from "./artifact/AcceptanceReport.js";
/** @deprecated Requirement allocation is part of Architecture Description traceability. */
export { RequirementAllocation } from "./artifact/RequirementAllocation.js";
/** @deprecated Use SystemArchitectureDescription. */
export { SystemArchitecture } from "./artifact/SystemArchitecture.js";
/** @deprecated Use SoftwareArchitectureDescription and SoftwareElementDesign. */
export { SoftwareDesign } from "./artifact/SoftwareDesign.js";

/** @deprecated Use RequirementsGate. */
export { DemandDefinitionGate } from "./gate/DemandDefinitionGate.js";
/** @deprecated Use RequirementsGate or SystemRequirementsGate. */
export { RequirementDefinitionGate } from "./gate/RequirementDefinitionGate.js";
/** @deprecated Use SoftwareRequirementsGate. */
export { ExternalDesignGate } from "./gate/ExternalDesignGate.js";
/** @deprecated Use ImplementationGate. */
export { EngineeringGate } from "./gate/EngineeringGate.js";
/** @deprecated Use VerificationGate. */
export { QAGate } from "./gate/QAGate.js";
/** @deprecated Release is not a Standard Process in the 8-stage model. */
export { ReleaseGate } from "./gate/ReleaseGate.js";
/** @deprecated Use ValidationGate. */
export { AcceptanceGate } from "./gate/AcceptanceGate.js";
