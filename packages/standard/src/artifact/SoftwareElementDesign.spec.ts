import type { ArtifactRepository } from "@mydx-dev/ai-driven-spiral-development";
import { describe, expect, it } from "vitest";
import { SoftwareElementDesign } from "./SoftwareElementDesign.js";

describe("SoftwareElementDesign", () => {
  it("Software Architecture Element単位で永続化できる", async () => {
    const design = new SoftwareElementDesign(
      "service-design",
      "cycle-1",
      { architectureId: "architecture-1", elementId: "service" },
      ["Order"],
      ["idle", "running"],
      ["execute order"],
      ["repository-interface"],
      [],
      [],
    );
    const artifacts = new Map<string, SoftwareElementDesign>();
    const repository: ArtifactRepository<SoftwareElementDesign> = {
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

    await expect(repository.find("service-design")).resolves.toBe(design);
  });
});
