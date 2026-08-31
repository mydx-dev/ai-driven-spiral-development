import type { GitHubClient } from "@mydx-dev/spiral-github";
import { Demand, StandardCycle } from "@mydx-dev/spiral-standard";
import { beforeEach, describe, expect, it, vi } from "vitest";

type CycleState = {
  id: string;
  newInformation: StandardCycle["newInformation"];
  changedInformation: StandardCycle["changedInformation"];
};

type IssueComment = {
  body: string;
};

const state = vi.hoisted(() => ({
  demands: [] as Demand[],
  cycle: null as CycleState | null,
  nextCycle: null as CycleState | null,
  saved: [] as CycleState[],
  comments: [] as IssueComment[],
}));

vi.mock("./Repositories.js", () => {
  const emptyRepository = {
    find: async () => undefined,
    findByCycle: async () => [],
    save: async () => {},
  };

  return {
    createStandardGitHubRepositories: () => ({
      demandRepository: {
        find: async () => state.demands[0],
        findByCycle: async () => state.demands,
        save: async () => {},
      },
      requirementRepository: {
        find: async () => undefined,
        findByCycle: async () => [],
      },
      externalSpecRepository: emptyRepository,
      implementationRepository: emptyRepository,
      qaReportRepository: emptyRepository,
      releaseRepository: emptyRepository,
      acceptanceReportRepository: emptyRepository,
      cycleRepository: {
        create: async () => state.cycle!,
        find: async () => state.cycle!,
        save: async (cycle: CycleState) => {
          state.saved.push(cycle);
        },
        createNext: async () => state.nextCycle!,
      },
    }),
  };
});

import {
  createStandardGitHubRuntime,
  standardGitHubProcessNames,
  standardGitHubStageNames,
  type StandardGitHubExecutionMessage,
} from "./Runtime.js";

const client = {
  repositoryPath: (path: string) => `repos/example/repo${path}`,
  request: async (method: string, path: string, body?: { body?: string }) => {
    if (method === "GET" && path.endsWith("/comments")) {
      return state.comments;
    }
    if (method === "POST" && path.endsWith("/comments")) {
      state.comments.push({ body: body?.body ?? "" });
      return {};
    }
    throw new Error(`Unexpected GitHub request: ${method} ${path}`);
  },
} as GitHubClient;

const idempotentChannel = (messages: StandardGitHubExecutionMessage[]) => {
  const processed = new Set<string>();
  return {
    send: async (message: StandardGitHubExecutionMessage) => {
      if (processed.has(message.idempotencyKey)) return;
      processed.add(message.idempotencyKey);
      messages.push(message);
    },
  };
};

describe("Standard GitHub Runtime", () => {
  beforeEach(() => {
    state.demands = [];
    state.cycle = new StandardCycle("#1", "none", "none");
    state.nextCycle = new StandardCycle("#2", "none", "none");
    state.saved = [];
    state.comments = [];
  });

  it("公開Process / Stage名を8工程へ統一する", () => {
    expect(standardGitHubProcessNames).toEqual([
      "要求定義",
      "システム要件定義",
      "ソフトウェア要件定義",
      "実装",
      "統合",
      "QA",
      "検収",
    ]);
    expect(standardGitHubStageNames).toEqual([
      ...standardGitHubProcessNames,
      "フィードバック",
    ]);
  });

  it("Gate falseで同一Processをretryする", async () => {
    const messages: StandardGitHubExecutionMessage[] = [];
    const runtime = createStandardGitHubRuntime({
      client,
      channel: idempotentChannel(messages),
    });

    await runtime.circulate({
      cycleId: "#1",
      name: "要求定義",
      eventId: "event-1",
    });

    expect(messages).toEqual([
      {
        type: "retry",
        idempotencyKey:
          "event-1:retry:%231:%E8%A6%81%E6%B1%82%E5%AE%9A%E7%BE%A9",
        cycleId: "#1",
        processName: "要求定義",
        errors: ["Demandが1件も存在しません"],
      },
    ]);
  });

  it("Gate trueで次のシステム要件定義を開始する", async () => {
    state.demands = [
      new Demand("#10", "#1", "予約", "未対応", "対応済み", "顧客", []),
    ];
    const messages: StandardGitHubExecutionMessage[] = [];
    const runtime = createStandardGitHubRuntime({
      client,
      channel: idempotentChannel(messages),
    });

    await runtime.circulate({
      cycleId: "#1",
      name: "要求定義",
      eventId: "event-2",
    });

    expect(messages[0]).toMatchObject({
      type: "start",
      cycleId: "#1",
      processName: "システム要件定義",
    });
  });

  it("フィードバックで次Cycleを生成して要求定義を開始する", async () => {
    state.cycle = new StandardCycle("#1", "exists", "none");
    const messages: StandardGitHubExecutionMessage[] = [];
    const runtime = createStandardGitHubRuntime({
      client,
      channel: idempotentChannel(messages),
    });

    await runtime.circulate({
      cycleId: "#1",
      name: "フィードバック",
      eventId: "event-3",
    });

    expect(state.saved.map(({ id }) => id)).toContain("#2");
    expect(messages[0]).toMatchObject({
      type: "start",
      cycleId: "#2",
      processName: "要求定義",
    });
  });

  it("同じSemantic Completion eventを重複処理しない", async () => {
    const messages: StandardGitHubExecutionMessage[] = [];
    const runtime = createStandardGitHubRuntime({
      client,
      channel: idempotentChannel(messages),
    });

    const first = await runtime.circulate({
      cycleId: "#1",
      name: "要求定義",
      eventId: "same-event",
    });
    const second = await runtime.circulate({
      cycleId: "#1",
      name: "要求定義",
      eventId: "same-event",
    });

    expect(first).toEqual({ status: "processed" });
    expect(second).toEqual({ status: "duplicate" });
    expect(messages).toHaveLength(1);
  });

  it("旧工程名をSemantic Completion Eventとして拒否する", async () => {
    const runtime = createStandardGitHubRuntime({
      client,
      channel: { send: async () => {} },
    });

    await expect(
      runtime.circulate({
        cycleId: "#1",
        name: "Demand Definition",
        eventId: "legacy-event",
      }),
    ).rejects.toThrow(
      "Invalid semantic completion event name: Demand Definition",
    );
  });
});
