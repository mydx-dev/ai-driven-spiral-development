const artifactRegistry = {
  github: {
    dependencies: { "@mydx/spiral-github": "latest" },
    github: true,
  },
};

const processRegistry = {
  standard: {
    dependencies: { "@mydx/spiral-standard": "latest" },
  },
  custom: {
    dependencies: {},
  },
};

const bindingRegistry = {
  "github:standard": {
    dependency: "@mydx/spiral-standard-github",
  },
};

export const resolveComposition = ({
  artifact = "github",
  process = "standard",
  quality = false,
} = {}) => {
  const artifactEntry = artifactRegistry[artifact];
  if (!artifactEntry) {
    throw new Error(`Unsupported artifact adapter: ${artifact}`);
  }

  const processEntry = processRegistry[process];
  if (!processEntry) {
    throw new Error(`Unsupported process preset: ${process}`);
  }

  const binding = bindingRegistry[`${artifact}:${process}`] ?? null;
  const dependencies = {
    "ai-driven-spiral-development": "latest",
    ...artifactEntry.dependencies,
    ...processEntry.dependencies,
    ...(binding ? { [binding.dependency]: "latest" } : {}),
  };
  const devDependencies = quality
    ? { "@mydx/spiral-quality": "latest" }
    : {};

  return {
    artifact,
    process,
    quality,
    dependencies,
    devDependencies,
    binding: binding?.dependency ?? null,
    requiresProjectBinding: artifact === "github" && process === "custom",
    github: artifactEntry.github === true,
  };
};
