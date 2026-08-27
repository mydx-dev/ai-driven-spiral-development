#!/usr/bin/env node
import { pathToFileURL } from "node:url";
import { initRepository } from "./init.mjs";

const readOption = (args, name) => {
  const index = args.indexOf(name);
  if (index === -1) return undefined;
  const value = args[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`Missing value for ${name}`);
  }
  return value;
};

export const parseInitOptions = (args) => ({
  artifact: readOption(args, "--artifact"),
  process: readOption(args, "--process"),
  quality: args.includes("--quality") && !args.includes("--no-quality"),
  cwd: readOption(args, "--cwd"),
});

export const runCli = (args = process.argv.slice(2)) => {
  const [command] = args;
  if (command !== "init") {
    throw new Error(
      "Usage: spiral init [--artifact github] [--process standard|custom] [--quality] [--cwd path]",
    );
  }

  const result = initRepository(parseInitOptions(args.slice(1)));
  if (result.alreadySatisfied) {
    console.log("Portable Distribution is already satisfied.");
    return result;
  }

  for (const change of result.changes) {
    console.log(`${change.classification}: ${change.path}`);
  }
  if (result.composition.requiresProjectBinding) {
    console.log(
      "manual decision required: project固有のArtifact × Process bindingを接続してください。",
    );
  }
  return result;
};

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  try {
    runCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 2;
  }
}
