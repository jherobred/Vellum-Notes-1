import type { ReactNode } from "react";

type Item = { text: string; task?: boolean; done?: boolean; raw: string };

type Block =
  | { type: "h"; level: 1 | 2 | 3; text: string }
  | { type: "p"; text: string }
  | { type: "quote"; text: string }
  | { type: "ul"; items: Item[] }
  | { type: "ol"; items: string[] }
  | { type: "code"; text: string }
  | { type: "hr" };

function parseBlocks(source: string): Block[] {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i] ?? "";
    if (line.trim() === "") {
      i += 1;
      continue;
    }
    if (line.startsWith("```")) {
      const buf: string[] = [];
      i += 1;
      while (i < lines.length && !(lines[i] ?? "").startsWith("```")) {
        buf.push(lines[i] ?? "");
        i += 1;
      }
      if (i < lines.length) i += 1;
      blocks.push({ type: "code", text: buf.join("\n") });
      continue;
    }
    if (/^---+$/.test(line.trim())) {
      blocks.push({ type: "hr" });
      i += 1;
      continue;
    }
    const heading = /^(#{1,3})\s+(.*)$/.exec(line);
    if (heading) {
      const level = heading[1].length as 1 | 2 | 3;
      blocks.push({ type: "h", level, text: heading[2] ?? "" });
      i += 1;
      continue;
    }
    if (line.startsWith(">")) {
      const buf: string[] = [];
      while (i < lines.length && (lines[i] ?? "").startsWith(">")) {
        buf.push((lines[i] ?? "").replace(/^>\s?/, ""));
        i += 1;
      }
      blocks.push({ type: "quote", text: buf.join(" ") });
      continue;
    }
    if (/^\s*[-*]\s+/.test(line)) {
      const items: Item[] = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i] ?? "")) {
        const raw = lines[i] ?? "";
        const body = raw.replace(/^\s*[-*]\s+/, "");
        const task = /^\[( |x|X)\]\s+/.exec(body);
        if (task) {
          items.push({
            text: body.replace(/^\[( |x|X)\]\s+/, ""),
            task: true,
            done: (task[1] ?? " ").toLowerCase() === "x",
            raw,
          });
        } else {
          items.push({ text: body, raw });
        }
        i += 1;
      }
      blocks.push({ type: "ul", items });
      continue;
    }
    if (/^\s*\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i] ?? "")) {
        items.push((lines[i] ?? "").replace(/^\s*\d+\.\s+/, ""));
        i += 1;
      }
      blocks.push({ type: "ol", items });
      continue;
    }
    const buf = [line];
    i += 1;
    while (i < lines.length && continuable(lines[i] ?? "")) {
      buf.push(lines[i] ?? "");
      i += 1;
    }
    blocks.push({ type: "p", text: buf.join(" ") });
  }
  return blocks;
}

function continuable(line: string): boolean {
  if (line.trim() === "") return false;
  if (line.startsWith("#") || line.startsWith(">") || line.startsWith("```")) return false;
  if (/^\s*[-*]\s+/.test(line) || /^\s*\d+\.\s+/.test(line)) return false;
  if (/^---+$/.test(line.trim())) return false;
  return true;
}

export function renderInline(text: string, key: string): ReactNode[] {
  const re =
    /(~~[^~]+~~|==[^=]+==|\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\((https?:\/\/[^\s)]+|mailto:[^\s)]+)\))/g;
  const out: ReactNode[] = [];
  let last = 0;
  let n = 0;
  for (const match of text.matchAll(re)) {
    const index = match.index ?? 0;
    const token = match[0];
    if (index > last) out.push(text.slice(last, index));
    const id = `${key}-${n}`;
    n += 1;
    if (token.startsWith("~~")) out.push(<s key={id}>{token.slice(2, -2)}</s>);
    else if (token.startsWith("==")) {
      out.push(
        <mark key={id} className="rounded-sm bg-brass/35 text-inherit">
          {token.slice(2, -2)}
        </mark>,
      );
    } else if (token.startsWith("**")) out.push(<strong key={id}>{token.slice(2, -2)}</strong>);
    else if (token.startsWith("`")) out.push(<code key={id}>{token.slice(1, -1)}</code>);
    else if (token.startsWith("[")) {
      const link = /^\[([^\]]+)\]\((.+)\)$/.exec(token);
      if (link) {
        out.push(
          <a key={id} href={link[2]} target="_blank" rel="noreferrer noopener">
            {link[1]}
          </a>,
        );
      }
    } else if (token.startsWith("*")) out.push(<em key={id}>{token.slice(1, -1)}</em>);
    last = index + token.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function MarkdownView({
  source,
  onToggleTask,
}: {
  source: string;
  onToggleTask?: (rawLine: string) => void;
}) {
  const blocks = parseBlocks(source);
  return (
    <div className="md-body text-ink">
      {blocks.map((block, index) => {
        const key = `b-${index}`;
        if (block.type === "h") {
          const Tag = block.level === 1 ? "h1" : block.level === 2 ? "h2" : "h3";
          return <Tag key={key}>{renderInline(block.text, key)}</Tag>;
        }
        if (block.type === "p") return <p key={key}>{renderInline(block.text, key)}</p>;
        if (block.type === "quote") return <blockquote key={key}>{renderInline(block.text, key)}</blockquote>;
        if (block.type === "hr") return <hr key={key} />;
        if (block.type === "code") return <pre key={key}>{block.text}</pre>;
        if (block.type === "ol") {
          return (
            <ol key={key} className="list-decimal">
              {block.items.map((item, itemIndex) => (
                <li key={`${key}-${itemIndex}`}>{renderInline(item, `${key}-${itemIndex}`)}</li>
              ))}
            </ol>
          );
        }
        return (
          <ul key={key} className="list-disc">
            {block.items.map((item, itemIndex) =>
              item.task ? (
                <li key={`${key}-${itemIndex}`} className="list-none -ml-5">
                  <label className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      className="mt-1 size-4 accent-wax"
                      checked={item.done === true}
                      onChange={() => onToggleTask?.(item.raw)}
                    />
                    <span className={item.done ? "text-muted line-through" : undefined}>
                      {renderInline(item.text, `${key}-${itemIndex}`)}
                    </span>
                  </label>
                </li>
              ) : (
                <li key={`${key}-${itemIndex}`}>{renderInline(item.text, `${key}-${itemIndex}`)}</li>
              ),
            )}
          </ul>
        );
      })}
    </div>
  );
}
