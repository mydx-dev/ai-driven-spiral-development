import { describe, expect, it } from "vitest";
import {
  AcceptanceFeedback,
  AcceptanceGate,
  AcceptanceReport,
  Demand,
  DemandAcceptance,
  DemandDefinitionGate,
  EngineeringGate,
  ExternalDesignGate,
  ExternalSpec,
  Feature,
  Implementation,
  ImplementedFeature,
  QAGate,
  QAReport,
  Release,
  ReleaseGate,
  Requirement,
  RequirementDefinitionGate,
  RequirementVerification,
  StandardCycle,
} from "./index.js";

describe("@mydx/spiral-standard public API", () => {
  it("旧standard-process subpathのpublic symbolをpackage rootから公開する", () => {
    expect([
      StandardCycle,
      AcceptanceReport,
      DemandAcceptance,
      AcceptanceFeedback,
      Demand,
      Requirement,
      ExternalSpec,
      Feature,
      Implementation,
      ImplementedFeature,
      QAReport,
      RequirementVerification,
      Release,
      DemandDefinitionGate,
      RequirementDefinitionGate,
      ExternalDesignGate,
      EngineeringGate,
      QAGate,
      ReleaseGate,
      AcceptanceGate,
    ]).not.toContain(undefined);
  });
});
