import {
  AcceptanceFeedback,
  DemandAcceptance,
  Requirement,
  RequirementVerification,
} from "@mydx-dev/spiral-standard";
import { GitHubIssue } from "@mydx-dev/spiral-github";

export const standardGitHubIssueBodies = {
  cycle: `## 前Cycle

<!-- 例: - #123。初回Cycleでは空欄。 -->

## 次Cycle

<!-- Cycle遷移時に自動設定されるため通常は空欄。 -->

## 要求

<!-- Cycleに属するDemand Issueを1行ずつ記載。例: - #123 -->

## Feature

<!-- 外部設計で定義したFeature Issueを1行ずつ記載。例: - #456 -->

## Release

### 対象

<!-- Release対象を記載。 -->

### Release Notes

<!-- Release内容を記載。 -->

### Release手順

<!-- Release手順を記載。 -->

### 検収手順

<!-- 検収手順を記載。 -->

### Version

<!-- Release versionを1行で記載。 -->

- [ ] Release完了

## フィードバック

- [ ] 現Cycleの不備
- [ ] 新規Demand
- [ ] 既存Demandの変更`,
  demand: `### 要求対象

<!-- 何を対象とする要求か。 -->

### 現在状態

<!-- 現在どうなっているか。 -->

### 期待状態

<!-- どうなってほしいか。 -->

### 発生源

<!-- 顧客、利用者、運用、障害など要求の発生源。 -->

## 要件

<!-- Requirement IDはDemand Issue内で一意にする。例:
- [R1] 利用者が予約を登録できる
  - [ ] QA: 検証結果を記載
-->`,
  feature: `## 対象要件

<!-- Demand Issue番号とRequirement IDを #123-R1 形式で1行ずつ記載。例: - #123-R1 -->

## 外部設計

<!-- 対象要件を満たす外部設計を記載。 -->

## 対象外

<!-- このFeatureで扱わない範囲を記載。 -->`,
};

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
    const body = standardGitHubIssueBodies.cycle;
    return this.previousIssueNumber
      ? new GitHubIssue(body).writeSection(
          "## 前Cycle",
          `- #${this.previousIssueNumber}`,
        )
      : body;
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
