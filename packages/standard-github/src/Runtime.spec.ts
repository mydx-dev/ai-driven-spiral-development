import type { GitHubClient } from "@mydx-dev/spiral-github";
import {
  ImplementedSoftwareElements,
  IntegratedSoftware,
  SoftwareArchitectureDescription,
  SoftwareRequirementsSpecification,
  StakeholderRequirementsSpecification,
  StandardCycle,
  SystemArchitectureDescription,
  SystemRequirementsSpecification,
  ValidationResult,
  VerificationResult,
} from "@mydx-dev/spiral-standard";
import { beforeEach, describe, expect, it, vi } from "vitest";

type CycleState = {
  id: string;
  newInformation: StandardCycle["newInformation"];
  changedInformation: StandardCycle["changedInformation"];
};
type IssueComment = { body: string };

type RuntimeState = {
  stakeholder: StakeholderRequirementsSpecification[];
  system: SystemRequirementsSpecification[];
  systemArchitecture: SystemArchitectureDescription[];
  software: SoftwareRequirementsSpecification[];
  softwareArchitecture: SoftwareArchitectureDescription[];
  implementations: ImplementedSoftwareElements[];
  integrations: IntegratedSoftware[];
  verifications: VerificationResult[];
  validations: ValidationResult[];
  cycle: CycleState;
  nextCycle: CycleState;
  comments: IssueComment[];
  gateWrites: Array<{ kind: string; process?: string; artifactId?: string }>;
};

const state = vi.hoisted<RuntimeState>(() => ({
  stakeholder: [],
  system: [],
  systemArchitecture: [],
  software: [],
  softwareArchitecture: [],
  implementations: [],
  integrations: [],
  verifications: [],
  validations: [],
  cycle: new StandardCycle("#1", "none", "none"),
  nextCycle: new StandardCycle("#2", "none", "none"),
  comments: [],
  gateWrites: [],
}));

vi.mock("./RuntimeRepositories.js", () => {
  const repository = <T>(values: () => T[], kind: string) => ({
    find: async () => values()[0],
    findByCycle: async () => values(),
    save: async () => {},
    saveGateResult: async (artifactId: string) => {
      state.gateWrites.push({ kind, artifactId });
    },
    saveCompositeGateResult: async ({ processName }: { processName: string }) => {
      state.gateWrites.push({ kind: "composite", process: processName });
    },
    findAnyArtifactIssue: async () => ({ number: 1, title: "", body: "" }),
  });
  const empty = repository(() => [], "empty");

  return {
    CompositeArtifactRepository: class {
      constructor(readonly repositories: Array<{ findByCycle(cycleId: string): Promise<unknown[]> }>) {}
      async find() {
        return undefined;
      }
      async findByCycle(cycleId: string) {
        return (
          await Promise.all(
            this.repositories.map((item) => item.findByCycle(cycleId)),
          )
        ).flat();
      }
      async save() {}
    },
    createStandardRuntimeRepositories: () => ({
      stakeholderRequirementsRepository: repository(
        () => state.stakeholder,
        "stakeholder",
      ),
      systemRequirementsRepository: repository(() => state.system, "system"),
      systemArchitectureDescriptionRepository: repository(
        () => state.systemArchitecture,
        "systemArchitecture",
      ),
      softwareRequirementsRepository: repository(
        () => state.software,
        "software",
      ),
      softwareArchitectureDescriptionRepository: repository(
        () => state.softwareArchitecture,
        "softwareArchitecture",
      ),
      softwareElementDesignRepository: empty,
      implementedSoftwareElementsRepository: repository(
        () => state.implementations,
        "implementation",
      ),
      integratedSoftwareRepository: repository(
        () => state.integrations,
        "integration",
      ),
      verificationResultRepository: repository(
        () => state.verifications,
        "verification",
      ),
      validationResultRepository: repository(
        () => state.validations,
        "validation",
      ),
      feedbackStateRepository: empty,
      cycleRepository: {
        create: async () => state.cycle,
        find: async () => state.cycle,
        save: async () => {},
        createNext: async () => state.nextCycle,
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
    if (method === "GET" && path.endsWith("/comments")) return state.comments;
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

const populatePassingArtifacts = () => {
  state.stakeholder = [
    new StakeholderRequirementsSpecification(
      "strs-1",
      "#1",
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
    ),
  ];
  state.system = [
    new SystemRequirementsSpecification(
      "syrs-1",
      "#1",
      null,
      null,
      null,
      null,
      null,
      null,
      null,
    ),
  ];
  state.systemArchitecture = [
    new SystemArchitectureDescription(
      "system-architecture-1",
      "#1",
      null,
      null,
      null,
      null,
      null,
      null,
    ),
  ];
  state.software = [
    new SoftwareRequirementsSpecification("srs-1", "#1", null, null, null, null),
  ];
  state.softwareArchitecture = [
    new SoftwareArchitectureDescription(
      "software-architecture-1",
      "#1",
      null,
      null,
      null,
      null,
      null,
    ),
  ];
  state.implementations = [
    new ImplementedSoftwareElements("implementation-1", "#1", null),
  ];
  state.integrations = [
    new IntegratedSoftware(
      "integrated-1",
      "#1",
      null,
      null,
      null,
      null,
      null,
      null,
    ),
  ];
  state.verifications = [new VerificationResult("verification-1", "#1", null)];
  state.validations = [new ValidationResult("validation-1", "#1", null)];
};

const circulate = async (name: string) => {
  const messages: StandardGitHubExecutionMessage[] = [];
  const runtime = createStandardGitHubRuntime({
    client,
    channel: idempotentChannel(messages),
  });
  await runtime.circulate({ cycleId: "#1", name, eventId: `event-${name}` });
  return messages;
};

describe("Standard GitHub Runtime", () => {
  beforeEach(() => {
    state.stakeholder = [];
    state.system = [];
    state.systemArchitecture = [];
    state.software = [];
    state.softwareArchitecture = [];
    state.implementations = [];
    state.integrations = [];
    state.verifications = [];
    state.validations = [];
    state.cycle = new StandardCycle("#1", "none", "none");
    state.nextCycle = new StandardCycle("#2", "none", "none");
    state.comments = [];
    state.gateWrites = [];
  });

  it("公開Process / Stage名を8工程へ統一する", () => {
    expect(standardGitHubStageNames).toEqual([
      ...standardGitHubProcessNames,
      "フィードバック",
    ]);
  });

  it("StRS Gate失敗時に要求定義をretryする", async () => {
    const messages = await circulate("要求定義");
    expect(messages[0]).toMatchObject({
      type: "retry",
      processName: "要求定義",
      errors: ["StRSが1件も存在しません"],
    });
  });

  it("StRS Artifactだけで要求定義が通過し次工程へdispatchする", async () => {
    populatePassingArtifacts();
    const messages = await circulate("要求定義");
    expect(messages[0]).toMatchObject({
      type: "start",
      processName: "システム要件定義",
    });
    expect(state.gateWrites).toContainEqual({
      kind: "stakeholder",
      artifactId: "strs-1",
    });
  });

  it.each([
    ["システム要件定義", "ソフトウェア要件定義"],
    ["ソフトウェア要件定義", "実装"],
    ["実装", "統合"],
  ])("%s Composite Gateを評価して%sへdispatchする", async (stage, next) => {
    populatePassingArtifacts();
    const messages = await circulate(stage);
    expect(messages[0]).toMatchObject({ type: "start", processName: next });
    expect(state.gateWrites).toContainEqual({
      kind: "composite",
      process: stage,
    });
  });

  it.each([
    ["統合", "QA"],
    ["QA", "検収"],
  ])("%sが正式Artifactを評価して%sへdispatchする", async (stage, next) => {
    populatePassingArtifacts();
    const messages = await circulate(stage);
    expect(messages[0]).toMatchObject({ type: "start", processName: next });
  });

  it("検収がValidation Artifactを評価する", async () => {
    populatePassingArtifacts();
    const messages = await circulate("検収");
    expect(messages).toHaveLength(0);
    expect(state.gateWrites).toContainEqual({
      kind: "validation",
      artifactId: "validation-1",
    });
  });

  it("Feedback stateに次Cycle判定があれば要求定義を開始する", async () => {
    state.cycle = new StandardCycle("#1", "exists", "none");
    const messages = await circulate("フィードバック");
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
    const input = { cycleId: "#1", name: "要求定義", eventId: "same-event" };
    expect(await runtime.circulate(input)).toEqual({ status: "processed" });
    expect(await runtime.circulate(input)).toEqual({ status: "duplicate" });
    expect(messages).toHaveLength(1);
  });

  it("旧工程名をSemantic Completion Eventとして拒否する", async () => {
    await expect(circulate("Demand Definition")).rejects.toThrow(
      "Invalid semantic completion event name: Demand Definition",
    );
  });
});
