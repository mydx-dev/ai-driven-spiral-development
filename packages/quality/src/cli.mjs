#!/usr/bin/env node
import { runQualityGuard, QualityToolError } from "./runQualityGuard.mjs";

const argumentValue = (name, fallback) => {
  const index = process.argv.indexOf(name);
  return index === -1 ? fallback : process.argv[index + 1];
};

try {
  const report = await runQualityGuard({
    configPath: argumentValue("--config", "quality.config.mjs"),
    root: argumentValue("--root", undefined),
  });

  for (const result of report.results) {
    console.log(`${result.passed ? "PASS" : "FAIL"} ${result.sensor}`);
    if (result.output) console.log(result.output);
  }

  if (report.passed) {
    console.log("Quality Guard passed");
    process.exitCode = 0;
  } else {
    process.exitCode = 1;
  }
} catch (error) {
  if (error instanceof QualityToolError) {
    console.error(error.message);
    console.error(error.cause);
    process.exitCode = 2;
  } else {
    throw error;
  }
}
