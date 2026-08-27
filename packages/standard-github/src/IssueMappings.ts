import {
  AcceptanceFeedback,
  DemandAcceptance,
  Requirement,
  RequirementVerification,
} from "@mydx-dev/spiral-standard";
import { GitHubIssue } from "@mydx-dev/spiral-github";

export class DemandIssue {
  constructor(
    public readonly body: string,
    public readonly issueNumber?: number,
  ) {}

  demandIssueNumbers(): number[] {
    const section = new GitHubIssue(this.body).readSection("## 要求", true);
    return [
      ...new Set(
        [...section.matchAll(/^-\s+#(\d+)\s*$/gm)].map((match) =>
          Number(match[1]),
        ),
      ),
    ];
  }

  requirements(): Requirement[] {
    if (!this.issueNumber) {
      throw new Error(
        "Demand Issue number is required to restore Requirements.",
      );
    }

    const section = new GitHubIssue(this.body).readSection("## 要件", true);
    const ids = new Set<string>();

    return [...section.matchAll(/^-\s+\[([A-Za-z0-9_-]+)\]\s+(.+)$/gm)].map(
      (match) => {
        const id = `#${this.issueNumber}-${match[1]}`;
        if (ids.has(id)) throw new Error(`Duplicate Requirement ID: ${id}`);
        ids.add(id);
        return new Requirement(id, match[2].trim());
      },
    );
  }
}

export class ExternalSpecIssue {
  constructor(public readonly body: string) {}

  featureIssueNumbers(): number[] {
    const section = new GitHubIssue(this.body).readSection("## Feature");
    return [
      ...new Set(
        [...section.matchAll(/^-\s+#(\d+)\s*$/gm)].map((match) =>
          Number(match[1]),
        ),
      ),
    ];
  }

  requirementIds(): string[] {
    const section = new GitHubIssue(this.body).readSection("## 対象要件");
    return [
      ...new Set(
        [...section.matchAll(/^-\s+(#\d+-[A-Za-z0-9_-]+)\s*$/gm)].map(
          (match) => match[1],
        ),
      ),
    ];
  }
}

export class QARequirementIssue {
  constructor(
    public readonly body: string,
    public readonly issueNumber: number,
  ) {}

  verifications(): RequirementVerification[] {
    const lines = new GitHubIssue(this.body)
      .readSection("## 要件")
      .split(/\r?\n/);
    const results: RequirementVerification[] = [];
    const verified = new Set<string>();
    let requirementId: string | undefined;

    for (const line of lines) {
      const requirement = line.match(/^-\s+\[([A-Za-z0-9_-]+)\]\s+.+$/);
      if (requirement) {
        requirementId = `#${this.issueNumber}-${requirement[1]}`;
        continue;
      }
      if (!requirementId) continue;

      const qa = line.match(/^\s+-\s+\[([ xX])\]\s+QA[：:]\s*(.*)$/);
      if (!qa) continue;
      if (verified.has(requirementId)) {
        throw new Error(`Duplicate QA result: ${requirementId}`);
      }
      verified.add(requirementId);
      results.push(
        new RequirementVerification(
          requirementId,
          qa[1].toLowerCase() === "x",
          qa[2].trim(),
        ),
      );
    }

    return results;
  }
}

export class AcceptanceCycleIssue {
  constructor(public readonly body: string) {}

  acceptanceResults(demandIds: string[]): DemandAcceptance[] {
    const lines = new GitHubIssue(this.body)
      .readSection("## 要求")
      .split(/\r?\n/);
    const expected = new Set(demandIds);
    const seen = new Set<string>();
    const results: DemandAcceptance[] = [];

    for (let index = 0; index < lines.length; index += 1) {
      const demand = lines[index].match(/^-\s+#(\d+)\s*$/);
      if (!demand) continue;
      const id = `#${demand[1]}`;
      const block: string[] = [];
      for (let next = index + 1; next < lines.length; next += 1) {
        if (/^-\s+#\d+\s*$/.test(lines[next])) break;
        block.push(lines[next]);
      }
      const acceptance = block
        .map((line) => line.match(/^\s+-\s+\[([ xX])\]\s+検収\s*$/))
        .filter((match): match is RegExpMatchArray => match !== null);
      if (acceptance.length === 0) continue;
      if (acceptance.length > 1 || seen.has(id)) {
        throw new Error(`Duplicate Acceptance result: ${id}`);
      }
      if (!expected.has(id))
        throw new Error(`Unexpected Acceptance result: ${id}`);
      const evaluations = block
        .map((line) => line.match(/^\s+-\s+評価[：:]\s*(.*)$/))
        .filter((match): match is RegExpMatchArray => match !== null);
      if (evaluations.length > 1) {
        throw new Error(`Duplicate Acceptance evaluation: ${id}`);
      }
      seen.add(id);
      results.push(
        new DemandAcceptance(
          id,
          acceptance[0][1].toLowerCase() === "x",
          evaluations[0]?.[1].trim() ?? "",
        ),
      );
    }

    return results;
  }

  feedback(): AcceptanceFeedback {
    const feedback = new GitHubIssue(this.body).readSection(
      "## フィードバック",
    );
    const issue = new GitHubIssue(feedback);
    return new AcceptanceFeedback(
      issue.isChecked("現Cycleの不備"),
      issue.isChecked("新規Demand"),
      issue.isChecked("既存Demandの変更"),
    );
  }
}

export class StandardCycleIssue {
  constructor(public readonly body: string) {}

  reference(heading: string): number | undefined {
    const match = new GitHubIssue(this.body)
      .readSection(heading)
      .match(/^-\s+#(\d+)\s*$/m);
    return match ? Number(match[1]) : undefined;
  }

  withReference(heading: string, issueNumber: number): string {
    return new GitHubIssue(this.body).writeSection(
      heading,
      `- #${issueNumber}`,
    );
  }
}

export class StandardCycleIssueTemplate {
  constructor(public readonly previousIssueNumber?: number) {}

  render(): string {
    return `## 前Cycle\n\n${this.previousIssueNumber ? `- #${this.previousIssueNumber}` : ""}\n\n## 次Cycle\n\n\n## 要求\n\n\n## Feature\n\n\n## Release\n\n### 対象\n\n\n### Release Notes\n\n\n### Release手順\n\n\n### 検収手順\n\n\n### Version\n\n\n- [ ] Release完了\n\n## フィードバック\n\n- [ ] 現Cycleの不備\n- [ ] 新規Demand\n- [ ] 既存Demandの変更`;
  }
}

export class EngineeringChecks {
  constructor(
    public readonly checkRuns: Array<{
      name: string;
      conclusion: string | null;
    }>,
  ) {}

  passed(pattern: RegExp): boolean {
    const matched = this.checkRuns.filter(({ name }) => pattern.test(name));
    pattern.lastIndex = 0;
    return (
      matched.length > 0 &&
      matched.every(({ conclusion }) => conclusion === "success")
    );
  }
}
