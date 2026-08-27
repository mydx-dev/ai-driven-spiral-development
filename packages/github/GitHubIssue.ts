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
    const newline = this.body.includes("\r\n") ? "\r\n" : "\n";
    const lines = Array.from(
      this.body.matchAll(/[^\r\n]*(?:\r\n|\n|$)/g),
    ).filter((match) => match[0].length > 0);
    const startLineIndex = lines.findIndex(
      (match) => match[0].replace(/\r?\n$/, "").trim() === heading,
    );
    const normalizedContent = content.trim();

    if (startLineIndex === -1) {
      const separator =
        this.body.length === 0 || this.body.endsWith(newline)
          ? newline
          : `${newline}${newline}`;
      return `${this.body}${separator}${heading}${newline}${newline}${normalizedContent}`;
    }

    const headingLevel = heading.match(/^#+/)?.[0].length ?? 0;
    const headingLine = lines[startLineIndex];
    const headingStart = headingLine.index ?? 0;
    let sectionEnd = this.body.length;

    for (const line of lines.slice(startLineIndex + 1)) {
      const lineText = line[0].replace(/\r?\n$/, "");
      const nextHeading = lineText.match(/^(#+)\s+/);

      if (nextHeading && nextHeading[1].length <= headingLevel) {
        sectionEnd = line.index ?? this.body.length;
        break;
      }
    }

    const replacement = `${heading}${newline}${newline}${normalizedContent}${newline}${newline}`;

    return `${this.body.slice(0, headingStart)}${replacement}${this.body.slice(sectionEnd)}`;
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
