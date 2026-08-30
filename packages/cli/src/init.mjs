import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { resolveComposition } from "./registry.mjs";
import {
  generatedFileEquivalent,
  jsonEquivalent,
} from "./semantic-equality.mjs";

/**
 * @typedef {object} InitOptions
 * @property {string} [cwd]
 * @property {string} [artifact]
 * @property {string} [process]
 * @property {boolean} [quality]
 */

const readText = (path) =>
  existsSync(path) ? readFileSync(path, "utf8") : null;

const standardMain = `import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { createGitHubClient } from "@mydx-dev/spiral-github";
import { createStandardGitHubRuntime } from "@mydx-dev/spiral-standard-github";
import config from "../../spiral.config.mjs";
import { execute } from "./execution-channel.mjs";

const requiredEnvironmentVariable = (name) => {
  const value = process.env[name];
  if (!value) throw new Error(\`Missing required environment variable: \${name}\`);
  return value;
};

export const circulate = async ({
  cycleId = requiredEnvironmentVariable("SPIRAL_CYCLE_ID"),
  name = requiredEnvironmentVariable("SPIRAL_PROCESS_NAME"),
  eventId = requiredEnvironmentVariable("SPIRAL_EVENT_ID"),
} = {}) => {
  const repository = requiredEnvironmentVariable(
    config.github.repositoryEnvironmentVariable,
  );
  const [owner, repo, ...rest] = repository.split("/");
  if (!owner || !repo || rest.length > 0) {
    throw new Error(\`Invalid GitHub repository: \${repository}\`);
  }

  const runtime = createStandardGitHubRuntime({
    client: createGitHubClient({
      owner,
      repo,
      token: process.env[config.github.tokenEnvironmentVariable],
    }),
    channel: { send: execute },
  });

  await runtime.circulate({ cycleId, name, eventId });
};

const entrypoint = process.argv[1]
  ? resolve(process.argv[1]) === fileURLToPath(import.meta.url)
  : false;
if (entrypoint) await circulate();
`;

const genericMain =
  'import config from "../../spiral.config.mjs";\nimport { execute } from "./execution-channel.mjs";\n\nexport const spiralComposition = { config, execute };\n';

const circulateWorkflow = `name: Spiral Circulate

on:
  workflow_dispatch:
    inputs:
      cycle_id:
        description: Cycle Issue number or id (for example #123)
        required: true
        type: string
      process_name:
        description: Semantic Completion target
        required: true
        type: choice
        options:
          - 要求定義
          - システム要件定義
          - ソフトウェア要件定義
          - 実装
          - 統合
          - QA
          - 検収
          - フィードバック

concurrency:
  group: spiral-semantic-completion-\${{ github.repository }}-\${{ github.run_id }}
  cancel-in-progress: false

permissions:
  contents: read
  issues: write
  pull-requests: read
  checks: read
  actions: read

jobs:
  circulate:
    runs-on: ubuntu-latest
    env:
      SPIRAL_EVENT_ID: \${{ github.repository }}:\${{ github.run_id }}
      SPIRAL_CYCLE_ID: \${{ inputs.cycle_id }}
      SPIRAL_PROCESS_NAME: \${{ inputs.process_name }}
      GITHUB_TOKEN: \${{ secrets.GITHUB_TOKEN }}
      GITHUB_REPOSITORY: \${{ github.repository }}
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 10.18.0
      - uses: actions/setup-node@v4
        with:
          node-version: 24
      - run: pnpm install --no-frozen-lockfile
      - run: node scripts/spiral/main.mjs
`;

const generatedFiles = (composition) => {
  const config = `export default ${JSON.stringify(
    {
      artifact: composition.artifact,
      process: composition.process,
      binding: composition.binding,
      requiresProjectBinding: composition.requiresProjectBinding,
      packages: {
        dependencies: Object.keys(composition.dependencies),
        devDependencies: Object.keys(composition.devDependencies),
      },
      executionChannel: "./scripts/spiral/execution-channel.mjs",
      ...(composition.github
        ? {
            github: {
              tokenEnvironmentVariable: "GITHUB_TOKEN",
              repositoryEnvironmentVariable: "GITHUB_REPOSITORY",
            },
          }
        : {}),
    },
    null,
    2,
  )};\n`;

  /** @type {Record<string, string>} */
  const files = {
    "spiral.config.mjs": config,
    "scripts/spiral/main.mjs":
      composition.binding === "@mydx-dev/spiral-standard-github"
        ? standardMain
        : genericMain,
    "scripts/spiral/execution-channel.mjs":
      'export const execute = async (message) => {\n  void message;\n  throw new Error("TODO: project固有Execution Channelを接続してください。");\n};\n',
  };

  if (composition.quality) {
    files["quality.config.mjs"] = "export default {};\n";
  }

  if (composition.github) {
    files[".github/ISSUE_TEMPLATE/spiral-artifact.md"] =
      '---\nname: Spiral Artifact\nabout: Spiral Development artifactを記録する\ntitle: ""\nlabels: ""\nassignees: ""\n---\n\n## Artifact\n\n<!-- 8工程の対象Artifact情報を記載してください。GitHub固有mappingは @mydx-dev/spiral-standard-github の定義に従います。 -->\n\n## Traceability\n\n- Cycle: \n- Process: \n- Parent Artifact: \n';
    if (composition.binding === "@mydx-dev/spiral-standard-github") {
      files[".github/workflows/spiral-circulate.yml"] = circulateWorkflow;
    }
    files[".github/pull_request_template.md"] =
      "## Spiral Traceability\n\n- Cycle: \n- Artifact / Issue: \n\n## Verification\n\n- [ ] 対応するArtifactとの整合を確認した\n- [ ] 必要なQuality / CIを確認した\n";
    files[".github/workflows/spiral.yml"] =
      `name: Spiral Verify\n\non:\n  pull_request:\n  workflow_dispatch:\n\njobs:\n  verify-composition:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      - uses: pnpm/action-setup@v4\n        with:\n          version: 10.18.0\n      - uses: actions/setup-node@v4\n        with:\n          node-version: 24\n      - run: pnpm install --no-frozen-lockfile\n      - run: node -e "import('./spiral.config.mjs')"\n${composition.quality ? "      - run: pnpm quality\n" : ""}`;
  }

  return files;
};

const addDependency = ({
  next,
  conflicts,
  section,
  otherSection,
  name,
  version,
}) => {
  if (next[otherSection][name] !== undefined) {
    conflicts.push(
      `manual decision required: ${name} already exists in ${otherSection} as ${next[otherSection][name]}`,
    );
    return;
  }

  const existingVersion = next[section][name];
  if (existingVersion !== undefined && existingVersion !== version) {
    conflicts.push(
      `manual decision required: ${name} requires ${version} but ${section} has ${existingVersion}`,
    );
    return;
  }

  if (existingVersion === undefined) next[section][name] = version;
};

const mergePackageJson = (current, composition) => {
  const next = { ...current };
  const conflicts = [];
  next.dependencies = { ...(current.dependencies ?? {}) };
  next.devDependencies = { ...(current.devDependencies ?? {}) };
  next.scripts = { ...(current.scripts ?? {}) };

  for (const [name, version] of Object.entries(composition.dependencies)) {
    addDependency({
      next,
      conflicts,
      section: "dependencies",
      otherSection: "devDependencies",
      name,
      version,
    });
  }

  for (const [name, version] of Object.entries(composition.devDependencies)) {
    addDependency({
      next,
      conflicts,
      section: "devDependencies",
      otherSection: "dependencies",
      name,
      version,
    });
  }

  if (composition.quality) {
    if (next.scripts.quality && next.scripts.quality !== "spiral-quality") {
      conflicts.push(
        `script quality already exists as: ${next.scripts.quality}`,
      );
    } else {
      next.scripts.quality = "spiral-quality";
    }
  }

  if (Object.keys(next.dependencies).length === 0) delete next.dependencies;
  if (Object.keys(next.devDependencies).length === 0)
    delete next.devDependencies;
  if (Object.keys(next.scripts).length === 0) delete next.scripts;

  return { next, conflicts };
};

/** @param {InitOptions} [options] */
export const planInit = (options = {}) => {
  const {
    cwd = process.cwd(),
    artifact,
    process: processPreset,
    quality,
  } = options;
  const root = resolve(cwd);
  const composition = resolveComposition({
    artifact,
    process: processPreset,
    quality,
  });
  const packagePath = resolve(root, "package.json");
  let currentPackage = {};
  const currentPackageText = readText(packagePath);
  if (currentPackageText !== null) {
    try {
      currentPackage = JSON.parse(currentPackageText);
    } catch (error) {
      return {
        root,
        composition,
        changes: [],
        conflicts: [
          `unsupported conflict: invalid package.json (${error instanceof Error ? error.message : String(error)})`,
        ],
      };
    }
  }

  const { next: nextPackage, conflicts } = mergePackageJson(
    currentPackage,
    composition,
  );
  const legacyFiles = [
    "src/spiral/index.mjs",
    "src/spiral/execution-channel.mjs",
  ].filter((path) => existsSync(resolve(root, path)));
  if (legacyFiles.length > 0) {
    conflicts.push(
      `manual decision required: legacy Spiral files detected under src/spiral/** (${legacyFiles.join(", ")}); move or remove them explicitly before re-running init`,
    );
  }

  const changes = [];
  const nextPackageText = `${JSON.stringify(nextPackage, null, 2)}\n`;
  if (
    currentPackageText === null ||
    !jsonEquivalent(currentPackage, nextPackage)
  ) {
    changes.push({
      path: "package.json",
      content: nextPackageText,
      classification:
        currentPackageText === null ? "safe create" : "safe merge",
    });
  }

  for (const [path, content] of Object.entries(generatedFiles(composition))) {
    const current = readText(resolve(root, path));
    if (
      current !== null &&
      generatedFileEquivalent({ path, current, expected: content })
    ) {
      continue;
    }
    if (current !== null) {
      conflicts.push(`manual decision required: ${path}`);
      continue;
    }
    changes.push({ path, content, classification: "safe create" });
  }

  return { root, composition, changes, conflicts };
};

/** @param {InitOptions} [options] */
export const initRepository = (options = {}) => {
  const plan = planInit(options);
  if (plan.conflicts.length > 0) {
    throw new Error(
      `Portable Distribution init aborted:\n${plan.conflicts.join("\n")}`,
    );
  }

  for (const change of plan.changes) {
    const path = resolve(plan.root, change.path);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, change.content);
  }

  return {
    composition: plan.composition,
    changes: plan.changes,
    alreadySatisfied: plan.changes.length === 0,
  };
};
