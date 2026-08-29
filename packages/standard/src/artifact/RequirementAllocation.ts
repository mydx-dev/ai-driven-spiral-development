import type { Artifact } from "@mydx-dev/ai-driven-spiral-development";
import type {
  SystemArchitecture,
  SystemRequirementReference,
} from "./SystemArchitecture.js";

export type RequirementAllocationEntry = {
  readonly requirement: SystemRequirementReference;
  readonly elementIds: string[];
};

export class RequirementAllocation implements Artifact {
  readonly artifactType = "requirement-allocation" as const;

  constructor(
    public readonly id: string,
    public readonly cycleId: string,
    public readonly sourceRequirements:
      SystemRequirementReference[] | null | undefined,
    public readonly allocations:
      RequirementAllocationEntry[] | null | undefined,
  ) {}
}

export const extractSoftwareAllocations = (
  architecture: SystemArchitecture,
  allocation: RequirementAllocation,
): RequirementAllocationEntry[] => {
  const softwareElementIds = new Set(
    (architecture.elements ?? [])
      .filter((element) => element.type === "software")
      .map((element) => element.id),
  );

  return (allocation.allocations ?? []).filter((entry) =>
    entry.elementIds.some((elementId) => softwareElementIds.has(elementId)),
  );
};
