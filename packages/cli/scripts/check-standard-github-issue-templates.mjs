import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const canonical = readFileSync(
  fileURLToPath(new URL("../../standard-github/src/IssueTemplates.mjs", import.meta.url)),
  "utf8",
);
const generated = readFileSync(
  fileURLToPath(
    new URL("../src/generated/standard-github-issue-templates.mjs", import.meta.url),
  ),
  "utf8",
);
const expected = `// Generated from packages/standard-github/src/IssueTemplates.mjs. Do not edit directly.\n${canonical}`;

if (generated !== expected) {
  throw new Error(
    "CLI Standard GitHub Issue Templates are out of sync with the Binding schema.",
  );
}
