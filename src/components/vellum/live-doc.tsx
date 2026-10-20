import {
  Check,
  Code,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListChecks,
  ListOrdered,
  Minus,
  Quote,
  Type,
} from "lucide-react";
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
} from "react";
import {
  detectShortcut,
  insertAfter,
  linesOf,
  onBackspace,
  onEnter,
  openCodeBlock,
  parseLine,
  removeLine,
  replaceLine,
  serializeLine,
  withIndent,
  type ParsedLine,
} from "@/lib/notes/lines";
import { cn } from "@/lib/cn";

export type LiveAction =
  | "bold"
  | "italic"
  | "strike"
  | "mark"
  | "h1"
  | "h2"
  | "h3"
  | "ul"
  | "ol"
  | "task"
  | "quote"
  | "code"
  | "link"
  | "hr"
  | "indent"
  | "outdent";

export type LiveDocHandle = {
  format: (action: LiveAction) => void;
  focusLine: (index: number) => void;
};

type Focus = { index: number; pos: number; end: number; nonce: number };

const COMMANDS: { id: LiveAction | "text"; label: string; hint: string; keys: string[]; icon: ReactNode }[] = [
  { id: "text", label: "Text", hint: "Paragraph", keys: ["text", "p"], icon: <Type className="size-4" /> },
  { id: "h1", label: "Heading", hint: "Large title", keys: ["h", "h1", "heading"], icon: <Heading1 className="size-4" /> },
  { id: "h2", label: "Subheading", hint: "Section", keys: ["h2", "sub"], icon: <Heading2 className="size-4" /> },
  { id: "h3", label: "Small heading", hint: "Minor", keys: ["h3", "small"], icon: <Heading3 className="size-4" /> },
  { id: "ul", label: "Bullet list", hint: "A simple list", keys: ["ul", "bullet", "list"], icon: <List className="size-4" /> },
  { id: "ol", label: "Numbered list", hint: "1. 2. 3.", keys: ["ol", "num", "number"], icon: <ListOrdered className="size-4" /> },
  { id: "task", label: "To-do", hint: "Check it off", keys: ["todo", "task", "check"], icon: <ListChecks className="size-4" /> },
  { id: "quote", label: "Quote", hint: "A pulled line", keys: ["quote", "q"], icon: <Quote className="size-4" /> },
  { id: "code", label: "Code", hint: "Monospace block", keys: ["code", "c"], icon: <Code className="size-4" /> },
  { id: "hr", label: "Divider", hint: "A quiet rule", keys: ["hr", "div", "line"], icon: <Minus className="size-4" /> },
];

const WRAP: Record<"bold" | "italic" | "strike" | "mark" | "code" | "link", [string, string, string]> = {
  bold: ["**", "**", "text"],
  italic: ["*", "*", "text"],
  strike: ["~~", "~~", "text"],
  mark: ["==", "==", "text"],
  code: ["`", "`", "text"],
  link: ["[", "](https://)", "link"],
};

export const LiveDoc = forwardRef<LiveDocHandle, {
  value: string;
  fontClass: string;
  typewriter: boolean;
  findQuery: string;
  findTick: number;
  docSelected?: boolean;
  onChange: (next: string) => void;
  onTask: (done: boolean) => void;
}>(function LiveDoc({ value, fontClass, typewriter, findQuery, findTick, docSelected, onChange, onTask }, ref) {
  const [focus, setFocus] = useState<Focus>({ index: 0, pos: 0, end: 0, nonce: 1 });
  const [pin, setPin] = useState(0);
  const [menuAt, setMenuAt] = useState(0);
  const [codeFocus, setCodeFocus] = useState<{ start: number; nonce: number } | null>(null);
  const areaRef = useRef<HTMLTextAreaElement>(null);
  const valueRef = useRef(value);
  const focusRef = useRef(focus);
  const onChangeRef = useRef(onChange);
  const onTaskRef = useRef(onTask);
  valueRef.current = value;
  focusRef.current = focus;
  onChangeRef.current = onChange;
  onTaskRef.current = onTask;

  const lines = linesOf(value);
  const active = parseLine(lines[focus.index] ?? "");
  const slash = active.kind === "p" && /^\/[a-z]*$/i.test(active.text) ? active.text.slice(1).toLowerCase() : null;
  const menu = slash === null
    ? []
    : COMMANDS.filter((item) => item.keys.some((key) => key.startsWith(slash)) || item.label.toLowerCase().startsWith(slash));

  const commit = (next: string) => {
    valueRef.current = next;
    onChangeRef.current(next);
  };

  const aim = (index: number, pos: number, end = pos, body?: string) => {
    const source = body ?? valueRef.current;
    const all = linesOf(source);
    const next = Math.max(0, Math.min(Math.max(all.length - 1, 0), index));
    const text = parseLine(all[next] ?? "").text;
    const start = Math.max(0, Math.min(pos, text.length));
    const stop = Math.max(start, Math.min(end, text.length));
    const nonce = Date.now();
    setCodeFocus(null);
    setPin(nonce);
    setFocus({ index: next, pos: start, end: stop, nonce });
  };

  const aimRef = useRef(aim);
  aimRef.current = aim;

  const openCode = (index: number, lang: string) => {
    commit(openCodeBlock(valueRef.current, index, lang));
    setPin(0);
    setCodeFocus({ start: index, nonce: Date.now() });
    setFocus((current) => ({ ...current, index, pos: 0, end: 0 }));
  };

  const applyFormat = (action: LiveAction) => {
    const body = valueRef.current;
    const all = linesOf(body);
    const index = Math.min(focusRef.current.index, Math.max(all.length - 1, 0));
    const line = parseLine(all[index] ?? "");
    const el = areaRef.current;
    const start = el?.selectionStart ?? line.text.length;
    const end = el?.selectionEnd ?? line.text.length;
    if (action === "indent" || action === "outdent") {
      commit(replaceLine(body, index, withIndent(line, action === "indent" ? 1 : -1)));
      return;
    }
    if (action === "bold" || action === "italic" || action === "strike" || action === "mark" || action === "link" || action === "code") {
      if (action === "code" && start === end) {
        openCode(index, "");
        return;
      }
      const [before, after, fallback] = WRAP[action];
      const selected = line.text.slice(start, end) || fallback;
      const nextText = line.text.slice(0, start) + before + selected + after + line.text.slice(end);
      const next = replaceLine(body, index, { ...line, text: nextText });
      commit(next);
      const caret = start + before.length + selected.length;
      aimRef.current(index, caret, caret, next);
      return;
    }
    if (action === "hr") {
      const next = insertAfter(replaceLine(body, index, { kind: "hr", indent: 0, text: "" }), index, { kind: "p", indent: 0, text: "" });
      commit(next);
      aimRef.current(index + 1, 0, 0, next);
      return;
    }
    const nextLine: ParsedLine = {
      kind: action,
      indent: 0,
      text: line.kind === "hr" ? "" : line.text.replace(/^\//, ""),
      done: false,
      n: 1,
    };
    const next = replaceLine(body, index, nextLine);
    commit(next);
    aimRef.current(index, nextLine.text.length, nextLine.text.length, next);
  };

  const formatRef = useRef(applyFormat);
  formatRef.current = applyFormat;

  useImperativeHandle(ref, () => ({
    focusLine: (index) => aimRef.current(index, 0),
    format: (action) => formatRef.current(action),
  }), []);

  useEffect(() => {
    if (findTick < 1) return;
    const query = findQuery.trim().toLowerCase();
    if (!query) return;
    const all = linesOf(valueRef.current);
    const hits = all
      .map((line, index) => (line.toLowerCase().includes(query) ? index : -1))
      .filter((index) => index >= 0);
    if (hits.length === 0) return;
    const index = hits[(findTick - 1) % hits.length] ?? 0;
    const parsed = parseLine(all[index] ?? "");
    const local = parsed.text.toLowerCase().indexOf(query);
    if (local >= 0) aimRef.current(index, local, local + query.length);
    else aimRef.current(index, 0);
    document.getElementById(`live-line-${index}`)?.scrollIntoView({ block: "center" });
  }, [findTick, findQuery]);

  useEffect(() => {
    if (!typewriter) return;
    document.getElementById(`live-line-${focus.index}`)?.scrollIntoView({ block: "center" });
  }, [focus.nonce, focus.index, typewriter]);

  useEffect(() => {
    setMenuAt(0);
  }, [slash]);

  const applySlash = (id: (typeof COMMANDS)[number]["id"]) => {
    const index = focusRef.current.index;
    if (id === "code") {
      openCode(index, "");
      return;
    }
    if (id === "hr") {
      const next = insertAfter(replaceLine(valueRef.current, index, { kind: "hr", indent: 0, text: "" }), index, { kind: "p", indent: 0, text: "" });
      commit(next);
      aim(index + 1, 0, 0, next);
      return;
    }
    const kind: ParsedLine["kind"] =
      id === "h1" || id === "h2" || id === "h3" || id === "ul" || id === "ol" || id === "task" || id === "quote"
        ? id
        : "p";
    const next = replaceLine(valueRef.current, index, { kind, indent: 0, text: "", done: false, n: 1 });
    commit(next);
    aim(index, 0, 0, next);
  };

  const onEdit = (index: number, text: string) => {
    const current = parseLine(linesOf(valueRef.current)[index] ?? "");
    if (current.kind === "hr") {
      if (!text) return;
      const next = replaceLine(valueRef.current, index, { kind: "p", indent: 0, text });
      commit(next);
      aim(index, text.length, text.length, next);
      return;
    }
    if (current.kind === "p" && !text.startsWith("/")) {
      const shortcut = detectShortcut(text);
      if (shortcut === "code") {
        openCode(index, text.slice(3).trim());
        return;
      }
      if (shortcut && shortcut.kind !== "p") {
        const adopted = { ...shortcut, indent: shortcut.kind === "quote" ? 0 : current.indent };
        const next = replaceLine(valueRef.current, index, adopted);
        commit(next);
        aim(index, adopted.text.length, adopted.text.length, next);
        return;
      }
    }
    commit(replaceLine(valueRef.current, index, { ...current, text }));
  };

  const onPaste = (index: number, raw: string) => {
    const incoming = raw.replace(/\r\n/g, "\n").split("\n");
    if (incoming.length < 2) {
      onEdit(index, incoming[0] ?? "");
      return;
    }
    const all = linesOf(valueRef.current);
    all.splice(index, 1, ...incoming);
    const next = all.join("\n");
    commit(next);
    const last = incoming[incoming.length - 1] ?? "";
    aim(index + incoming.length - 1, last.length, last.length, next);
  };

  const onKey = (event: KeyboardEvent<HTMLTextAreaElement>, index: number) => {
    if (event.nativeEvent.isComposing) return;
    const line = parseLine(lines[index] ?? "");
    const el = event.currentTarget;
    const pos = el.selectionStart ?? 0;
    const mod = event.metaKey || event.ctrlKey;
    if (menu.length > 0 && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
      event.preventDefault();
      setMenuAt((at) => (event.key === "ArrowDown" ? (at + 1) % menu.length : (at - 1 + menu.length) % menu.length));
      return;
    }
    if (menu.length > 0 && event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      applySlash(menu[Math.min(menuAt, menu.length - 1)]?.id ?? "text");
      return;
    }
    if (menu.length > 0 && event.key === "Escape") {
      event.preventDefault();
      onEdit(index, "");
      return;
    }
    if (mod && event.key.toLowerCase() === "b") {
      event.preventDefault();
      formatRef.current("bold");
      return;
    }
    if (mod && event.key.toLowerCase() === "i") {
      event.preventDefault();
      formatRef.current("italic");
      return;
    }
    if (mod && event.key === "Enter" && line.kind === "task") {
      event.preventDefault();
      const next = { ...line, done: !line.done };
      commit(replaceLine(valueRef.current, index, next));
      onTaskRef.current(next.done === true);
      return;
    }
    if (event.key === "Tab") {
      event.preventDefault();
      commit(replaceLine(valueRef.current, index, withIndent(line, event.shiftKey ? -1 : 1)));
      return;
    }
    if (event.key === "Enter" && event.shiftKey) {
      event.preventDefault();
      const next = insertAfter(valueRef.current, index, { kind: "p", indent: 0, text: "" });
      commit(next);
      aim(index + 1, 0, 0, next);
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      const step = onEnter(line);
      let nextBody = replaceLine(valueRef.current, index, step.current);
      if (step.next) nextBody = insertAfter(nextBody, index, step.next);
      commit(nextBody);
      aim(step.next ? index + 1 : index, 0, 0, nextBody);
      return;
    }
    if (event.key === "Backspace" && pos === 0 && el.selectionEnd === 0) {
      event.preventDefault();
      const step = onBackspace(line);
      if (step !== "merge") {
        commit(replaceLine(valueRef.current, index, step));
        return;
      }
      if (index === 0) return;
      const prev = parseLine(lines[index - 1] ?? "");
      if (prev.kind === "hr" || prev.kind === "fence") {
        const next = removeLine(valueRef.current, index);
        commit(next);
        aim(index - 1, 0, 0, next);
        return;
      }
      const merged = { ...prev, text: prev.text + line.text };
      const linesNext = linesOf(valueRef.current);
      linesNext[index - 1] = serializeLine(merged);
      linesNext.splice(index, 1);
      const next = linesNext.join("\n");
      commit(next);
      aim(index - 1, prev.text.length, prev.text.length, next);
      return;
    }
    if ((event.key === "ArrowUp" || event.key === "ArrowLeft") && pos === 0 && index > 0) {
      event.preventDefault();
      const prev = parseLine(lines[index - 1] ?? "").text.length;
      aim(index - 1, prev, prev);
    }
    if ((event.key === "ArrowDown" || event.key === "ArrowRight") && pos === line.text.length && index < lines.length - 1) {
      event.preventDefault();
      aim(index + 1, 0, 0);
    }
  };

  const blocks = blocksOf(lines);
  const hotIndex = codeFocus ? -1 : focus.index;

  return (
    <div
      data-live-doc=""
      className={cn("mt-8 flex flex-col pb-16", fontClass, docSelected && "is-doc-selected")}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          const last = lines.length - 1;
          aim(last, parseLine(lines[last] ?? "").text.length);
        }
      }}
    >
      {blocks.map((block) => {
        if (block.type === "code") {
          return (
            <CodeBlock
              key={`code-${block.start}`}
              anchor={block.start}
              lang={block.lang}
              text={block.text}
              focused={codeFocus?.start === block.start}
              nonce={codeFocus?.start === block.start ? codeFocus.nonce : 0}
              onChange={(text) => {
                const next = linesOf(valueRef.current);
                const inner = text.split("\n");
                next.splice(
                  block.start,
                  block.end - block.start + 1,
                  serializeLine({ kind: "fence", indent: 0, text: "", lang: block.lang }),
                  ...inner,
                  "```",
                );
                commit(next.join("\n"));
              }}
              onRemove={() => {
                const nextLines = linesOf(valueRef.current);
                nextLines.splice(block.start, block.end - block.start + 1);
                if (nextLines.length === 0) nextLines.push("");
                const next = nextLines.join("\n");
                commit(next);
                aim(Math.max(0, block.start - 1), 0, 0, next);
              }}
            />
          );
        }
        const { index, line } = block;
        const hot = hotIndex === index;
        return (
          <div
            key={`line-${index}`}
            id={`live-line-${index}`}
            className="live-line flex min-h-11 items-start"
            style={line.indent > 0 ? { paddingLeft: `${line.indent * 1.25}rem` } : undefined}
          >
            <Marker
              line={line}
              onToggle={() => {
                const next = { ...line, done: !line.done };
                commit(replaceLine(valueRef.current, index, next));
                onTaskRef.current(next.done === true);
              }}
            />
            <div className="relative min-w-0 flex-1">
              <LineField
                line={line}
                active={hot}
                pos={hot ? focus.pos : 0}
                end={hot ? focus.end : 0}
                nonce={hot ? focus.nonce : 0}
                pin={hot ? pin : 0}
                placeholder={index === 0 && lines.length === 1 && line.kind === "p" ? "Write, or type / for blocks" : ""}
                areaRef={hot ? areaRef : undefined}
                onUserFocus={() => {
                  setCodeFocus(null);
                  setPin(0);
                  setFocus((current) => (current.index === index ? current : { ...current, index }));
                }}
                onPlace={(pos) => aim(index, pos, pos)}
                onChange={(text) => onEdit(index, text)}
                onPaste={(text) => onPaste(index, text)}
                onKeyDown={(event) => onKey(event, index)}
              />
              {hot && menu.length > 0 && (
                <div className="glass-card absolute top-full left-0 z-20 mt-1 w-72 rounded-2xl p-1" role="listbox" aria-label="Insert block">
                  {menu.map((item, itemIndex) => (
                    <button
                      key={item.id}
                      type="button"
                      role="option"
                      aria-selected={itemIndex === menuAt}
                      onMouseDown={(event) => {
                        event.preventDefault();
                        applySlash(item.id);
                      }}
                      className={cn(
                        "flex h-11 w-full items-center gap-2 rounded-xl px-2 text-left text-sm",
                        itemIndex === menuAt ? "bg-paper-2 text-ink" : "text-ink",
                      )}
                    >
                      <span className="text-muted">{item.icon}</span>
                      <span className="flex-1">{item.label}</span>
                      <span className="text-xs text-muted">{item.hint}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
});

function LineField({
  line,
  active,
  pos,
  end,
  nonce,
  pin,
  placeholder,
  areaRef,
  onUserFocus,
  onPlace,
  onChange,
  onPaste,
  onKeyDown,
}: {
  line: ParsedLine;
  active: boolean;
  pos: number;
  end: number;
  nonce: number;
  pin: number;
  placeholder: string;
  areaRef?: RefObject<HTMLTextAreaElement | null>;
  onUserFocus: () => void;
  onPlace: (pos: number) => void;
  onChange: (text: string) => void;
  onPaste: (text: string) => void;
  onKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
}) {
  const localRef = useRef<HTMLTextAreaElement>(null);
  const ref = areaRef ?? localRef;
  const placing = useRef(false);
  useLayoutEffect(() => {
    if (!active || nonce !== pin) return;
    const el = ref.current;
    if (!el) return;
    placing.current = true;
    el.focus();
    const start = Math.max(0, Math.min(pos, el.value.length));
    const stop = Math.max(start, Math.min(end, el.value.length));
    el.setSelectionRange(start, stop);
    placing.current = false;
  }, [active, nonce, pin, pos, end, ref]);

  const look = lineLook(line.kind);
  return (
    <div
      className="relative min-h-11"
      onMouseDown={(event) => {
        if (active) return;
        const link = (event.target as HTMLElement).closest("a");
        if (link) return;
        const mirror = event.currentTarget.querySelector("[data-mirror]");
        const at = mirror instanceof HTMLElement ? offsetFromPoint(mirror, event.clientX, event.clientY) : null;
        onPlace(at ?? line.text.length);
      }}
    >
      <div
        data-mirror=""
        className={cn(
          "live-mirror whitespace-pre-wrap break-words",
          look,
          line.done && "text-muted line-through",
          line.kind === "hr" && "flex min-h-11 items-center",
        )}
      >
        {line.kind === "hr" ? (
          <span className="block w-full border-t border-line" />
        ) : line.text ? (
          <Preserved text={line.text} linked={!active} />
        ) : (
          <span className="text-muted">{placeholder || " "}</span>
        )}
      </div>
      {active && (
        <textarea
          ref={ref}
          value={line.kind === "hr" ? "" : line.text}
          rows={1}
          spellCheck={line.kind !== "hr"}
          aria-label={lineLabel(line.kind)}
          onFocus={() => {
            if (!placing.current) onUserFocus();
          }}
          onChange={(event) => {
            const raw = event.target.value;
            if (raw.includes("\n")) onPaste(raw);
            else onChange(raw);
          }}
          onKeyDown={onKeyDown}
          className={cn(
            "live-input absolute inset-0 h-full w-full resize-none overflow-hidden border-0 bg-transparent p-0 whitespace-pre-wrap break-words text-transparent outline-none",
            look,
          )}
        />
      )}
    </div>
  );
}

function Preserved({ text, linked }: { text: string; linked: boolean }) {
  const re = /(~~[^~]+~~|==[^=]+==|\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\((https?:\/\/[^\s)]+|mailto:[^\s)]+)\))/g;
  const out: ReactNode[] = [];
  let last = 0;
  let n = 0;
  for (const match of text.matchAll(re)) {
    const index = match.index ?? 0;
    const token = match[0];
    if (index > last) out.push(<span key={`t-${n}`}>{text.slice(last, index)}</span>);
    n += 1;
    if (token.startsWith("~~")) {
      out.push(
        <s key={`s-${n}`}>
          <span className="text-transparent">~~</span>
          {token.slice(2, -2)}
          <span className="text-transparent">~~</span>
        </s>,
      );
    } else if (token.startsWith("==")) {
      out.push(
        <mark key={`m-${n}`}>
          <span className="text-transparent">==</span>
          {token.slice(2, -2)}
          <span className="text-transparent">==</span>
        </mark>,
      );
    } else if (token.startsWith("**")) {
      out.push(
        <strong key={`b-${n}`}>
          <span className="text-transparent">**</span>
          {token.slice(2, -2)}
          <span className="text-transparent">**</span>
        </strong>,
      );
    } else if (token.startsWith("`")) {
      out.push(
        <code key={`c-${n}`}>
          <span className="text-transparent">`</span>
          <span className="rounded-sm bg-paper-2">{token.slice(1, -1)}</span>
          <span className="text-transparent">`</span>
        </code>,
      );
    } else if (token.startsWith("[")) {
      const link = /^\[([^\]]+)\]\((.+)\)$/.exec(token);
      const label = link?.[1] ?? token;
      const href = link?.[2] ?? "";
      const tail = `](${href})`;
      const inner = linked && href ? (
        <a href={href} target="_blank" rel="noreferrer noopener" className="text-wax underline underline-offset-2">
          {label}
        </a>
      ) : (
        <span className="text-wax underline underline-offset-2">{label}</span>
      );
      out.push(
        <span key={`a-${n}`}>
          <span className="text-transparent">[</span>
          {inner}
          <span className="text-transparent">{tail}</span>
        </span>,
      );
    } else if (token.startsWith("*")) {
      out.push(
        <em key={`e-${n}`}>
          <span className="text-transparent">*</span>
          {token.slice(1, -1)}
          <span className="text-transparent">*</span>
        </em>,
      );
    }
    last = index + token.length;
  }
  if (last < text.length) out.push(<span key="tail">{text.slice(last)}</span>);
  return <>{out}</>;
}

function Marker({ line, onToggle }: { line: ParsedLine; onToggle: () => void }) {
  if (line.kind === "ul") return <span className="mt-3 mr-2 size-1.5 shrink-0 rounded-full bg-ink/80" />;
  if (line.kind === "ol") return <span className="mt-1 mr-2 w-6 shrink-0 text-muted tabular-nums">{line.n ?? 1}.</span>;
  if (line.kind === "task") {
    return (
      <button
        type="button"
        role="checkbox"
        aria-checked={line.done === true}
        aria-label={line.done ? "Mark not done" : "Mark done"}
        onMouseDown={(event) => event.preventDefault()}
        onClick={onToggle}
        className="mr-1 inline-flex size-11 shrink-0 items-center justify-center"
      >
        <span
          className={cn(
            "inline-flex size-4 items-center justify-center rounded border",
            line.done ? "border-wax bg-wax text-on-wax" : "border-line bg-paper",
          )}
        >
          {line.done ? <Check className="size-3" strokeWidth={2.5} /> : null}
        </span>
      </button>
    );
  }
  return null;
}

function CodeBlock({
  anchor,
  lang,
  text,
  focused,
  nonce,
  onChange,
  onRemove,
}: {
  anchor: number;
  lang: string;
  text: string;
  focused: boolean;
  nonce: number;
  onChange: (text: string) => void;
  onRemove: () => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${el.scrollHeight}px`;
  }, [text]);
  useLayoutEffect(() => {
    if (!focused) return;
    const el = ref.current;
    if (!el) return;
    el.focus();
    const end = el.value.length;
    el.setSelectionRange(end, end);
  }, [focused, nonce]);
  return (
    <div id={`live-line-${anchor}`} className="live-line my-2 rounded-xl bg-paper-2 px-3 py-2">
      {lang ? <p className="mb-1 text-xs text-muted">{lang}</p> : null}
      <textarea
        ref={ref}
        value={text}
        spellCheck={false}
        aria-label="Code block"
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.nativeEvent.isComposing) return;
          if (event.key === "Tab") {
            event.preventDefault();
            const el = event.currentTarget;
            const start = el.selectionStart ?? 0;
            const end = el.selectionEnd ?? 0;
            const next = `${text.slice(0, start)}  ${text.slice(end)}`;
            onChange(next);
            const caret = start + 2;
            requestAnimationFrame(() => el.setSelectionRange(caret, caret));
            return;
          }
          if (event.key === "Enter") {
            const el = event.currentTarget;
            const start = el.selectionStart ?? 0;
            const lineStart = text.lastIndexOf("\n", start - 1) + 1;
            const indent = /^ */.exec(text.slice(lineStart))?.[0] ?? "";
            event.preventDefault();
            const next = `${text.slice(0, start)}\n${indent}${text.slice(el.selectionEnd ?? start)}`;
            onChange(next);
            const caret = start + 1 + indent.length;
            requestAnimationFrame(() => el.setSelectionRange(caret, caret));
            return;
          }
          if (event.key === "Backspace" && text === "") {
            event.preventDefault();
            onRemove();
          }
        }}
        className="live-input w-full resize-none bg-transparent font-mono text-sm leading-relaxed text-ink outline-none"
      />
    </div>
  );
}

function lineLook(kind: ParsedLine["kind"]): string {
  if (kind === "h1") return "py-1 text-3xl font-semibold tracking-tight text-balance";
  if (kind === "h2") return "py-1 text-2xl font-semibold tracking-tight text-balance";
  if (kind === "h3") return "py-1 text-lg font-semibold";
  if (kind === "quote") return "border-l-2 border-wax py-0.5 pl-3 text-muted italic";
  return "py-1.5 text-pretty leading-relaxed";
}

function lineLabel(kind: ParsedLine["kind"]): string {
  if (kind === "h1" || kind === "h2" || kind === "h3") return "Heading";
  if (kind === "ul" || kind === "ol") return "List item";
  if (kind === "task") return "Task";
  if (kind === "quote") return "Quote";
  if (kind === "hr") return "Divider";
  return "Paragraph";
}

function offsetFromPoint(root: HTMLElement, x: number, y: number): number | null {
  const doc = document as Document & {
    caretRangeFromPoint?: (px: number, py: number) => Range | null;
    caretPositionFromPoint?: (px: number, py: number) => { offsetNode: Node; offset: number } | null;
  };
  let node: Node | null = null;
  let offset = 0;
  if (doc.caretRangeFromPoint) {
    const range = doc.caretRangeFromPoint(x, y);
    if (!range) return null;
    node = range.startContainer;
    offset = range.startOffset;
  } else if (doc.caretPositionFromPoint) {
    const pos = doc.caretPositionFromPoint(x, y);
    if (!pos) return null;
    node = pos.offsetNode;
    offset = pos.offset;
  } else return null;
  if (!node || !root.contains(node)) return null;
  const range = document.createRange();
  range.selectNodeContents(root);
  range.setEnd(node, offset);
  return range.toString().length;
}

type CodeBlockModel = { type: "code"; start: number; end: number; lang: string; text: string };
type LineBlock = { type: "line"; index: number; line: ParsedLine };

function blocksOf(lines: string[]): (CodeBlockModel | LineBlock)[] {
  const blocks: (CodeBlockModel | LineBlock)[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = parseLine(lines[i] ?? "");
    if (line.kind === "fence") {
      let j = i + 1;
      while (j < lines.length && parseLine(lines[j] ?? "").kind !== "fence") j += 1;
      const closed = j < lines.length;
      const end = closed ? j : lines.length - 1;
      blocks.push({
        type: "code",
        start: i,
        end,
        lang: line.lang ?? "",
        text: lines.slice(i + 1, closed ? j : lines.length).join("\n"),
      });
      i = closed ? j + 1 : lines.length;
      continue;
    }
    blocks.push({ type: "line", index: i, line });
    i += 1;
  }
  if (blocks.length === 0) blocks.push({ type: "line", index: 0, line: { kind: "p", indent: 0, text: "" } });
  return blocks;
}
