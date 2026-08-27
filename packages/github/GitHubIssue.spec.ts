import { describe, expect, it } from "vitest";
import { GitHubIssue, GitHubIssueId } from "./GitHubIssue.js";

describe("GitHubIssue", () => {
  it("reads a markdown section without knowing process semantics", () => {
    const issue = new GitHubIssue("## A\nvalue\n\n## B\nother");

    expect(issue.readSection("## A")).toBe("value");
  });

  it("writes a markdown section without changing the next section", () => {
    const issue = new GitHubIssue("## A\nold\n\n## B\nother");

    expect(issue.writeSection("## A", "new")).toBe(
      "## A\n\nnew\n\n## B\nother",
    );
  });

  it("appends a missing section", () => {
    const issue = new GitHubIssue("## A\nvalue");

    expect(issue.writeSection("## B", "other")).toBe(
      "## A\nvalue\n\n## B\n\nother",
    );
  });

  it("reads checked markdown items", () => {
    const issue = new GitHubIssue("- [x] Done\n- [ ] Pending");

    expect(issue.isChecked("Done")).toBe(true);
    expect(issue.isChecked("Pending")).toBe(false);
  });
});

describe("GitHubIssueId", () => {
  it("parses issue numbers with or without a hash", () => {
    expect(new GitHubIssueId("#12").toNumber()).toBe(12);
    expect(new GitHubIssueId("12").toNumber()).toBe(12);
  });

  it("rejects invalid issue identifiers", () => {
    expect(() => new GitHubIssueId("abc").toNumber()).toThrow(
      "Invalid GitHub Issue ID: abc",
    );
  });
});
