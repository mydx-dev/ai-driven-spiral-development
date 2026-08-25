import type { CycleClass, InferProcessNames } from "./Cycle";

export class SemanticCompletionEvent<TCycleClass extends CycleClass<any, any>> {
  constructor({
    cycleId,
    name,
    cycleDefinition,
  }: {
    cycleId: string;
    name: string;
    cycleDefinition: TCycleClass;
  }) {
    const allowedNames = ["cycle", ...cycleDefinition.processNames()];

    if (!allowedNames.includes(name)) {
      throw new Error(`Invalid semantic completion event name: ${name}`);
    }

    this.cycleId = cycleId;
    this.name = name as "cycle" | InferProcessNames<TCycleClass>;
  }

  public readonly cycleId: string;
  public readonly name: "cycle" | InferProcessNames<TCycleClass>;

  isCycleCompletion(): boolean {
    return this.name === "cycle";
  }
}
