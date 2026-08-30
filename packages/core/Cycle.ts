import type { Artifact } from "./Artifact.js";
import type { Process } from "./Process.js";
import type { GatePass } from "./ProcessGate.js";

export type CycleFeedbackResult = {
  readonly needNextCycle: boolean;
};

export type GateResult =
  | {
      readonly passed: true;
    }
  | {
      readonly passed: false;
      readonly errors: string[];
    };

export type CycleClass<
  TCycle extends Cycle,
  TProcessNames extends string = never,
  TConstructorArgs extends unknown[] = never[],
> = {
  new (...args: TConstructorArgs): TCycle;
  readonly __processNames?: TProcessNames;
  readonly cycleCompletionName?: string;
  processNames(): TProcessNames[];
};

export type CycleProceedResult<TCycle> = {
  readonly completed: boolean;
  readonly cycle: TCycle;
  readonly gateResult: GateResult;
  readonly dispatch: () => Promise<void>;
  readonly retry: (errors: string[]) => Promise<void>;
};

export type InferProcessNames<TCycleClass> = TCycleClass extends {
  readonly __processNames?: infer TProcessNames;
}
  ? Extract<TProcessNames, string>
  : never;

export type InferCycleCompletionName<TCycleClass> = TCycleClass extends {
  readonly cycleCompletionName: infer TCompletionName;
}
  ? Extract<TCompletionName, string>
  : "cycle";

type RoutedProcess = {
  readonly name: string;
  start(cycleId: string): Promise<void>;
  verifyComplete(cycleId: string): Promise<GatePass>;
  retry(cycleId: string, errors: string[]): Promise<void>;
};

type RoutedCycleClass<
  TCycleClass extends CycleClass<Cycle, string>,
  TName extends string,
> = Omit<TCycleClass, "__processNames" | "processNames"> &
  CycleClass<
    InstanceType<TCycleClass>,
    InferProcessNames<TCycleClass> | TName,
    ConstructorParameters<TCycleClass>
  >;

export abstract class Cycle implements Artifact {
  protected static readonly routeRegistry = new WeakMap<
    object,
    RoutedProcess[]
  >();

  static route<
    TCycleClass extends CycleClass<Cycle, string>,
    TName extends string,
    TArtifact extends Artifact,
    TCallMessage,
  >(
    this: TCycleClass,
    process: TName extends "cycle"
      ? never
      : Process<TName, TArtifact, TCallMessage>,
  ): RoutedCycleClass<TCycleClass, TName> {
    const completionName = this.cycleCompletionName ?? "cycle";
    if (process.name === "cycle" || process.name === completionName) {
      throw new Error(`"${process.name}" is reserved for cycle completion.`);
    }

    const routes = Cycle.routeRegistry.get(this) ?? [];

    routes.push(process);
    Cycle.routeRegistry.set(this, routes);

    return this as unknown as RoutedCycleClass<TCycleClass, TName>;
  }
  static processNames<TCycleClass extends CycleClass<Cycle, string>>(
    this: TCycleClass,
  ): string[] {
    return (Cycle.routeRegistry.get(this) ?? []).map((process) => process.name);
  }

  abstract readonly id: string;

  protected get routes(): readonly RoutedProcess[] {
    return Cycle.routeRegistry.get(this.constructor) ?? [];
  }

  public async start(): Promise<void> {
    const firstProcess = this.routes[0];

    if (!firstProcess) {
      throw new Error("Process route is empty.");
    }

    await firstProcess.start(this.id);
  }

  public async proceed(processName: string): Promise<CycleProceedResult<this>> {
    const index = this.routes.findIndex(
      (process) => process.name === processName,
    );

    const process = this.routes[index];

    if (!process) {
      throw new Error(`Process not found: ${processName}`);
    }

    const gatePass = await process.verifyComplete(this.id);

    if (!gatePass.passed) {
      return {
        completed: false,
        cycle: this,
        gateResult: gatePass,
        dispatch: async () => {},
        retry: (errors: string[]) => process.retry(this.id, errors),
      };
    }

    const nextProcess = this.routes[index + 1];

    if (nextProcess) {
      return {
        completed: false,
        cycle: this,
        gateResult: gatePass,
        dispatch: () => nextProcess.start(this.id),
        retry: (errors: string[]) => process.retry(this.id, errors),
      };
    }

    return {
      completed: true,
      cycle: this,
      gateResult: gatePass,
      dispatch: async () => {},
      retry: (errors: string[]) => process.retry(this.id, errors),
    };
  }

  abstract fallback(processName: string): this;
  abstract feedback(): CycleFeedbackResult;
}

export interface CycleRepository<TCycle extends Cycle> {
  create(): Promise<TCycle>;
  find(id: string): Promise<TCycle | undefined>;
  save(cycle: TCycle): Promise<void>;
}

export type CycleFactory<TCycle extends Cycle> = (
  previousCycle: TCycle,
) => Promise<TCycle>;
