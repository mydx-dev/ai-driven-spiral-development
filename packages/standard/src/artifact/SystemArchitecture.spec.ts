import type { ArtifactRepository } from "@mydx-dev/ai-driven-spiral-development";
import { describe, expect, it } from "vitest";
import {
  RequirementAllocation,
  extractSoftwareAllocations,
} from "./RequirementAllocation.js";
import { SystemArchitecture } from "./SystemArchitecture.js";

describe("System Architecture Definition Artifact", () => {
  it("CoreのArtifactRepositoryで永続化できる", async () => {
    const architecture = new SystemArchitecture(
      "architecture-1",
      "cycle-1",
      "system boundary",
      [
        {
          id: "software-1",
          name: "Software",
          type: "software",
          responsibilities: ["business logic"],
        },
      ],
      [],
    );
    const allocation = new RequirementAllocation("allocation-1", "cycle-1", [
      {
        requirement: {
          specificationId: "syrs-1",
          requirementId: "sr-1",
        },
        elementIds: ["software-1"],
      },
    ]);
    const artifacts = new Map<
      string,
      SystemArchitecture | RequirementAllocation
    >();
    const repository: ArtifactRepository<
      SystemArchitecture | RequirementAllocation
    > = {
      find: async (id) => artifacts.get(id),
      findByCycle: async (cycleId) =>
        [...artifacts.values()].filter(
          (artifact) => artifact.cycleId === cycleId,
        ),
      save: async (artifact) => {
        artifacts.set(artifact.id, artifact);
      },
    };

    await repository.save(architecture);
    await repository.save(allocation);

    await expect(repository.findByCycle("cycle-1")).resolves.toEqual([
      architecture,
      allocation,
    ]);
  });

  it("Softwareへ割り当てられたRequirementを抽出できる", () => {
    const architecture = new SystemArchitecture(
      "architecture-1",
      "cycle-1",
      "system boundary",
      [
        {
          id: "human-1",
          name: "Human",
          type: "human",
          responsibilities: ["approval"],
        },
        {
          id: "software-1",
          name: "Software",
          type: "software",
          responsibilities: ["automation"],
        },
      ],
      [],
    );
    const allocation = new RequirementAllocation("allocation-1", "cycle-1", [
      {
        requirement: {
          specificationId: "syrs-1",
          requirementId: "sr-1",
        },
        elementIds: ["human-1"],
      },
      {
        requirement: {
          specificationId: "syrs-1",
          requirementId: "sr-2",
        },
        elementIds: ["software-1"],
      },
    ]);

    expect(extractSoftwareAllocations(architecture, allocation)).toEqual([
      allocation.allocations?.[1],
    ]);
  });
});
