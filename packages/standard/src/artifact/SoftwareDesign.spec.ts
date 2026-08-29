import type { ArtifactRepository } from "@mydx-dev/ai-driven-spiral-development";
import { describe, expect, it } from "vitest";
import { SoftwareDesign } from "./SoftwareDesign.js";

describe("SoftwareDesign", () => {
  it("CoreのArtifactRepositoryで永続化できる", async () => {
    const design = new SoftwareDesign(
      "design-1",
      "cycle-1",
      [
        {
          id: "element-1",
          name: "Application Service",
          responsibilities: ["execute use case"],
          data: ["command"],
          state: null,
          behavior: ["validate and execute"],
        },
      ],
      null,
      null,
      [
        {
          requirement: {
            specificationId: "srs-1",
            requirementId: "swr-1",
          },
          elementIds: ["element-1"],
        },
      ],
      [],
      [],
    );
    const artifacts = new Map<string, typeof design>();
    const repository: ArtifactRepository<typeof design> = {
      find: async (id) => artifacts.get(id),
      findByCycle: async (cycleId) =>
        [...artifacts.values()].filter(
          (artifact) => artifact.cycleId === cycleId,
        ),
      save: async (artifact) => {
        artifacts.set(artifact.id, artifact);
      },
    };

    await repository.save(design);

    await expect(repository.find("design-1")).resolves.toBe(design);
    await expect(repository.findByCycle("cycle-1")).resolves.toEqual([design]);
  });
});
