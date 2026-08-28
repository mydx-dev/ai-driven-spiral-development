import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import type { GitHubClient } from "@mydx-dev/spiral-github";
import {
  DemandIssue,
  DemandRepository,
  EngineeringChecks,
  ExternalSpecIssue,
  ExternalSpecRepository,
  QARequirementIssue,
  StandardCycleIssueTemplate,
  StandardCycleRepository,
  standardGitHubIssueBodies,
} from "./index.js";

const fakeClient = (overrides: Partial<GitHubClient> = {}) =>
  ({
    getIssue: vi.fn(),
    createIssue: vi.fn(),
    updateIssue: vi.fn(),
    searchIssues: vi.fn(),
    searchPullRequests: vi.fn(),
    getPullRequest: vi.fn(),
    listCheckRuns: vi.fn(),
    listPullRequestReviews: vi.fn(),
    listPullRequestReviewThreads: vi.fn(),
    ...overrides,
  }) as unknown as GitHubClient;

describe("Standard × GitHub Binding", () => {
  it("Cycle IssueとDemand IssueをStandard Demandへmappingする", async () => {
    const getIssue = vi.fn(async (number: number) => {
      if (number === 10) {
        return { number: 10, body: "## 要求\n\n- #21" };
      }
      return {
        number: 21,
        body: `### 要求対象\n\n受注\n\n### 現在状態\n\n手入力\n\n### 期待状態\n\n自動化\n\n### 発生源\n\n顧客\n\n## 要件\n\n- [R1] 受注を登録できること`,
      };
    });
    const repository = new DemandRepository(fakeClient({ getIssue }));

    const [demand] = await repository.findByCycle("#10");

    expect(demand.id).toBe("#21");
    expect(demand.cycleId).toBe("#10");
    expect(demand.target).toBe("受注");
    expect(demand.requirements[0]).toMatchObject({
      id: "#21-R1",
      detail: "受注を登録できること",
    });
  });

  it("CycleとFeature IssueからExternalSpecを復元する", async () => {
    const getIssue = vi.fn(async (number: number) => {
      if (number === 10) {
        return { number: 10, body: "## Feature\n\n- #31" };
      }
      return {
        number: 31,
        body: "## 対象要件\n\n- #21-R1\n\n## 外部設計\n\nPOST /orders",
      };
    });
    const demandRepository = {
      find: vi.fn(),
      findByCycle: vi.fn().mockResolvedValue([
        {
          id: "#21",
          requirements: [{ id: "#21-R1", detail: "要件" }],
        },
      ]),
      save: vi.fn(),
    };
    const repository = new ExternalSpecRepository(
      fakeClient({ getIssue }),
      demandRepository as never,
    );

    const [spec] = await repository.findByCycle("#10");

    expect(spec.requirementIds).toEqual(["#21-R1"]);
    expect(spec.features[0]).toMatchObject({
      id: "#31",
      requirementIds: ["#21-R1"],
    });
    expect(spec.features[0].detail).toContain("POST /orders");
  });

  it("Issue Template本文はBinding parserが解釈するschemaを持つ", () => {
    const demandBody = standardGitHubIssueBodies.demand.replace(
      /<!-- Requirement ID[\s\S]*?-->/,
      "- [R1] 受注を登録できること\n  - [x] QA: 登録成功を確認",
    );
    const featureBody = standardGitHubIssueBodies.feature.replace(
      /<!-- Demand Issue番号[\s\S]*?-->/,
      "- #21-R1",
    );

    expect(new DemandIssue(demandBody, 21).requirements()[0]).toMatchObject({
      id: "#21-R1",
      detail: "受注を登録できること",
    });
    expect(new QARequirementIssue(demandBody, 21).verifications()[0]).toMatchObject(
      {
        requirementId: "#21-R1",
        satisfied: true,
      },
    );
    expect(new ExternalSpecIssue(featureBody).requirementIds()).toEqual([
      "#21-R1",
    ]);
    expect(new StandardCycleIssueTemplate().render()).toBe(
      standardGitHubIssueBodies.cycle,
    );
  });

  it("次CycleをGitHub Issueとして作成し前Cycleへ双方向linkを保存する", async () => {
    const updateIssue = vi.fn().mockResolvedValue({});
    const client = fakeClient({
      getIssue: vi.fn().mockResolvedValue({
        number: 10,
        body: "## 前Cycle\n\n\n## 次Cycle\n\n",
      }),
      searchIssues: vi.fn().mockResolvedValue({ items: [] }),
      createIssue: vi.fn().mockResolvedValue({ number: 11, body: "" }),
      updateIssue,
    });
    const repository = new StandardCycleRepository(client, {
      findByCycle: vi.fn().mockResolvedValue([]),
    });

    const next = await repository.createNext({ id: "#10" } as never);

    expect(next.id).toBe("#11");
    expect(updateIssue).toHaveBeenCalledWith(
      10,
      expect.objectContaining({ body: expect.stringContaining("- #11") }),
    );
  });

  it("Engineering checksは対象checkが全てsuccessの場合だけpassする", () => {
    const checks = new EngineeringChecks([
      { name: "test", conclusion: "success" },
      { name: "build", conclusion: "success" },
      { name: "lint", conclusion: "failure" },
    ]);

    expect(checks.passed(/test/i)).toBe(true);
    expect(checks.passed(/build/i)).toBe(true);
    expect(checks.passed(/lint/i)).toBe(false);
  });

  it("runtime boundaryはCore / Standard / GitHubだけである", () => {
    const packageJson = JSON.parse(
      readFileSync(new URL("../package.json", import.meta.url), "utf8"),
    );

    expect(Object.keys(packageJson.peerDependencies).sort()).toEqual([
      "@mydx-dev/ai-driven-spiral-development",
      "@mydx-dev/spiral-github",
      "@mydx-dev/spiral-standard",
    ]);
    expect(packageJson.peerDependencies["@mydx-dev/spiral"]).toBeUndefined();
    expect(
      packageJson.peerDependencies["@mydx-dev/spiral-quality"],
    ).toBeUndefined();
  });
});
