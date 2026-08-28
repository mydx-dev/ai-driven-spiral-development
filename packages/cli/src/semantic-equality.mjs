const normalizeText = (value) =>
  value
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.replace(/[ \t]+$/g, ""))
    .join("\n")
    .replace(/\n+$/g, "");

const decodeString = (source, start, quote) => {
  let index = start + 1;
  let value = "";

  while (index < source.length) {
    const char = source[index];
    if (char === quote) return { value, end: index + 1 };
    if (char !== "\\") {
      value += char;
      index += 1;
      continue;
    }

    index += 1;
    const escaped = source[index];
    if (escaped === undefined) return null;
    const escapes = {
      n: "\n",
      r: "\r",
      t: "\t",
      b: "\b",
      f: "\f",
      v: "\v",
      0: "\0",
    };
    if (escapes[escaped] !== undefined) {
      value += escapes[escaped];
      index += 1;
      continue;
    }
    if (escaped === "\n") {
      index += 1;
      continue;
    }
    if (escaped === "\r" && source[index + 1] === "\n") {
      index += 2;
      continue;
    }
    if (escaped === "x") {
      const hex = source.slice(index + 1, index + 3);
      if (!/^[0-9a-fA-F]{2}$/.test(hex)) return null;
      value += String.fromCodePoint(Number.parseInt(hex, 16));
      index += 3;
      continue;
    }
    if (escaped === "u") {
      if (source[index + 1] === "{") {
        const close = source.indexOf("}", index + 2);
        if (close < 0) return null;
        const hex = source.slice(index + 2, close);
        if (!/^[0-9a-fA-F]+$/.test(hex)) return null;
        value += String.fromCodePoint(Number.parseInt(hex, 16));
        index = close + 1;
        continue;
      }
      const hex = source.slice(index + 1, index + 5);
      if (!/^[0-9a-fA-F]{4}$/.test(hex)) return null;
      value += String.fromCodePoint(Number.parseInt(hex, 16));
      index += 5;
      continue;
    }

    value += escaped;
    index += 1;
  }

  return null;
};

const operators = [
  ">>>=",
  "===",
  "!==",
  "**=",
  "&&=",
  "||=",
  "??=",
  ">>>",
  "<<=",
  ">>=",
  "...",
  "==",
  "!=",
  "<=",
  ">=",
  "=>",
  "++",
  "--",
  "&&",
  "||",
  "??",
  "+=",
  "-=",
  "*=",
  "/=",
  "%=",
  "&=",
  "|=",
  "^=",
  "<<",
  ">>",
  "**",
  "?.",
];

const tokenizeJavaScript = (source) => {
  const tokens = [];
  let index = 0;

  while (index < source.length) {
    const char = source[index];
    if (/\s/.test(char)) {
      index += 1;
      continue;
    }
    if (source.startsWith("//", index)) {
      const nextLine = source.indexOf("\n", index + 2);
      index = nextLine < 0 ? source.length : nextLine + 1;
      continue;
    }
    if (source.startsWith("/*", index)) {
      const close = source.indexOf("*/", index + 2);
      if (close < 0) return null;
      index = close + 2;
      continue;
    }
    if (char === '"' || char === "'") {
      const decoded = decodeString(source, index, char);
      if (!decoded) return null;
      tokens.push(["string", decoded.value]);
      index = decoded.end;
      continue;
    }
    if (char === "`") {
      let end = index + 1;
      let escaped = false;
      for (; end < source.length; end += 1) {
        const current = source[end];
        if (!escaped && current === "`") break;
        escaped = !escaped && current === "\\";
        if (current !== "\\") escaped = false;
      }
      if (end >= source.length) return null;
      tokens.push(["template", source.slice(index + 1, end)]);
      index = end + 1;
      continue;
    }
    if (/[A-Za-z_$]/.test(char)) {
      let end = index + 1;
      while (end < source.length && /[A-Za-z0-9_$]/.test(source[end])) end += 1;
      tokens.push(["identifier", source.slice(index, end)]);
      index = end;
      continue;
    }
    if (/[0-9]/.test(char)) {
      let end = index + 1;
      while (end < source.length && /[0-9A-Za-z_.]/.test(source[end])) end += 1;
      tokens.push(["number", source.slice(index, end)]);
      index = end;
      continue;
    }

    const operator = operators.find((candidate) =>
      source.startsWith(candidate, index),
    );
    if (operator) {
      tokens.push(["operator", operator]);
      index += operator.length;
      continue;
    }

    tokens.push(["punctuator", char]);
    index += 1;
  }

  return tokens;
};

const normalizeJavaScriptTokens = (tokens) => {
  const normalized = [];

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    const next = tokens[index + 1];
    if (
      token[0] === "punctuator" &&
      token[1] === "," &&
      next?.[0] === "punctuator" &&
      (next[1] === "]" || next[1] === "}")
    ) {
      continue;
    }
    if (
      next?.[0] === "punctuator" &&
      next[1] === ":" &&
      ((token[0] === "identifier" && /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(token[1])) ||
        (token[0] === "string" && /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(token[1])))
    ) {
      normalized.push(["property", token[1]]);
      continue;
    }
    normalized.push(token);
  }

  return normalized;
};

const normalizeMarkdown = (value) => {
  const lines = normalizeText(value).split("\n");
  if (lines[0] !== "---") return lines.join("\n");
  const frontMatterEnd = lines.indexOf("---", 1);
  if (frontMatterEnd < 0) return lines.join("\n");

  for (let index = 1; index < frontMatterEnd; index += 1) {
    lines[index] = lines[index].replace(
      /^(\s*[^:]+:\s*)'([^']*)'$/,
      '$1"$2"',
    );
  }

  return lines.join("\n");
};

const normalizeYaml = (value) => {
  const lines = normalizeText(value).split("\n");
  const indents = [
    ...new Set(
      lines
        .filter((line) => line.trim().length > 0)
        .map((line) => line.match(/^\s*/)?.[0].length ?? 0),
    ),
  ].sort((left, right) => left - right);
  const levels = new Map(indents.map((indent, index) => [indent, index]));

  return lines
    .map((line) => {
      if (line.trim().length === 0) return "";
      const indent = line.match(/^\s*/)?.[0].length ?? 0;
      return `${"  ".repeat(levels.get(indent) ?? 0)}${line.trimStart()}`;
    })
    .join("\n");
};

const deepEqual = (left, right) => {
  if (Object.is(left, right)) return true;
  if (Array.isArray(left) || Array.isArray(right)) {
    if (!Array.isArray(left) || !Array.isArray(right)) return false;
    return (
      left.length === right.length &&
      left.every((value, index) => deepEqual(value, right[index]))
    );
  }
  if (
    left === null ||
    right === null ||
    typeof left !== "object" ||
    typeof right !== "object"
  ) {
    return false;
  }

  const leftKeys = Object.keys(left).sort();
  const rightKeys = Object.keys(right).sort();
  return (
    deepEqual(leftKeys, rightKeys) &&
    leftKeys.every((key) => deepEqual(left[key], right[key]))
  );
};

export const generatedFileEquivalent = ({ path, current, expected }) => {
  if (path.endsWith(".mjs")) {
    const currentTokens = tokenizeJavaScript(current);
    const expectedTokens = tokenizeJavaScript(expected);
    return (
      currentTokens !== null &&
      expectedTokens !== null &&
      deepEqual(
        normalizeJavaScriptTokens(currentTokens),
        normalizeJavaScriptTokens(expectedTokens),
      )
    );
  }

  if (path.endsWith(".md")) {
    return normalizeMarkdown(current) === normalizeMarkdown(expected);
  }

  if (path.endsWith(".yml") || path.endsWith(".yaml")) {
    return normalizeYaml(current) === normalizeYaml(expected);
  }

  return current === expected;
};

export const jsonEquivalent = (left, right) => deepEqual(left, right);
