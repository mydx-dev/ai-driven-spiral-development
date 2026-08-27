import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, resolve } from "node:path";
import { resolveComposition } from "./registry.mjs";

const readText = (path) =>
  existsSync(path) ? readFileSync(path, "utf8") : null;

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
      executionChannel: "./src/spiral/execution-channel.mjs",
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
    "src/spiral/index.mjs":
      'import config from "../../spiral.config.mjs";\nimport { execute } from "./execution-channel.mjs";\n\nexport const spiralComposition = { config, execute };\n',
    "src/spiral/execution-channel.mjs":
      'export const execute = async (message) => {\n  void message;\n  throw new Error("TODO: project固有Execution Channelを接続してください。");\n};\n',
  };

  if (composition.quality) {
    files["quality.config.mjs"] = "export default {};\n";
  }

  if (composition.github) {
    files[".github/ISSUE_TEMPLATE/spiral-artifact.md"] =
      '---\nname: Spiral Artifact\nabout: Spiral Development artifactを記録する\ntitle: ""\nlabels: ""\nassignees: ""\n---\n\n## Artifact\n\n<!-- project / process固有のArtifact情報を記載してください。 -->\n\n## Traceability\n\n- Cycle: \n- Parent Artifact: \n';
    files[".github/pull_request_template.md"] =
      "## Spiral Traceability\n\n- Cycle: \n- Artifact / Issue: \n\n## Verification\n\n- [ ] 対応するArtifactとの整合を確認した\n- [ ] 必要なQuality / CIを確認した\n";
    files[".github/workflows/spiral.yml"] =
      `name: Spiral\n\non:\n  pull_request:\n  workflow_dispatch:\n\njobs:\n  verify-composition:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      - uses: pnpm/action-setup@v4\n        with:\n          version: 10.18.0\n      - uses: actions/setup-node@v4\n        with:\n          node-version: 24\n      - run: pnpm install --no-frozen-lockfile\n      - run: node -e "import('./spiral.config.mjs')"\n${composition.quality ? "      - run: pnpm quality\n" : ""}`;
  }

  return files;
};

const mergePackageJson = (current, composition) => {
  const next = { ...current };
  const conflicts = [];
  next.dependencies = { ...(current.dependencies ?? {}) };
  next.devDependencies = { ...(current.devDependencies ?? {}) };
  next.scripts = { ...(current.scripts ?? {}) };

  for (const [name, version] of Object.entries(composition.dependencies)) {
    if (next.devDependencies[name] && !next.dependencies[name]) {
      conflicts.push(`dependency ${name} already exists in devDependencies`);
      continue;
    }
    if (!next.dependencies[name]) next.dependencies[name] = version;
  }

  for (const [name, version] of Object.entries(composition.devDependencies)) {
    if (next.dependencies[name] && !next.devDependencies[name]) continue;
    if (!next.devDependencies[name]) next.devDependencies[name] = version;
  }

  if (composition.quality) {
    if (next.scripts.quality && next.scripts.quality !== "spiral-quality") {
      conflicts.push(`script quality already exists as: ${next.scripts.quality}`);
    } else {
      next.scripts.quality = "spiral-quality";
    }
  }

  if (Object.keys(next.dependencies).length === 0) delete next.dependencies;
  if (Object.keys(next.devDependencies).length === 0) delete next.devDependencies;
  if (Object.keys(next.scripts).length === 0) delete next.scripts;

  return { next, conflicts };
};

export const planInit = ({
  cwd = globalThis.process.cwd(),
  artifact,
  process: processPreset,
  quality,
} = {}) => {
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
  const changes = [];
  const nextPackageText = `${JSON.stringify(nextPackage, null, 2)}\n`;
  if (currentPackageText !== nextPackageText) {
    changes.push({
      path: "package.json",
      content: nextPackageText,
      classification: currentPackageText === null ? "safe create" : "safe merge",
    });
  }

  for (const [path, content] of Object.entries(generatedFiles(composition))) {
    const current = readText(resolve(root, path));
    if (current === content) continue;
    if (current !== null) {
      conflicts.push(`manual decision required: ${path}`);
      continue;
    }
    changes.push({ path, content, classification: "safe create" });
  }

  return { root, composition, changes, conflicts };
};

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
