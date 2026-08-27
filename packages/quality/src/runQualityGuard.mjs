import { spawnSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { ESLint } from "eslint";
import { loadQualityConfig } from "./config.mjs";
import { createEslintConfig } from "./eslint.mjs";
import { runMetrics } from "./metrics.mjs";

export class QualityViolationError extends Error {
  constructor(violations) {
    super("Quality Guard found violations.");
    this.violations = violations;
  }
}

export class QualityToolError extends Error {
  constructor(sensor, cause) {
    super(`Quality Guard sensor failed unexpectedly: ${sensor}`);
    this.sensor = sensor;
    this.cause = cause;
  }
}

const packageRoot = (packageName) => {
  let directory = dirname(fileURLToPath(import.meta.url));
  while (directory !== dirname(directory)) {
    const packageJsonPath = join(
      directory,
      "node_modules",
      packageName,
      "package.json",
    );
    try {
      const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));
      if (packageJson.name === packageName) {
        return { directory: dirname(packageJsonPath), packageJson };
      }
    } catch {
      // Continue walking upward until the dependency package.json is found.
    }
    directory = dirname(directory);
  }
  throw new Error(`Unable to locate package root: ${packageName}`);
};

const packageBin = (packageName, binName) => {
  const { directory, packageJson } = packageRoot(packageName);
  const bin =
    typeof packageJson.bin === "string"
      ? packageJson.bin
      : packageJson.bin?.[binName];
  if (!bin) {
    throw new Error(
      `Unable to resolve executable ${binName} from ${packageName}`,
    );
  }
  return resolve(directory, bin);
};

const toolFailureOutput = (output) =>
  /(?:syntaxerror|typeerror|referenceerror|enoent|cannot find|failed to load|configuration error|invalid configuration|could not resolve)/i.test(
    output,
  );

const runExecutable = (sensor, packageName, binName, args, cwd) => {
  try {
    const executable = packageBin(packageName, binName);
    const result = spawnSync(executable, args, {
      cwd,
      encoding: "utf8",
      env: process.env,
      shell: process.platform === "win32",
    });
    if (result.error) throw result.error;
    const output = `${result.stdout ?? ""}${result.stderr ?? ""}`.trim();
    if ((result.status ?? 2) > 1 || toolFailureOutput(output)) {
      throw new Error(
        output || `${binName} exited with status ${result.status}`,
      );
    }
    return {
      sensor,
      passed: result.status === 0,
      status: result.status ?? 2,
      output,
    };
  } catch (error) {
    throw new QualityToolError(sensor, error);
  }
};

const runEslint = async (quality, cwd, root) => {
  try {
    const eslint = new ESLint({
      cwd,
      overrideConfigFile: true,
      overrideConfig: /** @type {any} */ (createEslintConfig(quality)),
    });
    const results = await eslint.lintFiles([root]);
    const formatter = await eslint.loadFormatter("stylish");
    const output = await formatter.format(results);
    const errorCount = results.reduce(
      (sum, result) => sum + result.errorCount,
      0,
    );
    return {
      sensor: "eslint",
      passed: errorCount === 0,
      status: errorCount === 0 ? 0 : 1,
      output: output.trim(),
    };
  } catch (error) {
    throw new QualityToolError("eslint", error);
  }
};

const runArchitecture = (quality, cwd, root) => {
  try {
    const directory = mkdtempSync(join(tmpdir(), "spiral-quality-"));
    const configPath = join(directory, "dependency-cruiser.mjs");
    const forbidden = [
      {
        name: "no-circular",
        comment: "Circular dependencies make change impact harder to analyse.",
        severity: "error",
        from: {},
        to: { circular: true },
      },
      ...(quality.architecture.forbiddenLayers ?? []).map((rule) => ({
        name: rule.name,
        comment: rule.comment ?? "Forbidden layer dependency",
        severity: "error",
        from: { path: rule.from },
        to: { path: rule.to },
      })),
    ];
    writeFileSync(
      configPath,
      `export default ${JSON.stringify({
        forbidden,
        options: {
          doNotFollow: { path: "node_modules" },
          exclude: { path: "\\.spec\\.ts$" },
          tsConfig: { fileName: "tsconfig.json" },
        },
      })};\n`,
    );
    try {
      return runExecutable(
        "architecture",
        "dependency-cruiser",
        "dependency-cruise",
        ["--config", configPath, "--", root],
        cwd,
      );
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  } catch (error) {
    if (error instanceof QualityToolError) throw error;
    throw new QualityToolError("architecture", error);
  }
};

const runUnused = (cwd) =>
  runExecutable(
    "unused",
    "knip",
    "knip",
    [
      "--include",
      "files,exports,types,enumMembers,namespaceMembers,duplicates",
    ],
    cwd,
  );

const runDuplication = (quality, cwd, root) =>
  runExecutable(
    "duplication",
    "jscpd",
    "jscpd",
    [
      root,
      "--format",
      "typescript",
      "--threshold",
      String(quality.duplication.percent),
      "--min-lines",
      String(quality.duplication.minLines),
      "--min-tokens",
      String(quality.duplication.minTokens),
      "--ignore",
      "**/*.spec.ts,**/*.test.ts",
      "--reporters",
      "console",
    ],
    cwd,
  );

const executeQualityGuard = async (options) => {
  const cwd = resolve(options.cwd ?? process.cwd());
  let quality;
  try {
    quality = options.quality ?? (await loadQualityConfig(options.configPath));
  } catch (error) {
    throw new QualityToolError("config", error);
  }
  const root = options.root ?? quality.paths.source;
  const results = [];

  results.push(await runEslint(quality, cwd, root));

  let metricFindings;
  try {
    metricFindings = runMetrics(quality, { cwd, root });
  } catch (error) {
    throw new QualityToolError("responsibility-metrics", error);
  }
  results.push({
    sensor: "responsibility-metrics",
    passed: !metricFindings.some((finding) => finding.fatal),
    status: metricFindings.some((finding) => finding.fatal) ? 1 : 0,
    output: metricFindings
      .map(
        (finding) =>
          `[${finding.fatal ? "ERROR" : "INFO"}] ${finding.kind}: ${finding.symbol} (${finding.detail}) - ${finding.file}`,
      )
      .join("\n"),
  });

  results.push(runArchitecture(quality, cwd, root));
  results.push(runUnused(cwd));
  results.push(runDuplication(quality, cwd, root));

  const violations = results.filter((result) => !result.passed);
  return {
    passed: violations.length === 0,
    results,
    violations,
  };
};

export const runQualityGuard = async (options = {}) => {
  try {
    return await executeQualityGuard(options);
  } catch (error) {
    if (error instanceof QualityToolError) throw error;
    throw new QualityToolError("guard", error);
  }
};

export const assertQuality = async (options = {}) => {
  const report = await runQualityGuard(options);
  if (!report.passed) throw new QualityViolationError(report.violations);
  return report;
};
