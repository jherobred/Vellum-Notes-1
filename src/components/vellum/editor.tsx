import {
  Bold,
  Check,
  ChevronLeft,
  Code,
  Copy,
  Download,
  Heading1,
  Heading2,
  Highlighter,
  IndentDecrease,
  IndentIncrease,
  Italic,
  Link2,
  List,
  ListChecks,
  ListOrdered,
  Maximize2,
  Minimize2,
  Minus,
  MoreHorizontal,
  Pin,
  Quote,
  RotateCcw,
  Search,
  Strikethrough,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/vellum/ui";
import { ConfirmDialog } from "@/components/vellum/overlays";
import { LiveDoc, type LiveDocHandle } from "@/components/vellum/live-doc";
import { useNotes } from "@/lib/notes/store";
import { countWords, downloadText, noteTitle, readingLabel, slugFile } from "@/lib/notes/text";
import { NOTE_COLORS } from "@/lib/notes/types";
import { cn } from "@/lib/cn";
import { playCue } from "@/lib/sound";

const FONT = { sm: "text-base", md: "text-lg", lg: "text-xl" } as const;
const MEASURE = { narrow: "max-w-xl", comfort: "max-w-2xl", wide: "max-w-4xl" } as const;

export function Editor({ wide }: { wide: boolean }) {
  const note = useNotes((s) => s.notes.find((item) => item.id === s.activeNoteId) ?? null);
  const notebooks = useNotes((s) => s.notebooks);
  const settings = useNotes((s) => s.settings);
  const findOpen = useNotes((s) => s.findOpen);
  const status = useNotes((s) => s.status);
  const updateNote = useNotes((s) => s.updateNote);
  const updateSettings = useNotes((s) => s.updateSettings);
  const setMobilePane = useNotes((s) => s.setMobilePane);
  const setFindOpen = useNotes((s) => s.setFindOpen);
  const trashNote = useNotes((s) => s.trashNote);
  const restoreNote = useNotes((s) => s.restoreNote);
  const deleteForever = useNotes((s) => s.deleteForever);
  const duplicateNote = useNotes((s) => s.duplicateNote);
  const togglePin = useNotes((s) => s.togglePin);
  const setColor = useNotes((s) => s.setColor);
  const addTag = useNotes((s) => s.addTag);
  const removeTag = useNotes((s) => s.removeTag);
  const [tagDraft, setTagDraft] = useState("");
  const [menu, setMenu] = useState(false);
  const [outline, setOutline] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [findQuery, setFindQuery] = useState("");
  const [findAt, setFindAt] = useState(0);
  const [settled, setSettled] = useState(true);
  const docRef = useRef<LiveDocHandle>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMenu(false);
    setOutline(false);
    setFindQuery("");
    setSettled(true);
  }, [note?.id]);

  useEffect(() => {
    if (!menu) return;
    const onPointer = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenu(false);
    };
    window.addEventListener("mousedown", onPointer);
    return () => window.removeEventListener("mousedown", onPointer);
  }, [menu]);

  useEffect(() => {
    if (!findOpen) return;
    const field = document.getElementById("note-find");
    if (field instanceof HTMLInputElement) field.focus();
  }, [findOpen]);

  if (!note) {
    return (
      <section className="glass-sheet relative flex min-h-0 min-w-0 flex-col">
        {!wide && (
          <div className="px-3 pt-3">
            <Button variant="quiet" size="sm" onClick={() => setMobilePane("browse")}>
              <ChevronLeft className="size-4" />
              Notes
            </Button>
          </div>
        )}
        <EmptyPage />
      </section>
    );
  }

  const words = countWords(`${note.title}\n${note.body}`);
  const outlineItems = outlineOf(note.body);
  const matches = findMatches(note.body, findQuery);

  const markEditing = () => {
    setSettled(false);
    window.setTimeout(() => setSettled(true), 700);
  };

  return (
    <section className="glass-sheet relative flex min-h-0 min-w-0 flex-col">
      <header className="glass-bar flex items-center gap-1 border-b border-line/80 px-2 py-2">
        {!wide && (
          <Button variant="quiet" size="icon" aria-label="Back to notes" onClick={() => setMobilePane("browse")}>
            <ChevronLeft className="size-4" />
          </Button>
        )}
        <div className="scroll-thin flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto">
          <Tool label="Bold" onClick={() => docRef.current?.format("bold")}>
            <Bold className="size-4" />
          </Tool>
          <Tool label="Italic" onClick={() => docRef.current?.format("italic")}>
            <Italic className="size-4" />
          </Tool>
          <Tool label="Strikethrough" onClick={() => docRef.current?.format("strike")}>
            <Strikethrough className="size-4" />
          </Tool>
          <Tool label="Highlight" onClick={() => docRef.current?.format("mark")}>
            <Highlighter className="size-4" />
          </Tool>
          <BarSplit />
          <Tool label="Heading" onClick={() => docRef.current?.format("h1")}>
            <Heading1 className="size-4" />
          </Tool>
          <Tool label="Subheading" onClick={() => docRef.current?.format("h2")}>
            <Heading2 className="size-4" />
          </Tool>
          <Tool label="Bullet list" onClick={() => docRef.current?.format("ul")}>
            <List className="size-4" />
          </Tool>
          <Tool label="Numbered list" onClick={() => docRef.current?.format("ol")}>
            <ListOrdered className="size-4" />
          </Tool>
          <Tool label="Task" onClick={() => docRef.current?.format("task")}>
            <ListChecks className="size-4" />
          </Tool>
          <Tool label="Quote" onClick={() => docRef.current?.format("quote")}>
            <Quote className="size-4" />
          </Tool>
          <Tool label="Code" onClick={() => docRef.current?.format("code")}>
            <Code className="size-4" />
          </Tool>
          <Tool label="Link" onClick={() => docRef.current?.format("link")}>
            <Link2 className="size-4" />
          </Tool>
          <Tool label="Divider" onClick={() => docRef.current?.format("hr")}>
            <Minus className="size-4" />
          </Tool>
          <BarSplit />
          <Tool label="Indent" onClick={() => docRef.current?.format("indent")}>
            <IndentIncrease className="size-4" />
          </Tool>
          <Tool label="Outdent" onClick={() => docRef.current?.format("outdent")}>
            <IndentDecrease className="size-4" />
          </Tool>
        </div>
        <div className="flex shrink-0 items-center">
          <Tool
            label={settings.focus ? "Leave focus" : "Focus mode"}
            onClick={() => updateSettings({ focus: !settings.focus })}
          >
            {settings.focus ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
          </Tool>
          <Tool label="Find in note" onClick={() => setFindOpen(!findOpen)}>
            <Search className="size-4" />
          </Tool>
          <div className="relative" ref={menuRef}>
            <Tool label="More" onClick={() => setMenu((open) => !open)}>
              <MoreHorizontal className="size-4" />
            </Tool>
            {menu && (
              <div className="glass-card absolute top-12 right-0 z-20 w-52 rounded-2xl p-1">
                <MenuItem
                  label={note.pinned ? "Unpin" : "Pin"}
                  icon={<Pin className="size-4" />}
                  onClick={() => {
                    togglePin(note.id);
                    setMenu(false);
                  }}
                />
                <MenuItem
                  label="Duplicate"
                  icon={<Copy className="size-4" />}
                  onClick={() => {
                    duplicateNote(note.id);
                    setMenu(false);
                  }}
                />
                <MenuItem
                  label="Export Markdown"
                  icon={<Download className="size-4" />}
                  onClick={() => {
                    downloadText(slugFile(noteTitle(note)), `# ${note.title}\n\n${note.body}`, "text/markdown");
                    if (settings.sound) playCue("save");
                    setMenu(false);
                  }}
                />
                <MenuItem
                  label="Outline"
                  icon={<Heading2 className="size-4" />}
                  onClick={() => {
                    setOutline((open) => !open);
                    setMenu(false);
                  }}
                />
                {note.trashed ? (
                  <MenuItem
                    label="Restore"
                    icon={<RotateCcw className="size-4" />}
                    onClick={() => {
                      restoreNote(note.id);
                      setMenu(false);
                    }}
                  />
                ) : (
                  <MenuItem
                    label="Move to trash"
                    icon={<Trash2 className="size-4" />}
                    onClick={() => {
                      trashNote(note.id);
                      setMenu(false);
                    }}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      </header>
      {findOpen && (
        <form
          className="flex items-center gap-2 border-b border-line px-4 py-2"
          onSubmit={(event) => {
            event.preventDefault();
            setFindAt((index) => index + 1);
          }}
        >
          <input
            id="note-find"
            value={findQuery}
            onChange={(event) => {
              setFindQuery(event.target.value);
              setFindAt(0);
            }}
            placeholder="Find in this page"
            aria-label="Find in this page"
            className="h-11 min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-muted"
          />
          <span className="text-xs text-muted">
            {findQuery.trim() ? `${matches.length} found` : ""}
          </span>
          <Button variant="quiet" size="sm" type="submit">
            Next
          </Button>
          <Button variant="quiet" size="icon" aria-label="Close find" onClick={() => setFindOpen(false)}>
            <X className="size-4" />
          </Button>
        </form>
      )}
      <div className="scroll-thin min-h-0 flex-1 overflow-y-auto">
        <div
          key={note.id}
          className={cn("note-enter mx-auto flex w-full flex-col px-5 py-8 sm:px-10", MEASURE[settings.measure])}
        >
          <div className="flex min-w-0 flex-1 flex-col">
            <input
              value={note.title}
              aria-label="Title"
              placeholder="Untitled"
              onChange={(event) => {
                updateNote(note.id, { title: event.target.value });
                markEditing();
              }}
              className="w-full bg-transparent text-3xl font-semibold tracking-tight text-balance text-ink outline-none placeholder:text-muted/70"
            />
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <label className="sr-only" htmlFor="notebook-select">
                Notebook
              </label>
              <select
                id="notebook-select"
                value={note.notebookId}
                onChange={(event) => updateNote(note.id, { notebookId: event.target.value })}
                className="h-11 rounded-full bg-paper/80 px-3 text-sm text-ink ring-1 ring-line"
              >
                {notebooks.map((notebook) => (
                  <option key={notebook.id} value={notebook.id}>
                    {notebook.name}
                  </option>
                ))}
              </select>
              <div className="flex items-center gap-1" role="group" aria-label="Label color">
                {NOTE_COLORS.map((color) => (
                  <button
                    key={color.id}
                    type="button"
                    aria-label={color.label}
                    aria-pressed={note.color === color.id}
                    onClick={() => setColor(note.id, color.id)}
                    className={cn(
                      "size-11 rounded-full p-3 active:scale-[0.96]",
                      note.color === color.id && "ring-2 ring-wax ring-offset-2 ring-offset-paper",
                    )}
                  >
                    <span className={cn("block size-full rounded-full", color.swatch, color.id === "none" && "ring-1 ring-line")} />
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {note.tags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => removeTag(note.id, tag)}
                  className="h-11 rounded-full bg-paper/70 px-3 text-sm text-ink ring-1 ring-line"
                >
                  #{tag}
                  <span className="sr-only"> Remove tag</span>
                </button>
              ))}
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  addTag(note.id, tagDraft);
                  setTagDraft("");
                }}
              >
                <input
                  value={tagDraft}
                  onChange={(event) => setTagDraft(event.target.value)}
                  placeholder="Add tag"
                  aria-label="Add tag"
                  className="h-11 w-36 bg-transparent text-sm text-ink outline-none placeholder:text-muted"
                />
              </form>
            </div>
            {note.trashed && (
              <div className="mt-4 flex flex-wrap items-center gap-2 rounded-2xl bg-paper/70 px-3 py-2 text-sm text-ink ring-1 ring-line">
                <span className="flex-1">This page is in the trash.</span>
                <Button variant="quiet" size="sm" onClick={() => restoreNote(note.id)}>
                  <RotateCcw className="size-4" />
                  Restore
                </Button>
                <Button variant="danger" size="sm" onClick={() => setConfirmDelete(true)}>
                  Delete
                </Button>
              </div>
            )}
            <LiveDoc
              ref={docRef}
              value={note.body}
              fontClass={FONT[settings.fontSize]}
              typewriter={settings.typewriter}
              findQuery={findOpen ? findQuery : ""}
              findTick={findAt}
              onChange={(body) => {
                updateNote(note.id, { body });
                markEditing();
              }}
              onTask={(done) => {
                if (settings.sound) playCue(done ? "complete" : "select");
              }}
            />
          </div>
        </div>
      </div>
      {outline && (
        <div className="glass-card absolute right-4 bottom-20 z-10 w-64 rounded-2xl p-3">
          <p className="mb-2 text-xs font-medium text-muted">Outline</p>
          {outlineItems.length === 0 ? (
            <p className="text-sm text-muted">Add a heading with # to build an outline.</p>
          ) : (
            <ul className="flex max-h-64 flex-col gap-1 overflow-y-auto">
              {outlineItems.map((item) => (
                <li key={`${item.index}-${item.text}`}>
                  <button
                    type="button"
                    className={cn(
                      "flex min-h-11 w-full items-center rounded-md text-left text-sm text-ink hover:bg-paper-2",
                      item.level === 1 && "pl-2",
                      item.level === 2 && "pl-5",
                      item.level === 3 && "pl-8",
                    )}
                    onClick={() => {
                      docRef.current?.focusLine(item.index);
                      setOutline(false);
                    }}
                  >
                    {item.text}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      <footer className="glass-bar safe-bottom flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-line/80 px-4 pt-2 text-xs text-muted">
        <span className="inline-flex items-center gap-1">
          {settled ? <Check className="size-3 text-moss" /> : <span className="size-2 rounded-full bg-brass" />}
          {settled ? "Saved" : "Saving"}
        </span>
        <span>{words} {words === 1 ? "word" : "words"}</span>
        <span>{readingLabel(words)}</span>
        <SessionMeter goal={settings.wordGoal} />
        <span className="hidden sm:inline">Type / for blocks</span>
        <span className="min-w-0 flex-1 truncate text-right" aria-live="polite">
          {status}
        </span>
      </footer>
      <ConfirmDialog
        open={confirmDelete}
        title="Delete this page forever?"
        body="This cannot be undone."
        confirmLabel="Delete forever"
        onOpenChange={setConfirmDelete}
        onConfirm={() => {
          deleteForever(note.id);
          setConfirmDelete(false);
        }}
      />
    </section>
  );
}

function SessionMeter({ goal }: { goal: number }) {
  const total = useNotes((s) =>
    s.notes.reduce((sum, note) => (note.trashed ? sum : sum + countWords(note.body)), 0),
  );
  const base = useRef<number | null>(null);
  if (base.current === null) base.current = total;
  const net = total - base.current;
  const progress = Math.max(0, Math.min(1, net / goal));
  return (
    <span className="inline-flex items-center gap-2">
      <span>
        Session {net >= 0 ? "+" : "−"}
        {Math.abs(net)}
      </span>
      <span className="h-1.5 w-16 overflow-hidden rounded-full bg-line" aria-hidden="true">
        <span className="block h-full bg-wax" style={{ width: `${progress * 100}%` }} />
      </span>
    </span>
  );
}

function EmptyPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
      <div className="relative mb-6 h-24 w-20">
        <span className="absolute top-2 left-2 h-20 w-16 rounded-xl bg-paper-2/80 ring-1 ring-line" />
        <span className="absolute top-1 left-1 h-20 w-16 rounded-xl bg-paper/90 ring-1 ring-line backdrop-blur-sm" />
        <span className="absolute top-0 left-0 flex h-20 w-16 flex-col justify-center gap-2 rounded-xl bg-paper/80 px-3 ring-1 ring-line backdrop-blur-sm">
          <span className="h-1 w-8 rounded-full bg-brass" />
          <span className="h-px w-10 bg-line" />
          <span className="h-px w-7 bg-line" />
        </span>
      </div>
      <h2 className="text-xl font-semibold tracking-tight text-ink">Nothing open</h2>
      <p className="mt-2 max-w-sm text-sm text-muted">
        Choose a note, or start a new one. Everything stays in this browser.
      </p>
    </div>
  );
}

function Tool({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Button
      variant="quiet"
      size="icon"
      aria-label={label}
      title={label}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}

function BarSplit() {
  return <span className="mx-1 h-5 w-px shrink-0 bg-line" aria-hidden="true" />;
}

function MenuItem({
  label,
  icon,
  onClick,
}: {
  label: string;
  icon: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-11 w-full items-center gap-2 rounded-lg px-2 text-sm text-ink hover:bg-ink/5"
    >
      {icon}
      {label}
    </button>
  );
}

function outlineOf(body: string): { level: number; text: string; index: number }[] {
  return body.split("\n").flatMap((raw, index) => {
    const match = /^(#{1,3})\s+(\S.*)$/.exec(raw.trim());
    if (!match) return [];
    return [{ level: match[1].length, text: match[2].trim(), index }];
  });
}

function findMatches(text: string, query: string): number[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return [];
  const hay = text.toLowerCase();
  const found: number[] = [];
  let index = 0;
  while (index <= hay.length) {
    const at = hay.indexOf(needle, index);
    if (at < 0) break;
    found.push(at);
    index = at + needle.length;
  }
  return found;
}
