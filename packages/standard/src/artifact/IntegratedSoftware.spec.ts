import type { ArtifactRepository } from "@mydx-dev/ai-driven-spiral-development";
import { describe, expect, it } from "vitest";
import { IntegratedSoftware } from "./IntegratedSoftware.js";

describe("IntegratedSoftware", () => {
  it("CoreのArtifactRepositoryで永続化できる", async () => {
    const integration = new IntegratedSoftware(
      "integration-1",
      "cycle-1",
      [{ implementationId: "implementation-1", elementId: "element-1" }],
      [],
      [],
      ["dist/software.js"],
      ["integration test passed"],
      [],
    );
    const artifacts = new Map<string, typeof integration>();
    const repository: ArtifactRepository<typeof integration> = {
      find: async (id) => artifacts.get(id),
      findByCycle: async (cycleId) =>
        [...artifacts.values()].filter(
          (artifact) => artifact.cycleId === cycleId,
        ),
      save: async (artifact) => {
        artifacts.set(artifact.id, artifact);
      },
    };

    await repository.save(integration);

    await expect(repository.find("integration-1")).resolves.toBe(integration);
    await expect(repository.findByCycle("cycle-1")).resolves.toEqual([
      integration,
    ]);
  });
});
