import type { SoftwareArchitectureDescription } from "../artifact/SoftwareArchitectureDescription.js";

export class SoftwareElementExecutionPlan {
  constructor(public readonly architecture: SoftwareArchitectureDescription) {}

  executableElementIds(completedElementIds: Iterable<string>): string[] {
    const completed = new Set(completedElementIds);
    const dependencyGraph = this.architecture.dependencyGraph();

    return [...dependencyGraph.entries()]
      .filter(
        ([elementId, dependencies]) =>
          !completed.has(elementId) &&
          [...dependencies].every((dependencyId) =>
            completed.has(dependencyId),
          ),
      )
      .map(([elementId]) => elementId);
  }
}
