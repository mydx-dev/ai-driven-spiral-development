import type { Artifact } from "../../core/Artifact";
import type { Requirement } from "./Requirement";

export class Demand implements Artifact {
  constructor(
    public readonly id: string,
    public readonly cycleId: string,
    public readonly target: string,
    public readonly currentState: string,
    public readonly expectedState: string,
    public readonly source: string,
    public readonly requirements: Requirement[],
  ) {}
}
