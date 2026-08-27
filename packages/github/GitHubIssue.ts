export class GitHubIssue {
  constructor(public readonly body: string) {}

  readSection(heading: string, stopAtSeparator = false): string {
    const lines = this.body.split(/\r?\n/);
    const startIndex = lines.findIndex((line) => line.trim() === heading);

    if (startIndex === -1) {
      return "";
    }

    const headingLevel = heading.match(/^#+/)?.[0].length ?? 0;
    const content: string[] = [];

    for (const line of lines.slice(startIndex + 1)) {
      const nextHeading = line.match(/^(#+)\s+/);

      if (nextHeading && nextHeading[1].length <= headingLevel) {
        break;
      }

      if (stopAtSeparator && line.trim() === "---") {
        break;
      }

      content.push(line);
    }

    return content.join("\n").trim();
  }

  readScalarSection(heading: string): string {
    return (
      this.readSection(heading)
        .split(/\r?\n/)
        .map((line) => line.trim())
        .find((line) => line.length > 0 && !line.startsWith("- [")) ?? ""
    );
  }

  isChecked(label: string): boolean {
    const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`^-\\s+\\[[xX]\\]\\s+${escapedLabel}\\s*$`, "m").test(
      this.body,
    );
  }

  writeSection(heading: string, content: string): string {
    const lines = this.body.split(/\r?\n/);
    const startIndex = lines.findIndex((line) => line.trim() === heading);
    const normalizedContent = content.trim();

    if (startIndex === -1) {
      return [this.body.trimEnd(), heading, normalizedContent]
        .filter((part) => part.length > 0)
        .join("\n\n");
    }

    const headingLevel = heading.match(/^#+/)?.[0].length ?? 0;
    let endIndex = lines.length;

    for (let index = startIndex + 1; index < lines.length; index += 1) {
      const nextHeading = lines[index].match(/^(#+)\s+/);

      if (nextHeading && nextHeading[1].length <= headingLevel) {
        endIndex = index;
        break;
      }
    }

    const replacement = [heading, "", normalizedContent, ""].filter(
      (line, index, values) =>
        line.length > 0 ||
        (index > 0 && index < values.length - 1) ||
        normalizedContent.length > 0,
    );

    return [
      ...lines.slice(0, startIndex),
      ...replacement,
      ...lines.slice(endIndex),
    ]
      .join("\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }
}

export class GitHubIssueId {
  constructor(
    public readonly value: string,
    public readonly errorLabel = "GitHub Issue",
  ) {}

  toNumber(): number {
    const normalized = this.value.trim().replace(/^#/, "");
    const issueNumber = Number(normalized);

    if (!Number.isInteger(issueNumber) || issueNumber <= 0) {
      throw new Error(`Invalid ${this.errorLabel} ID: ${this.value}`);
    }

    return issueNumber;
  }
}
