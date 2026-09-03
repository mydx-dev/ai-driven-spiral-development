/**
 * Standard GitHub Artifact/Issue mapping.
 *
 * `template: true` means humans/agents author the Artifact as an Issue.
 * Runtime-managed Issue Artifacts intentionally have `template: false`.
 * ImplementedSoftwareElements and IntegratedSoftware are not listed here because
 * they are projections of GitHub implementation/integration evidence, not Issues.
 */
export const standardGitHubArtifactIssueMappings = [
  {
    key: "stakeholderRequirements",
    stage: "要求定義",
    artifactType: "stakeholder-requirements-specification",
    filename: "spiral-stakeholder-requirements-specification.md",
    name: "Spiral: Stakeholder Requirements Specification",
    titlePrefix: "[StRS]",
    template: true,
    artifactData: {
      id: "TODO-artifact-id",
      cycleId: "#TODO-cycle",
      stakeholders: [],
      purpose: "",
      scope: "",
      businessContext: "",
      operationalContext: "",
      requirements: [],
      constraints: [],
      scenarios: [],
      unresolvedItems: [],
    },
  },
  {
    key: "systemRequirements",
    stage: "システム要件定義",
    artifactType: "system-requirements-specification",
    filename: "spiral-system-requirements-specification.md",
    name: "Spiral: System Requirements Specification",
    titlePrefix: "[SyRS]",
    template: true,
    artifactData: {
      id: "TODO-artifact-id",
      cycleId: "#TODO-cycle",
      purpose: "",
      scope: "",
      overview: "",
      requirements: [],
      assumptions: [],
      dependencies: [],
      unresolvedItems: [],
    },
  },
  {
    key: "systemArchitectureDescription",
    stage: "システム要件定義",
    artifactType: "system-architecture-description",
    filename: "spiral-system-architecture-description.md",
    name: "Spiral: System Architecture Description",
    titlePrefix: "[System Architecture Description]",
    template: true,
    artifactData: {
      id: "TODO-artifact-id",
      cycleId: "#TODO-cycle",
      boundary: "",
      elements: [],
      relationships: [],
      interfaces: [],
      requirementAllocations: [],
      decisions: [],
    },
  },
  {
    key: "softwareRequirements",
    stage: "ソフトウェア要件定義",
    artifactType: "software-requirements-specification",
    filename: "spiral-software-requirements-specification.md",
    name: "Spiral: Software Requirements Specification",
    titlePrefix: "[SRS]",
    template: true,
    artifactData: {
      id: "TODO-artifact-id",
      cycleId: "#TODO-cycle",
      purpose: "",
      scope: "",
      requirements: [],
      unresolvedItems: [],
    },
  },
  {
    key: "softwareArchitectureDescription",
    stage: "ソフトウェア要件定義",
    artifactType: "software-architecture-description",
    filename: "spiral-software-architecture-description.md",
    name: "Spiral: Software Architecture Description",
    titlePrefix: "[Software Architecture Description]",
    template: true,
    sections: ["## Dependency Graph"],
    artifactData: {
      id: "TODO-artifact-id",
      cycleId: "#TODO-cycle",
      elements: [],
      relationships: [],
      interfaces: [],
      requirementAllocations: [],
      decisions: [],
    },
  },
  {
    key: "softwareElementDesign",
    stage: "実装",
    artifactType: "software-element-design",
    filename: "spiral-software-element-design.md",
    name: "Spiral: Software Element Design",
    titlePrefix: "[Software Element Design]",
    template: true,
    artifactData: {
      id: "TODO-artifact-id",
      cycleId: "#TODO-cycle",
      architectureElement: {
        architectureId: "TODO-software-architecture-id",
        elementId: "TODO-element-id",
      },
      data: [],
      state: [],
      behavior: [],
      interfaceIds: [],
      rationales: [],
      unresolvedDecisions: [],
    },
  },
  {
    key: "verificationResult",
    stage: "QA",
    artifactType: "verification-result",
    titlePrefix: "[Verification]",
    template: false,
  },
  {
    key: "validationResult",
    stage: "検収",
    artifactType: "validation-result",
    titlePrefix: "[Validation]",
    template: false,
  },
  {
    key: "feedbackState",
    stage: "フィードバック",
    artifactType: "feedback-state",
    titlePrefix: "[Feedback]",
    template: false,
    sections: ["## Next-cycle Decision"],
  },
];

export const standardGitHubArtifactIssueMappingsByKey = Object.fromEntries(
  standardGitHubArtifactIssueMappings.map((mapping) => [mapping.key, mapping]),
);

export const standardGitHubArtifactIssueTemplates =
  standardGitHubArtifactIssueMappings.filter((mapping) => mapping.template);

export const standardGitHubArtifactIssueTemplatesByKey = Object.fromEntries(
  standardGitHubArtifactIssueTemplates.map((template) => [template.key, template]),
);

/** @param {(typeof standardGitHubArtifactIssueTemplates)[number]} template */
export const renderStandardGitHubArtifactIssueTemplate = (template) => {
  const id = template.artifactData.id;
  const cycleId = template.artifactData.cycleId;
  const about = `${template.stage}の${template.name.replace("Spiral: ", "")}を記録する`;
  return [
    "---",
    `name: ${JSON.stringify(template.name)}`,
    `about: ${JSON.stringify(about)}`,
    `title: ${JSON.stringify(`${template.titlePrefix} `)}`,
    'labels: ""',
    'assignees: ""',
    "---",
    "",
    `<!-- spiral-artifact-id: ${id} -->`,
    `<!-- spiral-cycle-id: ${cycleId} -->`,
    `<!-- spiral-artifact-type: ${template.artifactType} -->`,
    "",
    "## Artifact",
    "",
    `- Type: \`${template.artifactType}\``,
    `- Artifact ID: \`${id}\``,
    `- Cycle ID: \`${cycleId}\``,
    `- Process: \`${template.stage}\``,
    "",
    "## Traceability",
    "",
    "<!-- Artifact Data内の参照IDと一致する上位Artifact IDを記載してください。 -->",
    "- None",
    "",
    ...(template.sections ?? []).flatMap((heading) => [
      heading,
      "",
      "- None",
      "",
    ]),
    "## Artifact Data",
    "",
    "<!-- TODO値を置換し、JSONを対象Artifactの構造に従って編集してください。 -->",
    "```json",
    JSON.stringify(template.artifactData, null, 2),
    "```",
    "",
    "## Gate Result",
    "",
    "- [ ] Not evaluated",
    "",
    "## Composite Gate Result",
    "",
    "- [ ] Not evaluated",
    "",
  ].join("\n");
};
