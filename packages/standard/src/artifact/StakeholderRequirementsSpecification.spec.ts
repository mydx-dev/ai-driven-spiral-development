import type {
  ArtifactRepository,
} from "@mydx-dev/ai-driven-spiral-development";
import { describe, expect, it } from "vitest";
import { StakeholderRequirementsSpecification } from "./StakeholderRequirementsSpecification.js";

describe("StakeholderRequirementsSpecification", () => {
  it("CoreのArtifactRepositoryで永続化できる", async () => {
    const specification = new StakeholderRequirementsSpecification(
      "strs-1",
      "cycle-1",
      ["Stakeholder A"],
      "purpose",
      "scope",
      "business context",
      "operational context",
      [{ id: "sr-1", statement: "requirement", source: "interview-1" }],
      [],
      [],
      [],
    );
    const artifacts = new Map<
      string,
      StakeholderRequirementsSpecification
    >();
    const repository: ArtifactRepository<StakeholderRequirementsSpecification> = {
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

    await expect(repository.find("strs-1")).resolves.toBe(specification);
    await expect(repository.findByCycle("cycle-1")).resolves.toEqual([
      specification,
    ]);
  });
});
