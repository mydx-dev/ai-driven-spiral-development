import type { GitHubClient } from "@mydx-dev/spiral-github";
import {
  ImplementedSoftwareElements,
  SoftwareArchitectureDescription,
  SoftwareElementDesign,
} from "@mydx-dev/spiral-standard";
import { describe, expect, it } from "vitest";
import {
  GitHubImplementedSoftwareElementsRepository,
  GitHubIntegratedSoftwareRepository,
} from "./ProjectionRepositories.js";

const design = new SoftwareElementDesign(
  "application-design",
  "#1",
  { architectureId: "architecture-1", elementId: "application" },
  [],
  [],
  [],
  ["application-port"],
  [],
  [],
);

const architecture = new SoftwareArchitectureDescription(
  "architecture-1",
  "#1",
  [
    { id: "application", name: "Application", responsibilities: ["execute"] },
    { id: "infra", name: "Infrastructure", responsibilities: ["persist"] },
  ],
  [
    {
      sourceElementId: "application",
      targetElementId: "infra",
      type: "dependency",
      description: "Application uses Infrastructure",
    },
  ],
  [
    {
      id: "application-port",
      name: "ApplicationPort",
      providedByElementId: "application",
      consumedByElementIds: ["infra"],
      contract: "execute",
    },
  ],
  [],
  [],
);

const implementation = new ImplementedSoftwareElements(
  "#1-implemented-software-elements",
  "#1",
  [
    {
      id: "application",
      elementDesign: { designId: design.id },
      artifactReferences: ["source:src/application.ts"],
      checks: [],
      knownConstraints: [],
      unimplementedItems: [],
    },
    {
      id: "infra",
      elementDesign: { designId: "infra-design" },
      artifactReferences: ["source:src/infra.ts"],
      checks: [],
      knownConstraints: [],
      unimplementedItems: [],
    },
  ],
);

const createIntegratedRepository = (checkNames: string[]) => {
  const client = {
    request: async (_method: string, path: string) => {
      if (path === "repos/example/repo") return { default_branch: "main" };
      if (path.endsWith("/branches/main")) {
        return { commit: { sha: "main-sha" } };
      }
      throw new Error(`Unexpected request: ${path}`);
    },
    repositoryPath: (path: string) => `repos/example/repo${path}`,
    listCheckRuns: async () => ({
      check_runs: checkNames.map((name) => ({ name, conclusion: "success" })),
    }),
    listWorkflowRuns: async () => ({
      workflow_runs: [
        {
          id: 20,
          name: "CI",
          conclusion: "success",
          head_sha: "main-sha",
        },
      ],
    }),
  } as unknown as GitHubClient;
  return new GitHubIntegratedSoftwareRepository(
    client,
    {
      find: async () => implementation,
      findByCycle: async () => [implementation],
    },
    {
      find: async () => architecture,
      findByCycle: async () => [architecture],
      save: async () => {},
    },
  );
};

describe("GitHubImplementedSoftwareElementsRepository", () => {
  it("Designに対応するPR・source・commit・checksをDomain Artifactへ射影する", async () => {
    const client = {
      searchPullRequests: async () => ({
        items: [{ number: 10, pull_request: {} }],
      }),
      getPullRequest: async () => ({
        number: 10,
        state: "closed",
        merged_at: "2026-09-01T00:00:00Z",
        merge_commit_sha: "merge-sha",
        head: { sha: "head-sha" },
        base: { ref: "main" },
      }),
      request: async (_method: string, path: string) => {
        if (path.endsWith("/pulls/10/files")) {
          return [{ filename: "src/application.ts", status: "modified" }];
        }
        throw new Error(`Unexpected request: ${path}`);
      },
      repositoryPath: (path: string) => `repos/example/repo${path}`,
      listCheckRuns: async () => ({
        check_runs: [
          { name: "unit test", conclusion: "success" },
          { name: "integration test", conclusion: "success" },
          { name: "lint", conclusion: "success" },
          { name: "build", conclusion: "success" },
        ],
      }),
    } as unknown as GitHubClient;
    const repository = new GitHubImplementedSoftwareElementsRepository(client, {
      find: async () => design,
      findByCycle: async () => [design],
      save: async () => {},
    });

    const [artifact] = await repository.findByCycle("#1");

    expect(artifact.elements?.[0]).toMatchObject({
      elementDesign: { designId: "application-design" },
      artifactReferences: [
        "pr:#10",
        "commit:head-sha",
        "source:src/application.ts",
      ],
      unimplementedItems: [],
    });
    expect(artifact.elements?.[0].checks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "unit test",
          kind: "local",
          passed: true,
        }),
        expect.objectContaining({
          name: "integration test",
          kind: "ci",
          passed: true,
        }),
        expect.objectContaining({
          name: "lint",
          kind: "quality-guard",
          passed: true,
        }),
        expect.objectContaining({ name: "build", kind: "build", passed: true }),
      ]),
    );
  });
});

describe("GitHubIntegratedSoftwareRepository", () => {
  it(
    "明示的に対応付けられたintegration evidenceだけをrelationship/interfaceへ射影する",
    async () => {
      const repository = createIntegratedRepository([
        "integration relationship:application->infra:dependency",
        "contract interface:application-port",
        "build",
      ]);

      const [artifact] = await repository.findByCycle("#1");

      expect(artifact.artifactReferences).toEqual(
        expect.arrayContaining(["branch:main@main-sha", "workflow-run:20"]),
      );
      expect(artifact.evidence).toEqual(
        expect.arrayContaining([
          "integration-test:integration relationship:application->infra:dependency:success",
          "integration-test:contract interface:application-port:success",
          "build:build:success",
          "workflow:CI:success",
        ]),
      );
      expect(artifact.relationships).toEqual([
        expect.objectContaining({
          sourceElementId: "application",
          targetElementId: "infra",
          type: "dependency",
          evidence: [
            "integration-test:integration relationship:application->infra:dependency:success",
          ],
        }),
      ]);
      expect(artifact.interfaces).toEqual([
        expect.objectContaining({
          interfaceId: "application-port",
          evidence: [
            "integration-test:contract interface:application-port:success",
          ],
        }),
      ]);
      expect(artifact.unresolvedItems).toEqual([]);
    },
  );

  it(
    "genericなintegration testを全relationship/interfaceのevidenceへ流用しない",
    async () => {
      const repository = createIntegratedRepository(["integration test", "build"]);

      const [artifact] = await repository.findByCycle("#1");

      expect(artifact.relationships).toEqual([]);
      expect(artifact.interfaces).toEqual([]);
      expect(artifact.unresolvedItems).toEqual(
        expect.arrayContaining([
          "relationship integration evidence not found: application -> infra (dependency)",
          "interface integration evidence not found: application-port",
        ]),
      );
    },
  );
});
