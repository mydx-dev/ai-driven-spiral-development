import type { Artifact } from "ai-driven-spiral-development";

export class Release implements Artifact {
  constructor(
    public readonly id: string,
    public readonly implementationId: string,
    public readonly qaReportId: string,
    public readonly target: string,
    public readonly releaseNotes: string,
    public readonly releaseProcedure: string,
    public readonly acceptanceProcedure: string,
    public readonly ready: boolean,
    public readonly version?: string,
  ) {}
}
