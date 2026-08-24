import type { Artifact } from "./Artifact";
import type { Process } from "./Process";
import type { GatePass } from "./ProcessGate";

export type CycleFeedbackResult = {
  readonly needNextCycle: boolean;
};

export type CycleNextResult =
  | {
      readonly completed: false;
      readonly cycle: Cycle;
      readonly gatePass: GatePass;
    }
  | {
      readonly completed: true;
      readonly cycle: Cycle;
      readonly gatePass: GatePass;
    };

type CycleClass = {
  readonly prototype: Cycle;
};

export abstract class Cycle implements Artifact {
  protected static readonly routeRegistry = new WeakMap<
    CycleClass,
    Process<any, any>[]
  >();

  static route<TCycleClass extends CycleClass>(
    this: TCycleClass,
    process: Process<any, any>,
  ): TCycleClass {
    const routes = Cycle.routeRegistry.get(this) ?? [];

    routes.push(process);

    Cycle.routeRegistry.set(this, routes);

    return this;
  }

  abstract readonly id: string;
  protected get routes(): readonly Process<any, any>[] {
    const CycleConstructor = this.constructor as typeof Cycle;
    return CycleConstructor.routeRegistry.get(CycleConstructor) ?? [];
  }

  public async start(): Promise<void> {
    const firstProcess = this.routes[0];

    if (!firstProcess) {
      throw new Error("Process route is empty.");
    }

    await firstProcess.start(this.id);
  }

  public async proceed(processName: string): Promise<CycleNextResult> {
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
        cycle: this.fallback(process.name),
        gatePass,
      };
    }

    const nextProcess = this.routes[index + 1];

    if (nextProcess) {
      await nextProcess.start(this.id);

      return {
        completed: false,
        cycle: this,
        gatePass,
      };
    }

    return {
      completed: true,
      cycle: this,
      gatePass,
    };
  }

  abstract fallback(processName: string): Cycle;
  abstract feedback(): CycleFeedbackResult;
}

export interface CycleRepository<TCycle extends Cycle> {
  create(): Promise<TCycle>;
  find(id: string): Promise<TCycle | undefined>;
  save(cycle: TCycle): Promise<void>;
}

export type CycleFactory<TCycle extends Cycle> = (
  previousCycle?: TCycle,
) => Promise<TCycle>;
