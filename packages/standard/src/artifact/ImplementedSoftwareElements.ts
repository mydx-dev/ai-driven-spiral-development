import type { Artifact } from "@mydx-dev/ai-driven-spiral-development";

export type SoftwareDesignElementReference = {
  readonly designId: string;
  readonly elementId: string;
};

export type ImplementationCheckResult = {
  readonly name: string;
  readonly passed: boolean;
  readonly details: string | null;
};

export type ImplementedSoftwareElement = {
  readonly id: string;
  readonly designElement: SoftwareDesignElementReference;
  readonly artifactReferences: string[];
  readonly checks: ImplementationCheckResult[] | null | undefined;
  readonly knownConstraints: string[] | null | undefined;
  readonly unimplementedItems: string[] | null | undefined;
};

export class ImplementedSoftwareElements implements Artifact {
  constructor(
    public readonly id: string,
    public readonly cycleId: string,
    public readonly elements: ImplementedSoftwareElement[] | null | undefined,
  ) {}
}
