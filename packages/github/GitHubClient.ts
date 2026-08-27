export type GitHubConnection = {
  owner: string;
  repo: string;
  token?: string;
  apiBaseUrl?: string;
  graphqlBaseUrl?: string;
  fetch?: typeof globalThis.fetch;
};

export class GitHubApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly responseBody: string,
  ) {
    super(`GitHub API request failed with status ${status}`);
  }
}

export class GitHubClient {
  public readonly owner: string;
  public readonly repo: string;
  public readonly token?: string;
  public readonly apiBaseUrl: string;
  public readonly graphqlBaseUrl: string;
  public readonly fetcher: typeof globalThis.fetch;

  constructor(connection: GitHubConnection) {
    this.owner = connection.owner;
    this.repo = connection.repo;
    this.token = connection.token;
    this.apiBaseUrl = connection.apiBaseUrl ?? "https://api.github.com";
    this.graphqlBaseUrl =
      connection.graphqlBaseUrl ?? this.resolveGraphqlBaseUrl(this.apiBaseUrl);
    this.fetcher = connection.fetch ?? globalThis.fetch;
  }

  async request<T>(
    method: string,
    path: string,
    body?: unknown,
    query?: Record<string, string>,
  ): Promise<T> {
    const baseUrl = `${this.apiBaseUrl.replace(/\/+$/, "")}/`;
    const relativePath = path.replace(/^\/+/, "");
    const url = new URL(relativePath, baseUrl);

    for (const [key, value] of Object.entries(query ?? {})) {
      url.searchParams.set(key, value);
    }

    const response = await this.fetcher(url, {
      method,
      headers: {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    if (!response.ok) {
      throw new GitHubApiError(response.status, await response.text());
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return (await response.json()) as T;
  }

  async graphql<T>(
    query: string,
    variables: Record<string, unknown>,
  ): Promise<T> {
    const response = await this.fetcher(this.graphqlBaseUrl, {
      method: "POST",
      headers: {
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
        ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
      },
      body: JSON.stringify({ query, variables }),
    });

    if (!response.ok) {
      throw new GitHubApiError(response.status, await response.text());
    }

    const payload = (await response.json()) as {
      data?: T;
      errors?: Array<{ message: string }>;
    };

    if (payload.errors?.length) {
      throw new Error(payload.errors.map(({ message }) => message).join("; "));
    }

    if (!payload.data) {
      throw new Error("GitHub GraphQL response did not contain data.");
    }

    return payload.data;
  }

  repositoryPath(path: string): string {
    return `repos/${encodeURIComponent(this.owner)}/${encodeURIComponent(this.repo)}${path}`;
  }

  getIssue<T = unknown>(issueNumber: number): Promise<T> {
    return this.request<T>(
      "GET",
      this.repositoryPath(`/issues/${issueNumber}`),
    );
  }

  createIssue<T = unknown>(input: {
    title: string;
    body?: string;
  }): Promise<T> {
    return this.request<T>("POST", this.repositoryPath("/issues"), input);
  }

  updateIssue<T = unknown>(
    issueNumber: number,
    input: { title?: string; body?: string; state?: "open" | "closed" },
  ): Promise<T> {
    return this.request<T>(
      "PATCH",
      this.repositoryPath(`/issues/${issueNumber}`),
      input,
    );
  }

  searchIssues<T = unknown>(query: string): Promise<T> {
    return this.request<T>("GET", "search/issues", undefined, {
      q: `repo:${this.owner}/${this.repo} ${query}`,
    });
  }

  getPullRequest<T = unknown>(pullRequestNumber: number): Promise<T> {
    return this.request<T>(
      "GET",
      this.repositoryPath(`/pulls/${pullRequestNumber}`),
    );
  }

  searchPullRequests<T = unknown>(query: string): Promise<T> {
    return this.searchIssues<T>(`is:pr ${query}`);
  }

  listCheckRuns<T = unknown>(ref: string): Promise<T> {
    return this.request<T>(
      "GET",
      this.repositoryPath(`/commits/${encodeURIComponent(ref)}/check-runs`),
    );
  }

  listWorkflowRuns<T = unknown>(branch?: string): Promise<T> {
    return this.request<T>(
      "GET",
      this.repositoryPath("/actions/runs"),
      undefined,
      branch ? { branch } : undefined,
    );
  }

  listPullRequestReviews<T = unknown>(pullRequestNumber: number): Promise<T> {
    return this.request<T>(
      "GET",
      this.repositoryPath(`/pulls/${pullRequestNumber}/reviews`),
    );
  }

  listPullRequestReviewComments<T = unknown>(
    pullRequestNumber: number,
  ): Promise<T> {
    return this.request<T>(
      "GET",
      this.repositoryPath(`/pulls/${pullRequestNumber}/comments`),
    );
  }

  listPullRequestReviewThreads<T = unknown>(
    pullRequestNumber: number,
  ): Promise<T> {
    return this.graphql<T>(
      `query ReviewThreads($owner: String!, $repo: String!, $number: Int!) {
        repository(owner: $owner, name: $repo) {
          pullRequest(number: $number) {
            reviewThreads(first: 100) {
              nodes { isResolved }
            }
          }
        }
      }`,
      {
        owner: this.owner,
        repo: this.repo,
        number: pullRequestNumber,
      },
    );
  }

  resolveGraphqlBaseUrl(apiBaseUrl: string): string {
    const url = new URL(apiBaseUrl);

    if (url.hostname === "api.github.com") {
      return "https://api.github.com/graphql";
    }

    const pathname = url.pathname.replace(/\/+$/, "");
    url.pathname = pathname.endsWith("/api/v3")
      ? `${pathname.slice(0, -3)}graphql`
      : `${pathname}/graphql`;
    url.search = "";
    url.hash = "";

    return url.toString();
  }
}

export const createGitHubClient = (connection: GitHubConnection) =>
  new GitHubClient(connection);
