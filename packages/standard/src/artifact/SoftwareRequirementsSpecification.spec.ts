import type { ArtifactRepository } from "@mydx-dev/ai-driven-spiral-development";
import { describe, expect, it } from "vitest";
import { SoftwareRequirementsSpecification } from "./SoftwareRequirementsSpecification.js";

describe("SoftwareRequirementsSpecification", () => {
  it("CoreのArtifactRepositoryで永続化できる", async () => {
    const specification = new SoftwareRequirementsSpecification(
      "srs-1",
      "cycle-1",
      "software purpose",
      "software scope",
      [
        {
          id: "swr-1",
          statement: "software requirement",
          category: "functional",
          verificationCriteria: ["expected result can be observed"],
          tracesTo: [
            {
              allocationId: "allocation-1",
              systemRequirementSpecificationId: "syrs-1",
              systemRequirementId: "sr-1",
              softwareElementId: "software-1",
            },
          ],
        },
      ],
      [],
    );
    const artifacts = new Map<string, typeof specification>();
    const repository: ArtifactRepository<typeof specification> = {
      find: async (id) => artifacts.get(id),
      findByCycle: async (cycleId) =>
        [...artifacts.values()].filter(
          (artifact) => artifact.cycleId === cycleId,
        ),
      save: async (artifact) => {
        artifacts.set(artifact.id, artifact);
      },
    };

    await repository.save(specification);

    await expect(repository.find("srs-1")).resolves.toBe(specification);
    await expect(repository.findByCycle("cycle-1")).resolves.toEqual([
      specification,
    ]);
  });
});
