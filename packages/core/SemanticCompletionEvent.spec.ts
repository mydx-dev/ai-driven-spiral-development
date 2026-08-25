import { describe, expect, expectTypeOf, it } from "vitest";
import { Artifact } from "./Artifact";
import { Cycle, CycleFeedbackResult } from "./Cycle";
import { Process } from "./Process";
import { SemanticCompletionEvent } from "./SemanticCompletionEvent";

class CustomCycle extends Cycle {
  constructor(
    public readonly id: string,
    public state: string,
  ) {
    super();
  }

  fallback(processName: string) {
    this.state = `${this.state}:${processName}`;
    return this;
  }

  feedback(): CycleFeedbackResult {
    return {
      needNextCycle: true,
    };
  }
}

describe("SemanticCompletionEvent", () => {
  it("ルートされたプロセス名で意味的完了イベントを生成できる", async () => {
    const firstProcess = {
      name: "Requirement Definition",
    } as Process<"Requirement Definition", Artifact, unknown>;

    const secondProcess = {
      name: "External Design",
    } as Process<"External Design", Artifact, unknown>;

    const CycleDefinition =
      CustomCycle.route(firstProcess).route(secondProcess);

    const event = new SemanticCompletionEvent({
      cycleId: "cycle-1",
      name: "Requirement Definition",
      cycleDefinition: CycleDefinition,
    });

    expect(event.cycleId).toBe("cycle-1");
    expect(event.name).toBe("Requirement Definition");
  });

  it("サイクル自身の意味的完了イベントを生成できる", () => {
    const firstProcess = {
      name: "Requirement Definition",
    } as Process<"Requirement Definition", Artifact, unknown>;

    const secondProcess = {
      name: "External Design",
    } as Process<"External Design", Artifact, unknown>;

    const CycleDefinition =
      CustomCycle.route(firstProcess).route(secondProcess);

    const event = new SemanticCompletionEvent({
      cycleId: "cycle-1",
      name: "cycle",
      cycleDefinition: CycleDefinition,
    });

    expect(event.name).toBe("cycle");
  });

  it("ルートされていない名前では意味的完了イベントを生成できない", () => {
    const firstProcess = {
      name: "Requirement Definition",
    } as Process<"Requirement Definition", Artifact, unknown>;

    const secondProcess = {
      name: "External Design",
    } as Process<"External Design", Artifact, unknown>;

    const CycleDefinition =
      CustomCycle.route(firstProcess).route(secondProcess);
    expect(
      () =>
        new SemanticCompletionEvent({
          cycleId: "cycle-1",
          name: "Unknown Process",
          cycleDefinition: CycleDefinition,
        }),
    ).toThrow();
  });

  it("イベント名はcycleまたはルートされたプロセス名に限定される", () => {
    const firstProcess = {
      name: "Requirement Definition",
    } as Process<"Requirement Definition", Artifact, unknown>;

    const secondProcess = {
      name: "External Design",
    } as Process<"External Design", Artifact, unknown>;

    const CycleDefinition =
      CustomCycle.route(firstProcess).route(secondProcess);
    expectTypeOf<
      SemanticCompletionEvent<typeof CycleDefinition>["name"]
    >().toEqualTypeOf<"cycle" | "Requirement Definition" | "External Design">();
  });

  it("複数のルートされたプロセス名を意味的完了イベントとして受け付ける", () => {
    const firstProcess = {
      name: "Requirement Definition",
    } as Process<"Requirement Definition", Artifact, unknown>;

    const secondProcess = {
      name: "External Design",
    } as Process<"External Design", Artifact, unknown>;

    const CycleDefinition =
      CustomCycle.route(firstProcess).route(secondProcess);

    const event1 = new SemanticCompletionEvent({
      cycleId: "cycle-1",
      name: "External Design",
      cycleDefinition: CycleDefinition,
    });

    expect(event1.name).toBe("External Design");
  });
});
