import { readdir, readFile } from "node:fs/promises";
import { extname, join, relative } from "node:path";
import process from "node:process";

const root = process.cwd();
const ignoredDirectories = new Set([
  ".git",
  "node_modules",
  "dist",
  "coverage",
  ".turbo",
]);
const textExtensions = new Set([
  ".js",
  ".mjs",
  ".cjs",
  ".ts",
  ".tsx",
  ".json",
  ".yml",
  ".yaml",
  ".md",
]);

const files = [];
const collect = async (directory) => {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      await collect(path);
    } else if (textExtensions.has(extname(entry.name))) {
      files.push(path);
    }
  }
};
await collect(root);

const failures = [];
const secretPatterns = [
  ["private key", /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
  ["GitHub token", /\bgh[pousr]_[A-Za-z0-9]{30,}\b/],
  ["GitHub fine-grained token", /\bgithub_pat_[A-Za-z0-9_]{40,}\b/],
  ["npm token", /\bnpm_[A-Za-z0-9]{30,}\b/],
  ["AWS access key", /\bAKIA[0-9A-Z]{16}\b/],
  ["Slack token", /\bxox[baprs]-[A-Za-z0-9-]{20,}\b/],
];
const dangerousSourcePatterns = [
  ["eval", /\beval\s*\(/],
  ["Function constructor", /\bnew\s+Function\s*\(/],
  ["download-and-execute shell", /\b(?:curl|wget)\b[^\n|]*\|\s*(?:sh|bash)\b/],
];

for (const file of files) {
  const path = relative(root, file);
  const content = await readFile(file, "utf8");
  for (const [name, pattern] of secretPatterns) {
    if (pattern.test(content)) failures.push(`${path}: possible ${name}`);
  }

  if (
    (path.startsWith("packages/") || path.startsWith("scripts/")) &&
    !/\.spec\.[cm]?[jt]sx?$/.test(path)
  ) {
    for (const [name, pattern] of dangerousSourcePatterns) {
      if (pattern.test(content)) failures.push(`${path}: dangerous ${name}`);
    }
  }
}

const workflowDirectory = join(root, ".github", "workflows");
for (const entry of await readdir(workflowDirectory, { withFileTypes: true })) {
  if (!entry.isFile() || !/\.ya?ml$/.test(entry.name)) continue;
  const path = join(workflowDirectory, entry.name);
  const content = await readFile(path, "utf8");
  for (const match of content.matchAll(/^\s*uses:\s*([^\s#]+).*$/gm)) {
    const reference = match[1];
    if (reference.startsWith("./")) continue;
    if (!/@[0-9a-f]{40}$/.test(reference)) {
      failures.push(
        `.github/workflows/${entry.name}: Action is not pinned to a 40-character commit SHA: ${reference}`,
      );
    }
  }
}

const packageManifests = [
  "package.json",
  "packages/github/package.json",
  "packages/standard/package.json",
  "packages/standard-github/package.json",
  "packages/quality/package.json",
  "packages/cli/package.json",
];
const lifecycleScripts = new Set([
  "preinstall",
  "install",
  "postinstall",
  "prepare",
  "prepublish",
  "prepublishOnly",
]);
for (const manifestPath of packageManifests) {
  const manifest = JSON.parse(await readFile(join(root, manifestPath), "utf8"));
  for (const scriptName of Object.keys(manifest.scripts ?? {})) {
    if (lifecycleScripts.has(scriptName)) {
      failures.push(
        `${manifestPath}: lifecycle script ${scriptName} is not allowed`,
      );
    }
  }
  if (!Array.isArray(manifest.files) || manifest.files.length === 0) {
    failures.push(
      `${manifestPath}: public package must declare an explicit files allowlist`,
    );
  }
}

if (failures.length > 0) {
  process.stderr.write(
    "Security Gate failed:\n" +
      failures.map((item) => `- ${item}`).join("\n") +
      "\n",
  );
  process.exit(1);
}

process.stdout.write(
  `Security Gate passed: scanned ${files.length} text files, pinned Actions, lifecycle scripts, and publish allowlists.\n`,
);
