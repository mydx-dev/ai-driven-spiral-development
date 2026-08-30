import type {
  Artifact,
  ArtifactRepository,
  GatePass,
} from "@mydx-dev/ai-driven-spiral-development";
import {
  GitHubIssue,
  type GitHubClient,
} from "@mydx-dev/spiral-github";

export type StandardArtifact = Artifact & { readonly cycleId: string };

export type StandardArtifactIssueCodec<TArtifact extends StandardArtifact> = {
  readonly artifactType: string;
  title(artifact: TArtifact): string;
  restore(payload: unknown): TArtifact;
  traceability(artifact: TArtifact): string[];
};

type Issue = {
  readonly number: number;
  readonly title: string;
  readonly body: string | null;
  readonly pull_request?: unknown;
};

type SearchIssues = { readonly items: Issue[] };

const artifactMarker = (id: string) => `<!-- spiral-artifact-id: ${id} -->`;
const cycleMarker = (cycleId: string) => `<!-- spiral-cycle-id: ${cycleId} -->`;
const typeMarker = (artifactType: string) =>
  `<!-- spiral-artifact-type: ${artifactType} -->`;

export class StandardArtifactIssueRepository<
  TArtifact extends StandardArtifact,
> implements ArtifactRepository<TArtifact>
{
  constructor(
    public readonly client: GitHubClient,
    public readonly codec: StandardArtifactIssueCodec<TArtifact>,
  ) {}

  async find(id: string): Promise<TArtifact | undefined> {
    const issue = await this.findIssueByArtifactId(id);
    return issue ? this.restore(issue) : undefined;
  }

  async findByCycle(cycleId: string): Promise<TArtifact[]> {
    const response = await this.client.searchIssues<SearchIssues>(
      `\"${cycleMarker(cycleId)}\" in:body`,
    );
    const issues = response.items.filter(
      (issue) =>
        !issue.pull_request &&
        (issue.body ?? "").includes(typeMarker(this.codec.artifactType)) &&
        (issue.body ?? "").includes(cycleMarker(cycleId)),
    );

    return issues.map((issue) => this.restore(issue));
  }

  async save(artifact: TArtifact): Promise<void> {
    const current = await this.findIssueByArtifactId(artifact.id);
    const body = await this.render(artifact, current?.body ?? undefined);
    const input = { title: this.codec.title(artifact), body };

    if (current) {
      await this.client.updateIssue(current.number, input);
      return;
    }

    await this.client.createIssue(input);
  }

  async saveGateResult(artifactId: string, gateResult: GatePass): Promise<void> {
    const issue = await this.findIssueByArtifactId(artifactId);
    if (!issue) {
      throw new Error(`Standard Artifact Issue not found: ${artifactId}`);
    }

    const body = new GitHubIssue(issue.body ?? "").writeSection(
      "## Gate Result",
      gateResult.passed
        ? "- [x] PASS"
        : ["- [ ] FAIL", ...gateResult.errors.map((error) => `  - ${error}`)].join(
            "\n",
          ),
    );
    await this.client.updateIssue(issue.number, { body });
  }

  async findIssueByArtifactId(id: string): Promise<Issue | undefined> {
    const response = await this.client.searchIssues<SearchIssues>(
      `\"${artifactMarker(id)}\" in:body`,
    );
    const issues = response.items.filter(
      (issue) =>
        !issue.pull_request &&
        (issue.body ?? "").includes(artifactMarker(id)) &&
        (issue.body ?? "").includes(typeMarker(this.codec.artifactType)),
    );

    if (issues.length > 1) {
      throw new Error(`Artifact ${id} is mapped to multiple GitHub Issues.`);
    }

    return issues[0];
  }

  restore(issue: Issue): TArtifact {
    const body = issue.body ?? "";
    const json = new GitHubIssue(body).readSection("## Artifact Data", true);
    const match = json.match(/```json\s*\n([\s\S]*?)\n```/);
    if (!match) {
      throw new Error(`Artifact Data is missing from Issue #${issue.number}.`);
    }

    const artifact = this.codec.restore(JSON.parse(match[1]));
    if (!body.includes(artifactMarker(artifact.id))) {
      throw new Error(`Artifact ID marker does not match Issue #${issue.number}.`);
    }
    if (!body.includes(cycleMarker(artifact.cycleId))) {
      throw new Error(`Cycle ID marker does not match Issue #${issue.number}.`);
    }

    return artifact;
  }

  async render(artifact: TArtifact, currentBody?: string): Promise<string> {
    const traceability = [...new Set(this.codec.traceability(artifact))];
    const links = await Promise.all(
      traceability.map(async (targetId) => {
        const target = await this.findAnyArtifactIssue(targetId);
        return target
          ? `- #${target.number} — \`${targetId}\``
          : `- \`${targetId}\``;
      }),
    );
    const gateResult = currentBody
      ? new GitHubIssue(currentBody).readSection("## Gate Result", true)
      : "- [ ] Not evaluated";

    return [
      artifactMarker(artifact.id),
      cycleMarker(artifact.cycleId),
      typeMarker(this.codec.artifactType),
      "",
      "## Artifact",
      "",
      `- Type: \`${this.codec.artifactType}\``,
      `- Artifact ID: \`${artifact.id}\``,
      `- Cycle ID: \`${artifact.cycleId}\``,
      "",
      "## Traceability",
      "",
      links.length > 0 ? links.join("\n") : "- None",
      "",
      "## Artifact Data",
      "",
      "```json",
      JSON.stringify(artifact, null, 2),
      "```",
      "",
      "## Gate Result",
      "",
      gateResult || "- [ ] Not evaluated",
      "",
    ].join("\n");
  }

  async findAnyArtifactIssue(id: string): Promise<Issue | undefined> {
    const response = await this.client.searchIssues<SearchIssues>(
      `\"${artifactMarker(id)}\" in:body`,
    );
    const issues = response.items.filter(
      (issue) => !issue.pull_request && (issue.body ?? "").includes(artifactMarker(id)),
    );
    if (issues.length > 1) {
      throw new Error(`Artifact ${id} is mapped to multiple GitHub Issues.`);
    }
    return issues[0];
  }
}
