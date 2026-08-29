import type { ArtifactRepository } from "@mydx-dev/ai-driven-spiral-development";
import { describe, expect, it } from "vitest";
import { SystemRequirementsSpecification } from "./SystemRequirementsSpecification.js";

describe("SystemRequirementsSpecification", () => {
  it("CoreのArtifactRepositoryで永続化できる", async () => {
    const specification = new SystemRequirementsSpecification(
      "syrs-1",
      "cycle-1",
      "purpose",
      "scope",
      "overview",
      [
        {
          id: "sys-1",
          statement: "system requirement",
          category: "functional",
          tracesTo: [
            {
              specificationId: "strs-1",
              requirementId: "sr-1",
            },
          ],
        },
      ],
      [],
      [],
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

    await expect(repository.find("syrs-1")).resolves.toBe(specification);
    await expect(repository.findByCycle("cycle-1")).resolves.toEqual([
      specification,
    ]);
  });
});
