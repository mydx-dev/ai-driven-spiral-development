import type {
  Artifact,
  ArtifactRepository,
} from "@mydx-dev/ai-driven-spiral-development";
import { describe, expect, it } from "vitest";
import { ValidationResult } from "./ValidationResult.js";

describe("ValidationResult", () => {
  it("Core Artifact / ArtifactRepositoryと互換である", async () => {
    const artifact: Artifact = new ValidationResult(
      "validation-1",
      "cycle-1",
      null,
    );
    const repository: ArtifactRepository<ValidationResult> = {
      find: async () => artifact as ValidationResult,
      findByCycle: async () => [artifact as ValidationResult],
      save: async () => undefined,
    };

    expect((await repository.find("validation-1"))?.id).toBe("validation-1");
  });
});
