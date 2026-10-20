export type LineKind = "p" | "h1" | "h2" | "h3" | "ul" | "ol" | "task" | "quote" | "hr" | "fence";

export type ParsedLine = {
  kind: LineKind;
  indent: number;
  text: string;
  done?: boolean;
  n?: number;
  lang?: string;
};

const MAX_INDENT = 6;

export function parseLine(raw: string): ParsedLine {
  const spaces = /^ */.exec(raw)?.[0].length ?? 0;
  const indent = Math.min(MAX_INDENT, Math.floor(spaces / 2));
  const rest = raw.slice(indent * 2);
  if (/^(-{3,}|\*{3,})$/.test(rest.trim())) return { kind: "hr", indent: 0, text: "" };
  if (rest.startsWith("```")) return { kind: "fence", indent: 0, text: "", lang: rest.slice(3).trim() };
  const heading = /^(#{1,6})\s+(.*)$/.exec(rest);
  if (heading) {
    const level = heading[1].length;
    const kind: LineKind = level >= 3 ? "h3" : level === 2 ? "h2" : "h1";
    return { kind, indent: 0, text: heading[2] ?? "" };
  }
  const task = /^[-*]\s+\[( |x|X)\]\s?(.*)$/.exec(rest);
  if (task) return { kind: "task", indent, text: task[2] ?? "", done: (task[1] ?? " ").toLowerCase() === "x" };
  const bullet = /^[-*+]\s+(.*)$/.exec(rest);
  if (bullet) return { kind: "ul", indent, text: bullet[1] ?? "" };
  const ordered = /^(\d+)[.)]\s+(.*)$/.exec(rest);
  if (ordered) return { kind: "ol", indent, text: ordered[2] ?? "", n: Number(ordered[1]) };
  const quote = /^>\s?(.*)$/.exec(rest);
  if (quote) return { kind: "quote", indent: 0, text: quote[1] ?? "" };
  return { kind: "p", indent, text: rest };
}

export function serializeLine(line: ParsedLine): string {
  const pad = "  ".repeat(Math.max(0, Math.min(MAX_INDENT, line.indent)));
  if (line.kind === "hr") return "---";
  if (line.kind === "fence") return "```" + (line.lang ?? "");
  if (line.kind === "h1") return `# ${line.text}`;
  if (line.kind === "h2") return `## ${line.text}`;
  if (line.kind === "h3") return `### ${line.text}`;
  if (line.kind === "ul") return `${pad}- ${line.text}`;
  if (line.kind === "ol") return `${pad}${line.n ?? 1}. ${line.text}`;
  if (line.kind === "task") return `${pad}- [${line.done ? "x" : " "}] ${line.text}`;
  if (line.kind === "quote") return `> ${line.text}`;
  return pad + line.text;
}

export function detectShortcut(text: string): ParsedLine | "code" | null {
  if (/^```[\w-]*$/.test(text)) return "code";
  if (/^(-{3,}|\*{3,})$/.test(text)) return { kind: "hr", indent: 0, text: "" };
  const heading = /^(#{1,6})\s+(.*)$/.exec(text);
  if (heading) {
    const level = heading[1].length;
    return {
      kind: level >= 3 ? "h3" : level === 2 ? "h2" : "h1",
      indent: 0,
      text: heading[2] ?? "",
    };
  }
  const task = /^(?:[-*]\s+)?\[( |x|X)\]\s?(.*)$/.exec(text);
  if (task && (text.startsWith("[") || text.startsWith("- [") || text.startsWith("* ["))) {
    return { kind: "task", indent: 0, text: task[2] ?? "", done: (task[1] ?? " ").toLowerCase() === "x" };
  }
  if (/^\[\s*\]\s?/.test(text)) return { kind: "task", indent: 0, text: text.replace(/^\[\s*\]\s?/, ""), done: false };
  const bullet = /^[-*+]\s+(.*)$/.exec(text);
  if (bullet) return { kind: "ul", indent: 0, text: bullet[1] ?? "" };
  const ordered = /^(\d+)[.)]\s+(.*)$/.exec(text);
  if (ordered) return { kind: "ol", indent: 0, text: ordered[2] ?? "", n: Number(ordered[1]) || 1 };
  const quote = /^>\s?(.*)$/.exec(text);
  if (quote && text.startsWith(">")) return { kind: "quote", indent: 0, text: quote[1] ?? "" };
  return null;
}

export function withIndent(line: ParsedLine, dir: 1 | -1): ParsedLine {
  if (line.kind === "hr" || line.kind === "fence" || line.kind === "h1" || line.kind === "h2" || line.kind === "h3" || line.kind === "quote") {
    return line;
  }
  return { ...line, indent: Math.max(0, Math.min(MAX_INDENT, line.indent + dir)) };
}

export function onEnter(line: ParsedLine): { current: ParsedLine; next: ParsedLine | null } {
  const list = line.kind === "ul" || line.kind === "ol" || line.kind === "task" || line.kind === "quote";
  if (list && line.text.trim() === "") {
    if (line.indent > 0 && line.kind !== "quote") {
      return { current: { ...line, indent: line.indent - 1 }, next: null };
    }
    return { current: { kind: "p", indent: 0, text: "" }, next: null };
  }
  if (line.kind === "ul") return { current: line, next: { kind: "ul", indent: line.indent, text: "" } };
  if (line.kind === "ol") return { current: line, next: { kind: "ol", indent: line.indent, text: "", n: (line.n ?? 1) + 1 } };
  if (line.kind === "task") return { current: line, next: { kind: "task", indent: line.indent, text: "", done: false } };
  if (line.kind === "quote") return { current: line, next: { kind: "quote", indent: 0, text: "" } };
  if (line.kind === "hr") return { current: line, next: { kind: "p", indent: 0, text: "" } };
  if (line.kind === "h1" || line.kind === "h2" || line.kind === "h3") {
    return { current: line, next: { kind: "p", indent: 0, text: "" } };
  }
  return { current: line, next: { kind: "p", indent: line.indent, text: "" } };
}

export function onBackspace(line: ParsedLine): ParsedLine | "merge" {
  if (line.indent > 0 && line.kind !== "quote" && line.kind !== "hr") return { ...line, indent: line.indent - 1 };
  if (line.kind !== "p") return { kind: "p", indent: 0, text: line.kind === "hr" ? "" : line.text };
  return "merge";
}

export function linesOf(body: string): string[] {
  const lines = body.replace(/\r\n/g, "\n").split("\n");
  return lines.length === 0 ? [""] : lines;
}

export function replaceLine(body: string, index: number, line: ParsedLine): string {
  const lines = linesOf(body);
  lines[index] = serializeLine(line);
  return lines.join("\n");
}

export function insertAfter(body: string, index: number, line: ParsedLine): string {
  const lines = linesOf(body);
  lines.splice(index + 1, 0, serializeLine(line));
  return lines.join("\n");
}

export function removeLine(body: string, index: number): string {
  const lines = linesOf(body);
  lines.splice(index, 1);
  if (lines.length === 0) lines.push("");
  return lines.join("\n");
}

export function openCodeBlock(body: string, index: number, lang: string): string {
  const lines = linesOf(body);
  lines.splice(index, 1, "```" + lang, "", "```");
  return lines.join("\n");
}
