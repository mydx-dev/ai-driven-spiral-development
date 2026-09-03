import { describe, expect, it, vi } from "vitest";
import type { GitHubClient } from "@mydx-dev/spiral-github";
import {
  SoftwareArchitectureDescription,
  StakeholderRequirementsSpecification,
  SystemRequirementsSpecification,
} from "@mydx-dev/spiral-standard";
import {
  softwareArchitectureDescriptionIssueCodec,
  stakeholderRequirementsIssueCodec,
  standardArtifactIssueCodecs,
  standardArtifactIssueCodecsByStage,
  systemRequirementsIssueCodec,
} from "./StandardArtifactIssueCodecs.js";
import { StandardArtifactIssueRepository } from "./StandardArtifactIssueRepository.js";
import {
  feedbackStateIssueCodec,
  StandardFeedbackState,
} from "./StandardFeedbackState.js";

type StoredIssue = {
  number: number;
  title: string;
  body: string;
};

const inMemoryClient = () => {
  const issues: StoredIssue[] = [];
  const searchIssues = vi.fn(async (query: string) => {
    const marker = query.match(/"([^"]+)"/)?.[1];
    return {
      items: marker
        ? issues.filter((issue) => issue.body.includes(marker))
        : [],
    };
  });
  const createIssue = vi.fn(async (input: { title: string; body?: string }) => {
    const issue = {
      number: issues.length + 100,
      title: input.title,
      body: input.body ?? "",
    };
    issues.push(issue);
    return issue;
  });
  const updateIssue = vi.fn(
    async (number: number, input: { title?: string; body?: string }) => {
      const issue = issues.find((candidate) => candidate.number === number);
      if (!issue) throw new Error(`Issue not found: ${number}`);
      if (input.title !== undefined) issue.title = input.title;
      if (input.body !== undefined) issue.body = input.body;
      return issue;
    },
  );

  return {
    issues,
    client: {
      searchIssues,
      createIssue,
      updateIssue,
    } as unknown as GitHubClient,
  };
};

const createStRs = () =>
  new StakeholderRequirementsSpecification(
    "strs-order",
    "cycle-1",
    ["customer"],
    "order management",
    "sales",
    "manual process",
    "browser",
    [
      {
        id: "need-1",
        statement: "注文を登録できること",
        source: "customer",
      },
    ],
    null,
    ["customer places an order"],
    null,
  );

const createSyRs = () =>
  new SystemRequirementsSpecification(
    "syrs-order",
    "cycle-1",
    "order system",
    "sales",
    "web system",
    [
      {
        id: "sys-1",
        statement: "注文を受け付ける",
        category: "functional",
        tracesTo: [{ specificationId: "strs-order", requirementId: "need-1" }],
      },
    ],
    null,
    null,
    null,
  );

const createSoftwareArchitecture = () =>
  new SoftwareArchitectureDescription(
    "software-architecture-order",
    "cycle-1",
    [
      { id: "api", name: "API", responsibilities: ["receive order"] },
      {
        id: "repository",
        name: "Repository",
        responsibilities: ["persist order"],
      },
    ],
    [
      {
        sourceElementId: "api",
        targetElementId: "repository",
        type: "dependency",
        description: "API persists through repository",
      },
    ],
    [],
    [
      {
        requirement: { specificationId: "srs-order", requirementId: "swr-1" },
        elementIds: ["api"],
      },
    ],
    [],
  );

describe("StandardArtifactIssueRepository", () => {
  it("Artifact IDをIssue numberと分離して保存しGitHub Issueから復元できる", async () => {
    const { client, issues } = inMemoryClient();
    const repository = new StandardArtifactIssueRepository(
      client,
      stakeholderRequirementsIssueCodec,
    );
    await repository.save(createStRs());
    expect(issues[0].number).toBe(100);
    expect(issues[0].body).toContain("spiral-artifact-id: strs-order");
    expect(issues[0].body).toContain("spiral-cycle-id: cycle-1");
    const restored = await repository.find("strs-order");
    expect(restored).toBeInstanceOf(StakeholderRequirementsSpecification);
    expect(restored).toEqual(createStRs());
  });

  it("Cycle markerから同一CycleのArtifactを復元できる", async () => {
    const { client } = inMemoryClient();
    const repository = new StandardArtifactIssueRepository(
      client,
      stakeholderRequirementsIssueCodec,
    );
    await repository.save(createStRs());
    const artifacts = await repository.findByCycle("cycle-1");
    expect(artifacts).toHaveLength(1);
    expect(artifacts[0].id).toBe("strs-order");
  });

  it("traceability対象ArtifactがIssue化済みならIssue linkとして表現する", async () => {
    const { client, issues } = inMemoryClient();
    await new StandardArtifactIssueRepository(
      client,
      stakeholderRequirementsIssueCodec,
    ).save(createStRs());
    await new StandardArtifactIssueRepository(
      client,
      systemRequirementsIssueCodec,
    ).save(createSyRs());
    expect(issues[1].body).toContain("- #100 — `strs-order`");
    expect(systemRequirementsIssueCodec.traceability(createSyRs())).toEqual([
      "strs-order",
    ]);
  });

  it("Software Architecture dependency graphをIssueへ機械可読Artifactとは別に表示する", async () => {
    const { client, issues } = inMemoryClient();
    const repository = new StandardArtifactIssueRepository(
      client,
      softwareArchitectureDescriptionIssueCodec,
    );
    await repository.save(createSoftwareArchitecture());
    expect(issues[0].body).toContain("## Dependency Graph");
    expect(issues[0].body).toContain("`api` -> `repository`");
    const restored = await repository.find("software-architecture-order");
    expect(restored).toBeInstanceOf(SoftwareArchitectureDescription);
    expect(restored?.dependencyGraph().get("api")).toEqual(
      new Set(["repository"]),
    );
  });

  it("Gate ResultをIssueへ記録してもArtifact Dataを保持する", async () => {
    const { client, issues } = inMemoryClient();
    const repository = new StandardArtifactIssueRepository(
      client,
      stakeholderRequirementsIssueCodec,
    );
    await repository.save(createStRs());
    await repository.saveGateResult("strs-order", {
      passed: false,
      errors: ["Stakeholder Requirementが未確定です"],
    });
    expect(issues[0].body).toContain("- [ ] FAIL");
    expect(issues[0].body).toContain("Stakeholder Requirementが未確定です");
    expect((await repository.find("strs-order"))?.requirements?.[0].id).toBe(
      "need-1",
    );
  });

  it("複数Artifactを持つProcessのComposite Gate Resultを対象Issueすべてへ保存する", async () => {
    const { client, issues } = inMemoryClient();
    const repository = new StandardArtifactIssueRepository(
      client,
      stakeholderRequirementsIssueCodec,
    );
    await repository.save(createStRs());
    await new StandardArtifactIssueRepository(
      client,
      systemRequirementsIssueCodec,
    ).save(createSyRs());
    await repository.saveCompositeGateResult({
      processName: "システム要件定義",
      artifactIds: ["strs-order", "syrs-order"],
      gateResult: { passed: false, errors: ["Architecture未完了"] },
    });
    expect(issues[0].body).toContain("## Composite Gate Result");
    expect(issues[1].body).toContain("## Composite Gate Result");
    expect(issues[0].body).toContain("`システム要件定義`");
    expect(issues[1].body).toContain("Architecture未完了");
  });

  it("Feedback / next-cycle decision stateをCycleに紐づけて復元できる", async () => {
    const { client, issues } = inMemoryClient();
    const repository = new StandardArtifactIssueRepository(
      client,
      feedbackStateIssueCodec,
    );
    const state = new StandardFeedbackState(
      "feedback-cycle-1",
      "cycle-1",
      "exists",
      "none",
      true,
    );
    await repository.save(state);
    expect(issues[0].body).toContain("## Next-cycle Decision");
    expect(issues[0].body).toContain("Start next Cycle");
    expect(await repository.find("feedback-cycle-1")).toEqual(state);
  });

  it("Issue codec mappingにはIssue-backed / Runtime-managed Artifactだけを含める", () => {
    expect(Object.keys(standardArtifactIssueCodecs)).toEqual([
      "stakeholderRequirements",
      "systemRequirements",
      "systemArchitectureDescription",
      "softwareRequirements",
      "softwareArchitectureDescription",
      "softwareElementDesign",
      "verificationResult",
      "validationResult",
      "feedbackState",
    ]);
    expect(standardArtifactIssueCodecsByStage.実装).toEqual([
      expect.objectContaining({ artifactType: "software-element-design" }),
    ]);
    expect(standardArtifactIssueCodecsByStage.統合).toEqual([]);
  });

  it("同一Artifact IDが複数Issueへmappingされていれば復元を拒否する", async () => {
    const { client, issues } = inMemoryClient();
    const repository = new StandardArtifactIssueRepository(
      client,
      stakeholderRequirementsIssueCodec,
    );
    await repository.save(createStRs());
    issues.push({ ...issues[0], number: 101 });
    await expect(repository.find("strs-order")).rejects.toThrow(
      "mapped to multiple GitHub Issues",
    );
  });
});
