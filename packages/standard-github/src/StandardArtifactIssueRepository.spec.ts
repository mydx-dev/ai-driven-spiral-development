import { describe, expect, it, vi } from "vitest";
import type { GitHubClient } from "@mydx-dev/spiral-github";
import {
  StakeholderRequirementsSpecification,
  SystemRequirementsSpecification,
} from "@mydx-dev/spiral-standard";
import {
  stakeholderRequirementsIssueCodec,
  systemRequirementsIssueCodec,
} from "./StandardArtifactIssueCodecs.js";
import { StandardArtifactIssueRepository } from "./StandardArtifactIssueRepository.js";

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
    searchIssues,
    createIssue,
    updateIssue,
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
        tracesTo: [
          {
            specificationId: "strs-order",
            requirementId: "need-1",
          },
        ],
      },
    ],
    null,
    null,
    null,
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
