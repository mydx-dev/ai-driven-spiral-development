import { describe, expect, it, vi } from "vitest";
import {
  createGitHubClient,
  GitHubApiError,
  type GitHubConnection,
} from "./GitHubClient.js";

const createConnection = (
  fetcher: typeof globalThis.fetch,
): GitHubConnection => ({
  owner: "mydx-dev",
  repo: "example",
  token: "token",
  fetch: fetcher,
});

describe("GitHubClient", () => {
  it("injects repository connection information into issue requests", async () => {
    const fetcher = vi.fn(
      async () => new Response(JSON.stringify({ number: 12 }), { status: 200 }),
    ) as unknown as typeof globalThis.fetch;
    const client = createGitHubClient(createConnection(fetcher));

    await client.getIssue(12);

    expect(fetcher).toHaveBeenCalledOnce();
    const [url, init] = vi.mocked(fetcher).mock.calls[0];
    expect(String(url)).toBe(
      "https://api.github.com/repos/mydx-dev/example/issues/12",
    );
    expect(init?.headers).toMatchObject({
      Authorization: "Bearer token",
    });
  });

  it("provides generic PR, check, review and workflow resource access", async () => {
    const fetcher = vi.fn(
      async () => new Response(JSON.stringify({ ok: true }), { status: 200 }),
    ) as unknown as typeof globalThis.fetch;
    const client = createGitHubClient(createConnection(fetcher));

    await client.getPullRequest(3);
    await client.listCheckRuns("main");
    await client.listPullRequestReviews(3);
    await client.listPullRequestReviewComments(3);
    await client.listWorkflowRuns("main");

    expect(fetcher).toHaveBeenCalledTimes(5);
    expect(fetcher.mock.calls.map(([url]) => String(url))).toEqual([
      "https://api.github.com/repos/mydx-dev/example/pulls/3",
      "https://api.github.com/repos/mydx-dev/example/commits/main/check-runs",
      "https://api.github.com/repos/mydx-dev/example/pulls/3/reviews",
      "https://api.github.com/repos/mydx-dev/example/pulls/3/comments",
      "https://api.github.com/repos/mydx-dev/example/actions/runs?branch=main",
    ]);
  });

  it("scopes issue and pull request searches to the configured repository", async () => {
    const fetcher = vi.fn(
      async () => new Response(JSON.stringify({ items: [] }), { status: 200 }),
    ) as unknown as typeof globalThis.fetch;
    const client = createGitHubClient(createConnection(fetcher));

    await client.searchIssues("label:bug");
    await client.searchPullRequests("is:open");

    expect(fetcher.mock.calls.map(([url]) => String(url))).toEqual([
      "https://api.github.com/search/issues?q=repo%3Amydx-dev%2Fexample+label%3Abug",
      "https://api.github.com/search/issues?q=repo%3Amydx-dev%2Fexample+is%3Apr+is%3Aopen",
    ]);
  });

  it("wraps GitHub API failures in a stable error", async () => {
    const fetcher = vi.fn(
      async () => new Response("not found", { status: 404 }),
    ) as unknown as typeof globalThis.fetch;
    const client = createGitHubClient(createConnection(fetcher));

    await expect(client.getIssue(404)).rejects.toEqual(
      new GitHubApiError(404, "not found"),
    );
  });

  it("creates and updates issues through process-independent primitives", async () => {
    const fetcher = vi.fn(
      async () => new Response(JSON.stringify({ number: 1 }), { status: 200 }),
    ) as unknown as typeof globalThis.fetch;
    const client = createGitHubClient(createConnection(fetcher));

    await client.createIssue({ title: "Title", body: "Body" });
    await client.updateIssue(1, { body: "Updated" });

    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(fetcher.mock.calls[0][1]?.method).toBe("POST");
    expect(fetcher.mock.calls[1][1]?.method).toBe("PATCH");
  });
});
