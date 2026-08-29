import type { ArtifactRepository } from "@mydx-dev/ai-driven-spiral-development";
import { describe, expect, it } from "vitest";
import { ImplementedSoftwareElements } from "./ImplementedSoftwareElements.js";

describe("ImplementedSoftwareElements", () => {
  it("CoreのArtifactRepositoryで永続化できる", async () => {
    const implementation = new ImplementedSoftwareElements(
      "implementation-1",
      "cycle-1",
      [
        {
          id: "implemented-service",
          designElement: {
            designId: "design-1",
            elementId: "service-1",
          },
          artifactReferences: ["src/service.ts"],
          checks: [{ name: "typecheck", passed: true, details: null }],
          knownConstraints: [],
          unimplementedItems: [],
        },
      ],
    );
    const artifacts = new Map<string, typeof implementation>();
    const repository: ArtifactRepository<typeof implementation> = {
      find: async (id) => artifacts.get(id),
      findByCycle: async (cycleId) =>
        [...artifacts.values()].filter(
          (artifact) => artifact.cycleId === cycleId,
        ),
      save: async (artifact) => {
        artifacts.set(artifact.id, artifact);
      },
    };

    await repository.save(implementation);

    await expect(repository.find("implementation-1")).resolves.toBe(
      implementation,
    );
    await expect(repository.findByCycle("cycle-1")).resolves.toEqual([
      implementation,
    ]);
  });
});
