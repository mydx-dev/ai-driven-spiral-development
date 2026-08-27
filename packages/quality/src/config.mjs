import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

export const defaultQualityConfig = {
  paths: {
    source: "src",
  },
  complexity: {
    cognitive: 15,
    cyclomatic: 15,
  },
  duplication: {
    percent: 5,
    minLines: 5,
    minTokens: 50,
  },
  responsibilityBoundary: {
    default: {
      statelessInstanceMethod: "error",
      internalOnlyPublicMethod: "error",
      staticMethod: "error",
      staticOnlyClass: "error",
      topLevelFunction: "error",
      localHelper: "error",
    },
    overrides: [],
    exceptions: {
      internalOnlyPublicMethods: [],
      staticMethods: [],
      staticOnlyClasses: [],
      topLevelFunctions: [],
    },
  },
  structure: {
    singleUseTrivialBoundary: {
      maxLoc: 5,
      maxComplexity: 2,
      maxFanIn: 1,
      failOnDetection: true,
    },
    cohesion: {
      lcomMax: 0.9,
      tccMin: 0.1,
      failOnViolation: true,
    },
    coupling: {
      cboMax: 12,
      failOnViolation: true,
    },
    godClass: {
      methodCountMax: 15,
      fieldCountMax: 10,
      cboMax: 12,
      lcomMax: 0.8,
      tccMin: 0.2,
      wmcMax: 60,
      minimumSignals: 3,
      failOnDetection: true,
    },
  },
  architecture: {
    forbiddenLayers: [],
  },
};

export const mergeQualityConfig = (quality = {}) => ({
  ...defaultQualityConfig,
  ...quality,
  paths: { ...defaultQualityConfig.paths, ...quality.paths },
  complexity: { ...defaultQualityConfig.complexity, ...quality.complexity },
  duplication: { ...defaultQualityConfig.duplication, ...quality.duplication },
  responsibilityBoundary: {
    ...defaultQualityConfig.responsibilityBoundary,
    ...quality.responsibilityBoundary,
    default: {
      ...defaultQualityConfig.responsibilityBoundary.default,
      ...quality.responsibilityBoundary?.default,
    },
    exceptions: {
      ...defaultQualityConfig.responsibilityBoundary.exceptions,
      ...quality.responsibilityBoundary?.exceptions,
    },
  },
  structure: {
    ...defaultQualityConfig.structure,
    ...quality.structure,
    singleUseTrivialBoundary: {
      ...defaultQualityConfig.structure.singleUseTrivialBoundary,
      ...quality.structure?.singleUseTrivialBoundary,
    },
    cohesion: {
      ...defaultQualityConfig.structure.cohesion,
      ...quality.structure?.cohesion,
    },
    coupling: {
      ...defaultQualityConfig.structure.coupling,
      ...quality.structure?.coupling,
    },
    godClass: {
      ...defaultQualityConfig.structure.godClass,
      ...quality.structure?.godClass,
    },
  },
  architecture: {
    ...defaultQualityConfig.architecture,
    ...quality.architecture,
  },
});

export const loadQualityConfig = async (configPath = "quality.config.mjs") => {
  const module = await import(pathToFileURL(resolve(configPath)).href);
  return mergeQualityConfig(module.quality ?? module.default ?? {});
};
