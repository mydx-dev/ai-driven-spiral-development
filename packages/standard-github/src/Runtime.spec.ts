import type { GitHubClient } from "@mydx-dev/spiral-github";
import { Demand, StandardCycle } from "@mydx-dev/spiral-standard";
import { beforeEach, describe, expect, it, vi } from "vitest";

type CycleState = {
  id: string;
  newDemand: StandardCycle["newDemand"];
  changedDemand: StandardCycle["changedDemand"];
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
  failNextCommentWrite: false,
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
  type StandardGitHubExecutionMessage,
} from "./Runtime.js";

const client = {
  repositoryPath: (path: string) => `repos/example/repo${path}`,
  request: async (method: string, path: string, body?: { body?: string }) => {
    if (method === "GET" && path.endsWith("/comments")) {
      return state.comments;
    }
    if (method === "POST" && path.endsWith("/comments")) {
      if (state.failNextCommentWrite) {
        state.failNextCommentWrite = false;
        throw new Error("Semantic Completion marker write failed");
      }
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
    state.failNextCommentWrite = false;
  });

  it("Gate falseで同一Processをretryする", async () => {
    const messages: StandardGitHubExecutionMessage[] = [];
    const runtime = createStandardGitHubRuntime({
      client,
      channel: idempotentChannel(messages),
    });

    await runtime.circulate({
      cycleId: "#1",
      name: "Demand Definition",
      eventId: "event-1",
    });

    expect(messages).toEqual([
      {
        type: "retry",
        idempotencyKey: "event-1:retry:%231:Demand%20Definition",
        cycleId: "#1",
        processName: "Demand Definition",
        errors: ["Demandが1件も存在しません"],
      },
    ]);
    expect(state.saved).toHaveLength(1);
  });

  it("Gate trueで次Processを開始する", async () => {
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
      name: "Demand Definition",
      eventId: "event-2",
    });

    expect(messages).toEqual([
      {
        type: "start",
        idempotencyKey: "event-2:start:%231:Requirement%20Definition",
        cycleId: "#1",
        processName: "Requirement Definition",
      },
    ]);
  });

  it("cycle eventでfeedback後に次Cycleを生成して先頭Processを開始する", async () => {
    state.cycle = new StandardCycle("#1", "exists", "none");
    const messages: StandardGitHubExecutionMessage[] = [];
    const runtime = createStandardGitHubRuntime({
      client,
      channel: idempotentChannel(messages),
    });

    await runtime.circulate({
      cycleId: "#1",
      name: "cycle",
      eventId: "event-3",
    });

    expect(state.saved.map(({ id }) => id)).toContain("#2");
    expect(messages).toEqual([
      {
        type: "start",
        idempotencyKey: "event-3:start:%232:Demand%20Definition",
        cycleId: "#2",
        processName: "Demand Definition",
      },
    ]);
  });

  it("同一Process completion eventを再処理してもside effectを再発火しない", async () => {
    state.demands = [
      new Demand("#10", "#1", "予約", "未対応", "対応済み", "顧客", []),
    ];
    const messages: StandardGitHubExecutionMessage[] = [];
    const runtime = createStandardGitHubRuntime({
      client,
      channel: idempotentChannel(messages),
    });

    const first = await runtime.circulate({
      cycleId: "#1",
      name: "Demand Definition",
      eventId: "same-process-event",
    });
    const second = await runtime.circulate({
      cycleId: "#1",
      name: "Demand Definition",
      eventId: "same-process-event",
    });

    expect(first).toEqual({ status: "processed" });
    expect(second).toEqual({ status: "duplicate" });
    expect(messages).toHaveLength(1);
    expect(state.comments).toHaveLength(1);
  });

  it("同一cycle completion eventを再処理しても次Cycle開始を再発火しない", async () => {
    state.cycle = new StandardCycle("#1", "exists", "none");
    const messages: StandardGitHubExecutionMessage[] = [];
    const runtime = createStandardGitHubRuntime({
      client,
      channel: idempotentChannel(messages),
    });

    const first = await runtime.circulate({
      cycleId: "#1",
      name: "cycle",
      eventId: "same-cycle-event",
    });
    const second = await runtime.circulate({
      cycleId: "#1",
      name: "cycle",
      eventId: "same-cycle-event",
    });

    expect(first).toEqual({ status: "processed" });
    expect(second).toEqual({ status: "duplicate" });
    expect(messages).toHaveLength(1);
    expect(state.saved.filter(({ id }) => id === "#2")).toHaveLength(1);
    expect(state.comments).toHaveLength(1);
  });

  it("side effect後にmarker保存が失敗しても同一Process eventのside effectを再発火しない", async () => {
    state.demands = [
      new Demand("#10", "#1", "予約", "未対応", "対応済み", "顧客", []),
    ];
    state.failNextCommentWrite = true;
    const messages: StandardGitHubExecutionMessage[] = [];
    const runtime = createStandardGitHubRuntime({
      client,
      channel: idempotentChannel(messages),
    });

    await expect(
      runtime.circulate({
        cycleId: "#1",
        name: "Demand Definition",
        eventId: "recover-process-event",
      }),
    ).rejects.toThrow("Semantic Completion marker write failed");

    const retried = await runtime.circulate({
      cycleId: "#1",
      name: "Demand Definition",
      eventId: "recover-process-event",
    });

    expect(retried).toEqual({ status: "processed" });
    expect(messages).toHaveLength(1);
    expect(state.comments).toHaveLength(1);
  });

  it("side effect後にmarker保存が失敗しても同一cycle eventの次Cycle開始を再発火しない", async () => {
    state.cycle = new StandardCycle("#1", "exists", "none");
    state.failNextCommentWrite = true;
    const messages: StandardGitHubExecutionMessage[] = [];
    const runtime = createStandardGitHubRuntime({
      client,
      channel: idempotentChannel(messages),
    });

    await expect(
      runtime.circulate({
        cycleId: "#1",
        name: "cycle",
        eventId: "recover-cycle-event",
      }),
    ).rejects.toThrow("Semantic Completion marker write failed");

    const retried = await runtime.circulate({
      cycleId: "#1",
      name: "cycle",
      eventId: "recover-cycle-event",
    });

    expect(retried).toEqual({ status: "processed" });
    expect(messages).toHaveLength(1);
    expect(state.comments).toHaveLength(1);
  });

  it("別event idなら同一Processを再度完了通知できる", async () => {
    const messages: StandardGitHubExecutionMessage[] = [];
    const runtime = createStandardGitHubRuntime({
      client,
      channel: idempotentChannel(messages),
    });

    await runtime.circulate({
      cycleId: "#1",
      name: "Demand Definition",
      eventId: "retry-attempt-1",
    });
    await runtime.circulate({
      cycleId: "#1",
      name: "Demand Definition",
      eventId: "retry-attempt-2",
    });

    expect(messages).toHaveLength(2);
    expect(state.comments).toHaveLength(2);
  });

  it("未定義Process名をSemanticCompletionEventで拒否する", async () => {
    const runtime = createStandardGitHubRuntime({
      client,
      channel: { send: async () => {} },
    });

    await expect(
      runtime.circulate({
        cycleId: "#1",
        name: "Unknown",
        eventId: "event-unknown",
      }),
    ).rejects.toThrow("Invalid semantic completion event name: Unknown");
  });
});
