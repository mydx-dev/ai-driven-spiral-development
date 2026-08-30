import type { SoftwareArchitectureDescription } from "../artifact/SoftwareArchitectureDescription.js";

export class SoftwareElementExecutionPlan {
  constructor(public readonly architecture: SoftwareArchitectureDescription) {}

  executableElementIds(completedElementIds: Iterable<string>): string[] {
    const completed = new Set(completedElementIds);
    const dependencyGraph = this.architecture.dependencyGraph();
    const incompleteElementIds = [...dependencyGraph.keys()].filter(
      (elementId) => !completed.has(elementId),
    );

    const executableElementIds = incompleteElementIds.filter((elementId) =>
      [...(dependencyGraph.get(elementId) ?? [])].every((dependencyId) =>
        completed.has(dependencyId),
      ),
    );

    if (incompleteElementIds.length > 0 && executableElementIds.length === 0) {
      throw new Error(
        `Software Element execution is blocked by cyclic or unresolved dependencies: ${incompleteElementIds.join(", ")}`,
      );
    }

    return executableElementIds;
  }
}
