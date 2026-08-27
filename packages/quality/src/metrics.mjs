import { relative, resolve } from "node:path";
import { Node, Project, SyntaxKind } from "ts-morph";

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const globRegExp = (glob) => {
  const escaped = glob
    .replace(/\\/g, "/")
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*\*/g, "__DOUBLE_STAR__")
    .replace(/\*/g, "[^/]*")
    .replace(/__DOUBLE_STAR__/g, ".*");
  return new RegExp(`^${escaped}$`);
};

const relativeFilePath = (sourceFile, cwd) =>
  relative(cwd, sourceFile.getFilePath()).replace(/\\/g, "/");

const policyForFile = (quality, sourceFile, cwd) => {
  const path = relativeFilePath(sourceFile, cwd);
  const defaults = quality.responsibilityBoundary?.default ?? {};
  const overrides = quality.responsibilityBoundary?.overrides ?? [];
  return overrides.reduce((policy, override) => {
    const matches = (override.files ?? []).some((pattern) =>
      globRegExp(pattern).test(path),
    );
    return matches ? { ...policy, ...override.rules } : policy;
  }, defaults);
};

const exceptionFor = (quality, kind, symbol) =>
  quality.responsibilityBoundary?.exceptions?.[kind]?.find(
    (exception) => exception.symbol === symbol && exception.reason?.trim(),
  );

const referenceNodes = (nameNode) => {
  if (!nameNode || !Node.isIdentifier(nameNode)) return [];
  return nameNode
    .findReferences()
    .flatMap((referencedSymbol) => referencedSymbol.getReferences())
    .map((reference) => reference.getNode())
    .filter(
      (reference) =>
        reference.getSourceFile() !== nameNode.getSourceFile() ||
        reference.getStart() !== nameNode.getStart(),
    );
};

const approximateComplexity = (text) => {
  const decisions =
    text.match(/\b(?:if|for|while|case|catch)\b|&&|\|\||\?\?|\?(?![.?])/g) ??
    [];
  return 1 + decisions.length;
};

const countLoc = (node) =>
  node.getEndLineNumber() - node.getStartLineNumber() + 1;

const fieldNames = (classDeclaration) => {
  const names = new Set(
    classDeclaration
      .getProperties()
      .filter((property) => !property.isStatic())
      .map((property) => property.getName()),
  );
  for (const constructor of classDeclaration.getConstructors()) {
    for (const parameter of constructor.getParameters()) {
      if (parameter.isParameterProperty()) names.add(parameter.getName());
    }
  }
  return [...names];
};

const usedFields = (method, names) =>
  new Set(
    names.filter((field) =>
      new RegExp(`\\bthis\\.${escapeRegExp(field)}\\b`).test(method.getText()),
    ),
  );

const cohesion = (methods, names) => {
  if (methods.length < 2 || names.length === 0) return { tcc: 1, lcom: 0 };
  const sets = methods.map((method) => usedFields(method, names));
  const pairs = (methods.length * (methods.length - 1)) / 2;
  let connected = 0;
  for (let left = 0; left < sets.length; left += 1) {
    for (let right = left + 1; right < sets.length; right += 1) {
      if ([...sets[left]].some((field) => sets[right].has(field)))
        connected += 1;
    }
  }
  const tcc = pairs === 0 ? 1 : connected / pairs;
  return { tcc, lcom: 1 - tcc };
};

const importedIdentifiers = (sourceFile) => {
  const identifiers = new Set();
  for (const declaration of sourceFile.getImportDeclarations()) {
    const defaultImport = declaration.getDefaultImport();
    if (defaultImport) identifiers.add(defaultImport.getText());
    const namespaceImport = declaration.getNamespaceImport();
    if (namespaceImport) identifiers.add(namespaceImport.getText());
    for (const namedImport of declaration.getNamedImports()) {
      identifiers.add(
        namedImport.getAliasNode()?.getText() ?? namedImport.getName(),
      );
    }
  }
  return [...identifiers];
};

const calculateCbo = (classDeclaration) => {
  const text = classDeclaration.getText();
  return importedIdentifiers(classDeclaration.getSourceFile()).filter(
    (identifier) => new RegExp(`\\b${escapeRegExp(identifier)}\\b`).test(text),
  ).length;
};

const implementedMethodNames = (classDeclaration) => {
  const names = new Set();
  for (const implementation of classDeclaration.getImplements()) {
    for (const property of implementation.getType().getProperties()) {
      names.add(property.getName());
    }
  }
  return names;
};

const topLevelFunctions = (sourceFile) => {
  const candidates = sourceFile.getFunctions().map((declaration) => ({
    declaration,
    exported: declaration.isExported(),
    name: declaration.getName() ?? "<anonymous>",
    nameNode: declaration.getNameNode(),
  }));
  for (const variable of sourceFile.getVariableDeclarations()) {
    const statement = variable.getVariableStatement();
    const initializer = variable.getInitializer();
    const nameNode = variable.getNameNode();
    if (
      statement?.getParent() === sourceFile &&
      initializer &&
      (Node.isArrowFunction(initializer) ||
        Node.isFunctionExpression(initializer)) &&
      Node.isIdentifier(nameNode)
    ) {
      candidates.push({
        declaration: initializer,
        exported: statement.isExported(),
        name: variable.getName(),
        nameNode,
      });
    }
  }
  return candidates;
};

const localHelpers = (sourceFile) => {
  const candidates = [];
  for (const declaration of sourceFile.getDescendantsOfKind(
    SyntaxKind.FunctionDeclaration,
  )) {
    if (declaration.getParent() !== sourceFile) {
      candidates.push({
        declaration,
        name: declaration.getName() ?? "<anonymous>",
        nameNode: declaration.getNameNode(),
      });
    }
  }
  for (const variable of sourceFile.getDescendantsOfKind(
    SyntaxKind.VariableDeclaration,
  )) {
    const initializer = variable.getInitializer();
    const statement = variable.getFirstAncestorByKind(
      SyntaxKind.VariableStatement,
    );
    const nameNode = variable.getNameNode();
    if (
      statement &&
      statement.getParent() !== sourceFile &&
      initializer &&
      (Node.isArrowFunction(initializer) ||
        Node.isFunctionExpression(initializer)) &&
      Node.isIdentifier(nameNode)
    ) {
      candidates.push({
        declaration: initializer,
        name: variable.getName(),
        nameNode,
      });
    }
  }
  return candidates;
};

const isFactoryMethod = (method, classDeclaration) => {
  try {
    const returnType = method.getReturnType();
    const classType = classDeclaration.getType();
    if (
      returnType.isAny() ||
      returnType.isUnknown() ||
      returnType.isNever() ||
      !returnType.isAssignableTo(classType)
    ) {
      return false;
    }
    const returns = method.getDescendantsOfKind(SyntaxKind.ReturnStatement);
    return (
      returns.length > 0 &&
      returns.every((statement) => {
        const expression = statement.getExpression();
        if (!expression) return false;
        const type = expression.getType();
        return (
          !type.isAny() &&
          !type.isUnknown() &&
          !type.isNever() &&
          type.isAssignableTo(classType) &&
          Node.isNewExpression(expression) &&
          expression.getExpression().getText() === classDeclaration.getName()
        );
      })
    );
  } catch {
    return false;
  }
};

const addFinding = (findings, finding, severity = "error", exception) => {
  if (severity === "off") return;
  findings.push({
    ...finding,
    kind: exception ? `${finding.kind}-exception` : finding.kind,
    detail: exception
      ? `explicit exception: ${exception.reason}`
      : finding.detail,
    fatal: !exception && severity === "error",
  });
};

const addSingleUse = (findings, quality, sourceFile, candidate, localOnly) => {
  const rule = quality.structure.singleUseTrivialBoundary;
  if (!rule?.failOnDetection || !candidate.nameNode || !localOnly) return;
  const fanIn = referenceNodes(candidate.nameNode).length;
  const loc = countLoc(candidate.declaration);
  const complexity = approximateComplexity(candidate.declaration.getText());
  if (
    fanIn <= rule.maxFanIn &&
    loc <= rule.maxLoc &&
    complexity <= rule.maxComplexity
  ) {
    findings.push({
      kind: "single-use-trivial-boundary",
      file: sourceFile.getFilePath(),
      symbol: candidate.name,
      detail: `local-only, fan-in=${fanIn}, LOC=${loc}, complexity=${complexity}`,
      fatal: true,
    });
  }
};

export const analyzeSourceFiles = (
  sourceFiles,
  quality,
  cwd = process.cwd(),
) => {
  const findings = [];
  for (const sourceFile of sourceFiles) {
    if (/\.(?:spec|test)\.[jt]sx?$/.test(sourceFile.getFilePath())) continue;
    const policy = policyForFile(quality, sourceFile, cwd);
    for (const candidate of topLevelFunctions(sourceFile)) {
      const exception = exceptionFor(
        quality,
        "topLevelFunctions",
        candidate.name,
      );
      addFinding(
        findings,
        {
          kind: "top-level-free-function",
          file: sourceFile.getFilePath(),
          symbol: candidate.name,
          detail: "top-level function boundary is prohibited in this layer",
        },
        policy.topLevelFunction,
        exception,
      );
      const references = candidate.nameNode
        ? referenceNodes(candidate.nameNode)
        : [];
      const localOnly =
        !candidate.exported &&
        references.every(
          (reference) => reference.getSourceFile() === sourceFile,
        );
      if (!exception) {
        addSingleUse(findings, quality, sourceFile, candidate, localOnly);
      }
    }
    for (const helper of localHelpers(sourceFile)) {
      addFinding(
        findings,
        {
          kind: "local-helper",
          file: sourceFile.getFilePath(),
          symbol: helper.name,
          detail:
            "named local function/arrow helper creates a procedural boundary",
        },
        policy.localHelper,
      );
      addSingleUse(findings, quality, sourceFile, helper, true);
    }
    for (const classDeclaration of sourceFile.getClasses()) {
      const className = classDeclaration.getName() ?? "<anonymous>";
      const methods = classDeclaration
        .getMethods()
        .filter((method) => !method.isStatic());
      const staticMethods = classDeclaration
        .getMethods()
        .filter((method) => method.isStatic());
      const fields = fieldNames(classDeclaration);
      const { tcc, lcom } = cohesion(methods, fields);
      const cbo = calculateCbo(classDeclaration);
      const wmc = methods.reduce(
        (sum, method) => sum + approximateComplexity(method.getText()),
        0,
      );
      const implemented = implementedMethodNames(classDeclaration);
      if (
        fields.length === 0 &&
        methods.length === 0 &&
        staticMethods.length > 0
      ) {
        addFinding(
          findings,
          {
            kind: "static-only-class",
            file: sourceFile.getFilePath(),
            symbol: className,
            detail:
              "class has no instance state/behavior and only static behavior",
          },
          policy.staticOnlyClass,
          exceptionFor(quality, "staticOnlyClasses", className),
        );
      }
      for (const method of staticMethods) {
        const symbol = `${className}.${method.getName()}`;
        const exception = isFactoryMethod(method, classDeclaration)
          ? { reason: "structural Factory Method / Named Constructor" }
          : exceptionFor(quality, "staticMethods", symbol);
        addFinding(
          findings,
          {
            kind: "static-method",
            file: sourceFile.getFilePath(),
            symbol,
            detail: "static method is prohibited in this class-oriented layer",
          },
          policy.staticMethod,
          exception,
        );
      }
      for (const method of methods) {
        if (
          method.hasModifier(SyntaxKind.PrivateKeyword) ||
          method.hasModifier(SyntaxKind.ProtectedKeyword)
        ) {
          continue;
        }
        const symbol = `${className}.${method.getName()}`;
        const contract = implemented.has(method.getName());
        if (!contract && !/\bthis\b/.test(method.getBodyText() ?? "")) {
          addFinding(
            findings,
            {
              kind: "stateless-instance-method",
              file: sourceFile.getFilePath(),
              symbol,
              detail:
                "method does not use this and is not declared by an implemented interface",
            },
            policy.statelessInstanceMethod,
          );
        }
        if (!contract) {
          const external = referenceNodes(method.getNameNode()).filter(
            (reference) =>
              reference.getFirstAncestorByKind(SyntaxKind.ClassDeclaration) !==
              classDeclaration,
          );
          const exception = exceptionFor(
            quality,
            "internalOnlyPublicMethods",
            symbol,
          );
          if (external.length === 0) {
            addFinding(
              findings,
              {
                kind: "internal-only-public-method",
                file: sourceFile.getFilePath(),
                symbol,
                detail: "references outside declaring class=0",
              },
              policy.internalOnlyPublicMethod,
              exception,
            );
            if (!exception) {
              addSingleUse(
                findings,
                quality,
                sourceFile,
                {
                  declaration: method,
                  name: symbol,
                  nameNode: method.getNameNode(),
                },
                true,
              );
            }
          }
        }
      }
      if (
        fields.length > 0 &&
        methods.length > 1 &&
        (lcom > quality.structure.cohesion.lcomMax ||
          tcc < quality.structure.cohesion.tccMin)
      ) {
        findings.push({
          kind: "low-cohesion",
          file: sourceFile.getFilePath(),
          symbol: className,
          detail: `LCOM=${lcom.toFixed(3)}, TCC=${tcc.toFixed(3)}`,
          fatal: quality.structure.cohesion.failOnViolation,
        });
      }
      if (cbo > quality.structure.coupling.cboMax) {
        findings.push({
          kind: "high-coupling",
          file: sourceFile.getFilePath(),
          symbol: className,
          detail: `CBO=${cbo}`,
          fatal: quality.structure.coupling.failOnViolation,
        });
      }
      const god = quality.structure.godClass;
      const signals = [
        methods.length > god.methodCountMax,
        fields.length > god.fieldCountMax,
        cbo > god.cboMax,
        lcom > god.lcomMax,
        tcc < god.tccMin,
        wmc > god.wmcMax,
      ].filter(Boolean).length;
      if (signals >= god.minimumSignals) {
        findings.push({
          kind: "god-class-candidate",
          file: sourceFile.getFilePath(),
          symbol: className,
          detail: `signals=${signals}, methods=${methods.length}, fields=${fields.length}, CBO=${cbo}, LCOM=${lcom.toFixed(3)}, TCC=${tcc.toFixed(3)}, WMC=${wmc}`,
          fatal: god.failOnDetection,
        });
      }
    }
  }
  return findings;
};

export const runMetrics = (quality, options = {}) => {
  const cwd = options.cwd ?? process.cwd();
  const root = options.root ?? quality.paths.source;
  const project = new Project({
    tsConfigFilePath: resolve(cwd, options.tsconfig ?? "tsconfig.json"),
    skipAddingFilesFromTsConfig: true,
  });
  const absoluteRoot = resolve(cwd, root);
  if (/\.(?:ts|tsx)$/.test(root)) {
    project.addSourceFileAtPath(absoluteRoot);
  } else {
    project.addSourceFilesAtPaths(`${absoluteRoot}/**/*.ts`);
    project.addSourceFilesAtPaths(`${absoluteRoot}/**/*.tsx`);
  }
  return analyzeSourceFiles(project.getSourceFiles(), quality, cwd);
};
