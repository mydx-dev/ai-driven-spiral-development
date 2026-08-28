import type { GitHubClient } from "@mydx-dev/spiral-github";
import { Demand, StandardCycle } from "@mydx-dev/spiral-standard";
import { beforeEach, describe, expect, it, vi } from "vitest";

type CycleState = {
  id: string;
  newDemand: StandardCycle["newDemand"];
  changedDemand: StandardCycle["changedDemand"];
};

const state = vi.hoisted(() => ({
  demands: [] as Demand[],
  cycle: null as CycleState | null,
  nextCycle: null as CycleState | null,
  saved: [] as CycleState[],
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

const client = {} as GitHubClient;

describe("Standard GitHub Runtime", () => {
  beforeEach(() => {
    state.demands = [];
    state.cycle = new StandardCycle("#1", "none", "none");
    state.nextCycle = new StandardCycle("#2", "none", "none");
    state.saved = [];
  });

  it("Gate falseで同一Processをretryする", async () => {
    const messages: StandardGitHubExecutionMessage[] = [];
    const runtime = createStandardGitHubRuntime({
      client,
      channel: {
        send: async (message) => {
          messages.push(message);
        },
      },
    });

    await runtime.circulate({ cycleId: "#1", name: "Demand Definition" });

    expect(messages).toEqual([
      {
        type: "retry",
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
      channel: {
        send: async (message) => {
          messages.push(message);
        },
      },
    });

    await runtime.circulate({ cycleId: "#1", name: "Demand Definition" });

    expect(messages).toEqual([
      {
        type: "start",
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
      channel: {
        send: async (message) => {
          messages.push(message);
        },
      },
    });

    await runtime.circulate({ cycleId: "#1", name: "cycle" });

    expect(state.saved.map(({ id }) => id)).toContain("#2");
    expect(messages).toEqual([
      {
        type: "start",
        cycleId: "#2",
        processName: "Demand Definition",
      },
    ]);
  });

  it("未定義Process名をSemanticCompletionEventで拒否する", async () => {
    const runtime = createStandardGitHubRuntime({
      client,
      channel: { send: async () => {} },
    });

    await expect(
      runtime.circulate({ cycleId: "#1", name: "Unknown" }),
    ).rejects.toThrow("Invalid semantic completion event name: Unknown");
  });
});
