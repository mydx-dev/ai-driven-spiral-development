import type { ArtifactRepository } from "@mydx-dev/ai-driven-spiral-development";
import { describe, expect, it } from "vitest";
import { VerificationResult } from "./VerificationResult.js";

describe("VerificationResult", () => {
  it("CoreのArtifactRepositoryで永続化できる", async () => {
    const verification = new VerificationResult("verification-1", "cycle-1", [
      {
        id: "result-1",
        requirement: {
          specificationId: "srs-1",
          requirementId: "requirement-1",
        },
        integratedSoftwareId: "integration-1",
        method: "test",
        evidence: ["test/report.xml"],
        passed: true,
        failureCause: null,
        unresolvedItems: [],
        qualityReferences: null,
      },
    ]);
    const artifacts = new Map<string, typeof verification>();
    const repository: ArtifactRepository<typeof verification> = {
      find: async (id) => artifacts.get(id),
      findByCycle: async (cycleId) =>
        [...artifacts.values()].filter(
          (artifact) => artifact.cycleId === cycleId,
        ),
      save: async (artifact) => {
        artifacts.set(artifact.id, artifact);
      },
    };

    await repository.save(verification);

    await expect(repository.find("verification-1")).resolves.toBe(verification);
    await expect(repository.findByCycle("cycle-1")).resolves.toEqual([
      verification,
    ]);
  });
});
